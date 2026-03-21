import simpleGit from "simple-git";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import { listSessions } from "@anthropic-ai/claude-agent-sdk";

interface RepoSummary {
	name: string;
	path: string;
	defaultBranch: string;
	lastCommitDate: string | null;
}

interface RepoDetail {
	name: string;
	path: string;
	branches: string[];
	recentCommits: { hash: string; message: string; date: string }[];
}

interface ProjectMemoryFile {
	filename: string;
	content: string;
}

export class ReposService {
	private claudeProjectsDir = join(homedir(), ".claude", "projects");
	private cache: { repos: RepoSummary[]; cwdToProjectDir: Map<string, string>; timestamp: number } | null = null;
	private readonly CACHE_TTL = 30_000;

	async findAll(): Promise<RepoSummary[]> {
		if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
			return this.cache.repos;
		}

		// Use SDK to get all sessions, extract unique cwds
		const sessions = await listSessions();
		const cwdSet = new Map<string, string>(); // cwd -> first session's cwd (dedup)

		for (const session of sessions) {
			if (session.cwd && !cwdSet.has(session.cwd)) {
				cwdSet.set(session.cwd, session.cwd);
			}
		}

		// Build project dir map for memory lookups
		const cwdToProjectDir = this.buildProjectMap(cwdSet);

		// Filter to existing git repos
		const repos: RepoSummary[] = [];
		for (const cwd of cwdSet.keys()) {
			if (!existsSync(cwd) || !existsSync(join(cwd, ".git"))) continue;

			try {
				const git = simpleGit(cwd);
				const branches = await git.branchLocal();
				const log = await git.log({ maxCount: 1 });
				repos.push({
					name: basename(cwd),
					path: cwd,
					defaultBranch: branches.current || "main",
					lastCommitDate: log.latest?.date ?? null,
				});
			} catch {
				repos.push({
					name: basename(cwd),
					path: cwd,
					defaultBranch: "main",
					lastCommitDate: null,
				});
			}
		}

		repos.sort((a, b) => a.name.localeCompare(b.name));
		this.cache = { repos, cwdToProjectDir, timestamp: Date.now() };
		return repos;
	}

	async findByName(name: string): Promise<RepoSummary | null> {
		const all = await this.findAll();
		return all.find((r) => r.name === name) ?? null;
	}

	async getDetail(repoPath: string): Promise<RepoDetail> {
		const git = simpleGit(repoPath);
		const branches = await git.branchLocal();
		const log = await git.log({ maxCount: 10 });
		return {
			name: basename(repoPath),
			path: repoPath,
			branches: branches.all,
			recentCommits: log.all.map((c) => ({
				hash: c.hash.slice(0, 7),
				message: c.message,
				date: c.date,
			})),
		};
	}

	getProjectMemory(repoPath: string): ProjectMemoryFile[] {
		const projectDir = this.cache?.cwdToProjectDir.get(repoPath);
		if (!projectDir) return [];

		const memoryDir = join(projectDir, "memory");
		if (!existsSync(memoryDir)) return [];

		try {
			const entries = readdirSync(memoryDir, { withFileTypes: true });
			const files: ProjectMemoryFile[] = [];

			for (const entry of entries) {
				if (!entry.isFile() || !entry.name.endsWith(".md") || entry.name === "MEMORY.md") continue;
				try {
					files.push({ filename: entry.name, content: readFileSync(join(memoryDir, entry.name), "utf-8") });
				} catch {}
			}
			return files;
		} catch {
			return [];
		}
	}

	/**
	 * Map repo cwds to their Claude project directories for memory file lookups.
	 * Scans ~/.claude/projects/ and matches by cwd extracted from JSONL files.
	 */
	private buildProjectMap(cwds: Map<string, string>): Map<string, string> {
		const map = new Map<string, string>();
		if (!existsSync(this.claudeProjectsDir)) return map;

		try {
			const dirs = readdirSync(this.claudeProjectsDir, { withFileTypes: true });
			for (const dir of dirs) {
				if (!dir.isDirectory() || dir.name === "-") continue;
				const projectPath = join(this.claudeProjectsDir, dir.name);

				// Check if any session cwd matches a known repo
				// The dir name encodes the path, but we just check if memory/ exists
				// and match by looking for the cwd in the project's session files
				const memoryDir = join(projectPath, "memory");
				if (!existsSync(memoryDir)) continue;

				// Try to find the cwd from any jsonl file in this project
				try {
					const files = readdirSync(projectPath, { withFileTypes: true });
					const jsonl = files.find((f) => f.isFile() && f.name.endsWith(".jsonl"));
					if (!jsonl) continue;

					const chunk = readFileSync(join(projectPath, jsonl.name), "utf-8").slice(0, 4096);
					const firstLine = chunk.split("\n").find((l) => l.trim());
					if (!firstLine) continue;

					const entry = JSON.parse(firstLine);
					if (entry.cwd && cwds.has(entry.cwd)) {
						map.set(entry.cwd, projectPath);
					}
				} catch {}
			}
		} catch {}

		return map;
	}
}

import simpleGit from "simple-git";
import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";
import type { RepoSummary, RepoDetail } from "@tricorder/shared";

interface ClaudeProjectRepo {
	cwd: string;
	projectDir: string;
}

interface ProjectMemoryFile {
	filename: string;
	content: string;
}

export class ReposService {
	private claudeProjectsDir = join(homedir(), ".claude", "projects");
	private cache: { repos: RepoSummary[]; timestamp: number } | null = null;
	private projectMap: Map<string, string> | null = null; // cwd -> projectDir
	private readonly CACHE_TTL = 30_000; // 30 seconds

	/**
	 * Scan Claude project directories and discover repos with git directories.
	 */
	async findAll(): Promise<RepoSummary[]> {
		if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
			return this.cache.repos;
		}

		const discovered = this.discoverProjects();
		const repos: RepoSummary[] = [];

		for (const { cwd } of discovered) {
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

		this.cache = { repos, timestamp: Date.now() };
		return repos;
	}

	/**
	 * Find a repo by name (basename of the repo path).
	 */
	async findByName(name: string): Promise<RepoSummary | null> {
		const all = await this.findAll();
		return all.find((r) => r.name === name) ?? null;
	}

	/**
	 * Get detailed information about a repo including branches and recent commits.
	 */
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

	/**
	 * Read memory files from the Claude project directory that corresponds
	 * to the given repo path. Returns markdown files from the memory/ subdirectory,
	 * excluding MEMORY.md (which is just an index).
	 */
	getProjectMemory(repoPath: string): ProjectMemoryFile[] {
		// Ensure project map is populated
		this.discoverProjects();

		const projectDir = this.projectMap?.get(repoPath);
		if (!projectDir) return [];

		const memoryDir = join(projectDir, "memory");
		if (!existsSync(memoryDir)) return [];

		try {
			const entries = readdirSync(memoryDir, { withFileTypes: true });
			const files: ProjectMemoryFile[] = [];

			for (const entry of entries) {
				if (!entry.isFile()) continue;
				if (!entry.name.endsWith(".md")) continue;
				if (entry.name === "MEMORY.md") continue;

				try {
					const content = readFileSync(join(memoryDir, entry.name), "utf-8");
					files.push({ filename: entry.name, content });
				} catch {
					// Skip files we can't read
				}
			}

			return files;
		} catch {
			return [];
		}
	}

	/**
	 * Scan ~/.claude/projects/ directories, read JSONL session files to extract
	 * the cwd for each project, and return deduplicated repos that exist on disk
	 * and contain a .git directory.
	 */
	private discoverProjects(): ClaudeProjectRepo[] {
		if (!existsSync(this.claudeProjectsDir)) return [];

		const cwdToProjectDir = new Map<string, string>();

		try {
			const projectDirs = readdirSync(this.claudeProjectsDir, { withFileTypes: true });

			for (const dir of projectDirs) {
				if (!dir.isDirectory()) continue;
				if (dir.name === "-") continue;

				const projectDirPath = join(this.claudeProjectsDir, dir.name);
				const cwd = this.extractCwdFromProject(projectDirPath);

				if (cwd && !cwdToProjectDir.has(cwd)) {
					cwdToProjectDir.set(cwd, projectDirPath);
				}
			}
		} catch {
			return [];
		}

		// Filter to paths that exist on disk and contain a .git directory
		const results: ClaudeProjectRepo[] = [];
		for (const [cwd, projectDir] of cwdToProjectDir) {
			if (existsSync(cwd) && existsSync(join(cwd, ".git"))) {
				results.push({ cwd, projectDir });
			}
		}

		// Update the project map for getProjectMemory lookups
		this.projectMap = new Map(results.map((r) => [r.cwd, r.projectDir]));

		return results;
	}

	/**
	 * Find a .jsonl file in the project directory and read the first few lines
	 * to extract the `cwd` field from the first entry that has one.
	 */
	private extractCwdFromProject(projectDirPath: string): string | null {
		try {
			const entries = readdirSync(projectDirPath, { withFileTypes: true });
			const jsonlFile = entries.find(
				(e) => e.isFile() && e.name.endsWith(".jsonl"),
			);

			if (!jsonlFile) return null;

			const filePath = join(projectDirPath, jsonlFile.name);
			const stat = statSync(filePath);

			// Read only the first chunk to avoid loading huge session files
			const fd = require("fs").openSync(filePath, "r");
			const bufSize = Math.min(stat.size, 8192);
			const buffer = Buffer.alloc(bufSize);
			require("fs").readSync(fd, buffer, 0, bufSize, 0);
			require("fs").closeSync(fd);

			const chunk = buffer.toString("utf-8");
			const lines = chunk.split("\n");

			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const entry = JSON.parse(line);
					if (entry.cwd && typeof entry.cwd === "string") {
						return entry.cwd;
					}
				} catch {
					// Skip malformed lines
				}
			}
		} catch {
			// Skip projects we can't read
		}

		return null;
	}
}

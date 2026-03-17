import { readdirSync, existsSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";
import simpleGit from "simple-git";
import type { RepoSummary, RepoDetail } from "@tricorder/shared";

export class ReposRepository {
	constructor(private scanDirectory: string) {}

	async findAll(): Promise<RepoSummary[]> {
		const resolvedDir = resolve(this.scanDirectory.replace(/^~/, homedir()));
		if (!existsSync(resolvedDir)) return [];

		const entries = readdirSync(resolvedDir, { withFileTypes: true });
		const repos: RepoSummary[] = [];

		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			const fullPath = join(resolvedDir, entry.name);
			if (!existsSync(join(fullPath, ".git"))) continue;

			try {
				const git = simpleGit(fullPath);
				const branches = await git.branchLocal();
				repos.push({
					name: entry.name,
					path: fullPath,
					defaultBranch: branches.current || "main",
					lastCommitDate: null,
				});
			} catch {
				repos.push({
					name: entry.name,
					path: fullPath,
					defaultBranch: "main",
					lastCommitDate: null,
				});
			}
		}
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
			name: repoPath.split("/").pop() || repoPath,
			path: repoPath,
			branches: branches.all,
			recentCommits: log.all.map((c) => ({
				hash: c.hash.slice(0, 7),
				message: c.message,
				date: c.date,
			})),
		};
	}
}

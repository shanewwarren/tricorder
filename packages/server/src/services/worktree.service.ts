import simpleGit from "simple-git";
import { join } from "path";
import { existsSync, rmSync, mkdirSync } from "fs";
import { getTricorderDir } from "../config";

export class WorktreeService {
	private worktreesDir: string;

	constructor() {
		this.worktreesDir = join(getTricorderDir(), "worktrees");
	}

	async createWorktree(repoPath: string, branch: string, sessionId: string): Promise<string> {
		if (!existsSync(this.worktreesDir)) {
			mkdirSync(this.worktreesDir, { recursive: true });
		}

		const worktreePath = join(this.worktreesDir, sessionId);
		const git = simpleGit(repoPath);
		await git.raw(["worktree", "add", worktreePath, branch]);
		return worktreePath;
	}

	async removeWorktree(repoPath: string, worktreePath: string): Promise<void> {
		if (!existsSync(worktreePath)) return;

		try {
			const git = simpleGit(repoPath);
			await git.raw(["worktree", "remove", worktreePath, "--force"]);
		} catch {
			// Fallback: just delete the directory
			rmSync(worktreePath, { recursive: true, force: true });
		}
	}
}

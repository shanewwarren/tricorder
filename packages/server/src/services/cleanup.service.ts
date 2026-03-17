import { existsSync, rmSync } from "fs";
import { SessionsRepository } from "../repositories/sessions.repo";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const WORKTREE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class CleanupService {
	private interval: ReturnType<typeof setInterval> | null = null;

	constructor(private sessionsRepo: SessionsRepository) {}

	start() {
		this.runCleanup().catch(console.error);
		this.interval = setInterval(() => this.runCleanup().catch(console.error), CLEANUP_INTERVAL);
	}

	stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
	}

	async runCleanup() {
		const sessions = this.sessionsRepo.findAll();
		const now = Date.now();

		for (const session of sessions) {
			if (!["completed", "cancelled", "error"].includes(session.status)) continue;
			if (!session.worktreePath) continue;

			const updatedAt = new Date(session.updatedAt).getTime();
			if (now - updatedAt < WORKTREE_TTL) continue;

			try {
				if (existsSync(session.worktreePath)) {
					rmSync(session.worktreePath, { recursive: true, force: true });
				}
				this.sessionsRepo.clearWorktreePath(session.id);
				console.log(`Cleaned up worktree for session ${session.id}`);
			} catch (err) {
				console.error(`Cleanup failed for session ${session.id}:`, err);
			}
		}
	}
}

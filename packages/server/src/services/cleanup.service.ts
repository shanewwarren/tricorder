import { ManifestService } from "./manifest.service";
import { WorktreeService } from "./worktree.service";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

export class CleanupService {
	private interval: ReturnType<typeof setInterval> | null = null;

	constructor(
		private manifestService: ManifestService,
		private worktreeService: WorktreeService,
	) {}

	start() {
		this.interval = setInterval(() => this.runCleanup(), CLEANUP_INTERVAL);
	}

	stop() {
		if (this.interval) clearInterval(this.interval);
	}

	private async runCleanup() {
		const sessions = this.manifestService.listTricorderSessions();
		const now = Date.now();

		for (const [id, entry] of Object.entries(sessions)) {
			if (!entry.worktreePath) continue;
			const age = now - new Date(entry.launchedAt).getTime();
			if (age < MAX_AGE) continue;

			try {
				await this.worktreeService.removeWorktree(entry.repoPath, entry.worktreePath);
				this.manifestService.removeWorktree(id);
			} catch {}
		}
	}
}

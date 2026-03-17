import { readdirSync, readFileSync, existsSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

export interface LocalSession {
	id: string;
	name: string;
	directory: string;
	active: boolean;
	lastModified: string;
}

export class WatcherService {
	private claudeDir = join(homedir(), ".claude", "projects");

	scanLocalSessions(): LocalSession[] {
		if (!existsSync(this.claudeDir)) return [];

		const sessions: LocalSession[] = [];
		try {
			const entries = readdirSync(this.claudeDir, { withFileTypes: true });
			for (const entry of entries) {
				if (!entry.isDirectory()) continue;
				const sessionDir = join(this.claudeDir, entry.name);
				try {
					const files = readdirSync(sessionDir);
					for (const file of files) {
						if (!file.endsWith(".json")) continue;
						const filePath = join(sessionDir, file);
						const stat = statSync(filePath);
						const sessionId = file.replace(".json", "");
						sessions.push({
							id: sessionId,
							name: entry.name,
							directory: sessionDir,
							active: this.isSessionActive(sessionId),
							lastModified: stat.mtime.toISOString(),
						});
					}
				} catch {}
			}
		} catch {}

		return sessions;
	}

	private isSessionActive(sessionId: string): boolean {
		try {
			const result = execSync(`ps aux | grep -v grep | grep "claude" | grep "${sessionId}"`, {
				encoding: "utf-8",
				timeout: 5000,
			});
			return result.trim().length > 0;
		} catch {
			return false;
		}
	}
}

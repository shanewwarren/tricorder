import { homedir } from "os";
import { join, basename } from "path";
import {
	readdirSync,
	readFileSync,
	statSync,
	existsSync,
} from "fs";

export interface ClaudeSessionMeta {
	sessionId: string;
	name: string;
	projectDir: string;
	repoName: string;
	gitBranch: string;
	active: boolean;
	firstTimestamp: string;
	lastTimestamp: string;
	filePath: string;
}

export interface ParsedMessage {
	index: number;
	type: string;
	content: unknown;
	timestamp: string;
}

interface CacheEntry {
	mtime: number;
	meta: ClaudeSessionMeta;
}

interface ActiveSessionPid {
	pid: number;
	sessionId: string;
	cwd: string;
	startedAt: string;
}

export class ClaudeSessionsService {
	private cache = new Map<string, CacheEntry>();

	private get claudeDir(): string {
		return join(homedir(), ".claude");
	}

	private get projectsDir(): string {
		return join(this.claudeDir, "projects");
	}

	private get sessionsDir(): string {
		return join(this.claudeDir, "sessions");
	}

	listSessions(): ClaudeSessionMeta[] {
		if (!existsSync(this.projectsDir)) {
			return [];
		}

		const activeSessions = this.getActiveSessionIds();
		const results: ClaudeSessionMeta[] = [];

		const projectDirs = readdirSync(this.projectsDir, { withFileTypes: true });
		for (const dir of projectDirs) {
			if (!dir.isDirectory()) continue;
			if (dir.name === "-") continue;

			const projectPath = join(this.projectsDir, dir.name);
			let entries: ReturnType<typeof readdirSync>;
			try {
				entries = readdirSync(projectPath, { withFileTypes: true });
			} catch {
				continue;
			}

			for (const entry of entries) {
				if (!entry.isFile() || !entry.name.endsWith(".jsonl")) continue;

				const filePath = join(projectPath, entry.name);

				let stat: ReturnType<typeof statSync>;
				try {
					stat = statSync(filePath);
				} catch {
					continue;
				}

				if (stat.size < 50) continue;

				const mtime = stat.mtimeMs;
				const cached = this.cache.get(filePath);
				if (cached && cached.mtime === mtime) {
					// Update active status on each call since PIDs change
					cached.meta.active = activeSessions.has(cached.meta.sessionId);
					results.push(cached.meta);
					continue;
				}

				const meta = this.extractMeta(filePath, activeSessions);
				if (meta) {
					this.cache.set(filePath, { mtime, meta });
					results.push(meta);
				}
			}
		}

		// Sort by lastTimestamp descending (most recent first)
		results.sort((a, b) => b.lastTimestamp.localeCompare(a.lastTimestamp));
		return results;
	}

	getSessionMeta(sessionId: string): ClaudeSessionMeta | null {
		// Check cache first
		for (const [, entry] of this.cache) {
			if (entry.meta.sessionId === sessionId) {
				entry.meta.active = this.isActive(sessionId);
				return entry.meta;
			}
		}

		// Not cached — do a full scan
		const sessions = this.listSessions();
		return sessions.find((s) => s.sessionId === sessionId) ?? null;
	}

	getMessages(sessionId: string, fromIdx?: number): ParsedMessage[] {
		const meta = this.getSessionMeta(sessionId);
		if (!meta) return [];

		const lines = this.readLines(meta.filePath);
		const messages: ParsedMessage[] = [];
		let index = 0;

		for (const line of lines) {
			const entry = this.parseLine(line);
			if (!entry) continue;

			const entryType = entry.type as string;

			if (entryType === "user") {
				const msg: ParsedMessage = {
					index,
					type: "user",
					content: entry.message?.content ?? "",
					timestamp: entry.timestamp ?? "",
				};
				if (fromIdx === undefined || index >= fromIdx) {
					messages.push(msg);
				}
				index++;
			} else if (entryType === "assistant") {
				const contentBlocks = entry.message?.content;
				let textContent: unknown = "";
				if (Array.isArray(contentBlocks)) {
					const textBlocks = contentBlocks.filter(
						(block: Record<string, unknown>) =>
							block.type === "text" || block.type === "tool_use" || block.type === "tool_result",
					);
					if (textBlocks.length === 1 && textBlocks[0].type === "text") {
						textContent = textBlocks[0].text;
					} else if (textBlocks.length > 0) {
						textContent = textBlocks;
					}
				}
				const msg: ParsedMessage = {
					index,
					type: "assistant",
					content: textContent,
					timestamp: entry.timestamp ?? "",
				};
				if (fromIdx === undefined || index >= fromIdx) {
					messages.push(msg);
				}
				index++;
			} else if (entryType === "tool_use" || entryType === "tool_result") {
				const msg: ParsedMessage = {
					index,
					type: entryType,
					content: entry.content ?? entry.message?.content ?? entry,
					timestamp: entry.timestamp ?? "",
				};
				if (fromIdx === undefined || index >= fromIdx) {
					messages.push(msg);
				}
				index++;
			}
		}

		return messages;
	}

	isActive(sessionId: string): boolean {
		const activeIds = this.getActiveSessionIds();
		return activeIds.has(sessionId);
	}

	// --- Private helpers ---

	private getActiveSessionIds(): Set<string> {
		const active = new Set<string>();

		if (!existsSync(this.sessionsDir)) {
			return active;
		}

		let files: ReturnType<typeof readdirSync>;
		try {
			files = readdirSync(this.sessionsDir, { withFileTypes: true });
		} catch {
			return active;
		}

		for (const file of files) {
			if (!file.isFile() || !file.name.endsWith(".json")) continue;

			try {
				const content = readFileSync(join(this.sessionsDir, file.name), "utf-8");
				const data = JSON.parse(content) as ActiveSessionPid;

				if (!data.sessionId || !data.pid) continue;

				// Check if PID is still alive
				try {
					process.kill(data.pid, 0);
					active.add(data.sessionId);
				} catch {
					// PID not alive — not active
				}
			} catch {
				continue;
			}
		}

		return active;
	}

	private extractMeta(
		filePath: string,
		activeSessions: Set<string>,
	): ClaudeSessionMeta | null {
		const lines = this.readLines(filePath);
		if (lines.length === 0) return null;

		let sessionId = "";
		let cwd = "";
		let gitBranch = "";
		let firstTimestamp = "";
		let lastTimestamp = "";
		let customTitle = "";
		let firstUserMessage = "";

		// Read first few lines for basic metadata
		const headCount = Math.min(lines.length, 10);
		for (let i = 0; i < headCount; i++) {
			const entry = this.parseLine(lines[i]);
			if (!entry) continue;

			if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
			if (!cwd && entry.cwd) cwd = entry.cwd;
			if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch;
			if (!firstTimestamp && entry.timestamp) firstTimestamp = entry.timestamp;
			if (!firstUserMessage && entry.type === "user") {
				const content = entry.message?.content;
				if (typeof content === "string") {
					firstUserMessage = content;
				} else if (Array.isArray(content) && content.length > 0) {
					const textBlock = content.find(
						(b: Record<string, unknown>) => b.type === "text",
					);
					if (textBlock?.text) {
						firstUserMessage = textBlock.text;
					}
				}
			}
		}

		// Read last ~20 lines for tail metadata
		const tailStart = Math.max(0, lines.length - 20);
		for (let i = tailStart; i < lines.length; i++) {
			const entry = this.parseLine(lines[i]);
			if (!entry) continue;

			if (entry.timestamp) lastTimestamp = entry.timestamp;
			if (entry.type === "custom-title" && entry.customTitle) {
				customTitle = entry.customTitle;
			}
			if (entry.type === "last-prompt" && entry.lastPrompt) {
				// We don't use lastPrompt for display, but could in the future
			}
			// Also pick up sessionId/cwd/gitBranch from tail if not found in head
			if (!sessionId && entry.sessionId) sessionId = entry.sessionId;
			if (!cwd && entry.cwd) cwd = entry.cwd;
			if (!gitBranch && entry.gitBranch) gitBranch = entry.gitBranch;
		}

		if (!sessionId) {
			// Try to derive from filename
			sessionId = basename(filePath, ".jsonl");
		}

		const name =
			customTitle ||
			(firstUserMessage
				? firstUserMessage.slice(0, 80)
				: sessionId.slice(0, 16));

		const projectDir = cwd || "";
		const repoName = projectDir ? basename(projectDir) : "";

		return {
			sessionId,
			name,
			projectDir,
			repoName,
			gitBranch: gitBranch || "",
			active: activeSessions.has(sessionId),
			firstTimestamp: firstTimestamp || "",
			lastTimestamp: lastTimestamp || firstTimestamp || "",
			filePath,
		};
	}

	private readLines(filePath: string): string[] {
		try {
			const content = readFileSync(filePath, "utf-8");
			return content.split("\n").filter((line) => line.trim().length > 0);
		} catch {
			return [];
		}
	}

	private parseLine(line: string): Record<string, any> | null {
		try {
			return JSON.parse(line);
		} catch {
			return null;
		}
	}
}

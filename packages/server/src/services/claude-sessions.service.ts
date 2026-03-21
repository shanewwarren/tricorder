import { basename } from "path";
import { homedir } from "os";
import { join } from "path";
import { readdirSync, readFileSync, existsSync, statSync, watch } from "fs";
import type { FSWatcher } from "fs";
import {
	listSessions,
	getSessionInfo,
	getSessionMessages,
	renameSession,
	tagSession,
	forkSession,
} from "@anthropic-ai/claude-agent-sdk";

export interface ClaudeSessionMeta {
	sessionId: string;
	name: string;
	initialPrompt: string;
	projectDir: string;
	repoName: string;
	gitBranch: string;
	active: boolean;
	firstTimestamp: string;
	lastTimestamp: string;
}

export interface ParsedMessage {
	index: number;
	type: string;
	content: unknown;
	timestamp: string;
}

export class ClaudeSessionsService {
	private get sessionsDir(): string {
		return join(homedir(), ".claude", "sessions");
	}

	async listSessions(): Promise<ClaudeSessionMeta[]> {
		const sessions = await listSessions();
		const activeIds = this.getActiveSessionIds();

		return sessions.map((info) => ({
			sessionId: info.sessionId,
			name: info.customTitle || info.summary || info.firstPrompt?.slice(0, 80) || info.sessionId.slice(0, 16),
			initialPrompt: info.firstPrompt || "",
			projectDir: info.cwd || "",
			repoName: info.cwd ? basename(info.cwd) : "",
			gitBranch: info.gitBranch || "",
			active: activeIds.has(info.sessionId),
			firstTimestamp: info.createdAt ? new Date(info.createdAt).toISOString() : "",
			lastTimestamp: new Date(info.lastModified).toISOString(),
		}));
	}

	async getSessionMeta(sessionId: string): Promise<ClaudeSessionMeta | null> {
		const info = await getSessionInfo(sessionId);
		if (!info) return null;

		return {
			sessionId: info.sessionId,
			name: info.customTitle || info.summary || info.firstPrompt?.slice(0, 80) || info.sessionId.slice(0, 16),
			initialPrompt: info.firstPrompt || "",
			projectDir: info.cwd || "",
			repoName: info.cwd ? basename(info.cwd) : "",
			gitBranch: info.gitBranch || "",
			active: this.isActive(info.sessionId),
			firstTimestamp: info.createdAt ? new Date(info.createdAt).toISOString() : "",
			lastTimestamp: new Date(info.lastModified).toISOString(),
		};
	}

	async getMessages(sessionId: string, fromIdx?: number, limit?: number): Promise<ParsedMessage[]> {
		const parsedLimit = limit ?? 200;

		let rawMessages;
		if (fromIdx !== undefined) {
			rawMessages = await getSessionMessages(sessionId, { offset: fromIdx });
		} else {
			// Fetch all messages — we'll limit the parsed output, not the raw input.
			// SDK messages are compact (1 per turn), but each expands to multiple
			// parsed entries (text + tool_use + tool_result blocks).
			rawMessages = await getSessionMessages(sessionId);
		}

		const entries: ParsedMessage[] = [];
		let index = fromIdx ?? 0;

		for (const msg of rawMessages) {
			const ts = (msg as any).timestamp ?? "";
			const msgContent =
				msg.message && typeof msg.message === "object" && "content" in msg.message
					? (msg.message as any).content
					: "";

			if (msg.type === "user") {
				if (typeof msgContent === "string") {
					if (msgContent) entries.push({ index: index++, type: "user", content: msgContent, timestamp: ts });
				} else if (Array.isArray(msgContent)) {
					const text = msgContent
						.filter((b: any) => b.type === "text")
						.map((b: any) => b.text)
						.join("\n");
					if (text) entries.push({ index: index++, type: "user", content: text, timestamp: ts });

					for (const block of msgContent) {
						if (block.type === "tool_result") {
							entries.push({
								index: index++,
								type: "tool_result",
								content: { tool_use_id: block.tool_use_id, content: block.content, is_error: block.is_error },
								timestamp: ts,
							});
						}
					}
				}
			} else if (msg.type === "assistant") {
				if (typeof msgContent === "string") {
					entries.push({ index: index++, type: "assistant", content: msgContent, timestamp: ts });
				} else if (Array.isArray(msgContent)) {
					for (const block of msgContent) {
						if (block.type === "text") {
							entries.push({ index: index++, type: "assistant", content: block.text, timestamp: ts });
						} else if (block.type === "tool_use") {
							entries.push({
								index: index++,
								type: "tool_use",
								content: { tool: block.name, input: block.input, id: block.id },
								timestamp: ts,
							});
						} else if (block.type === "tool_result") {
							entries.push({
								index: index++,
								type: "tool_result",
								content: { tool_use_id: block.tool_use_id, content: block.content, is_error: block.is_error },
								timestamp: ts,
							});
						}
					}
				}
			}
		}

		// Return the last N parsed entries (most recent messages)
		return entries.slice(-parsedLimit);
	}

	isActive(sessionId: string): boolean {
		return this.getActiveSessionIds().has(sessionId);
	}

	// --- SDK session management ---

	async rename(sessionId: string, title: string): Promise<void> {
		await renameSession(sessionId, title);
	}

	async tag(sessionId: string, tag: string | null): Promise<void> {
		await tagSession(sessionId, tag);
	}

	async fork(sessionId: string, options?: { upToMessageId?: string; title?: string }): Promise<{ sessionId: string }> {
		const result = await forkSession(sessionId, options);
		return { sessionId: result.sessionId };
	}

	// --- JSONL file watcher for live tailing ---

	/**
	 * Watch a session's JSONL file for new lines and call onNewMessage
	 * for each new user/assistant/tool message. Returns an unsubscribe function.
	 */
	watchSession(sessionId: string, onNewMessage: (msg: ParsedMessage) => void): () => void {
		const filePath = this.findSessionFile(sessionId);
		if (!filePath) return () => {};

		let fileSize = 0;
		try {
			fileSize = statSync(filePath).size;
		} catch {
			return () => {};
		}

		let index = 0;

		const checkForNewContent = () => {
			try {
				const newSize = statSync(filePath).size;
				if (newSize <= fileSize) return;

				const fd = require("fs").openSync(filePath, "r");
				const buffer = Buffer.alloc(newSize - fileSize);
				require("fs").readSync(fd, buffer, 0, buffer.length, fileSize);
				require("fs").closeSync(fd);
				fileSize = newSize;

				const lines = buffer.toString("utf-8").split("\n").filter((l: string) => l.trim());
				for (const line of lines) {
					try {
						const entry = JSON.parse(line);
						const parsed = this.parseJsonlEntry(entry, index);
						for (const msg of parsed) {
							onNewMessage(msg);
							index++;
						}
					} catch {}
				}
			} catch {}
		};

		// Use both fs.watch (instant but unreliable on macOS) and polling (reliable fallback)
		let watcher: FSWatcher | null = null;
		try {
			watcher = watch(filePath, checkForNewContent);
		} catch {}

		const pollInterval = setInterval(checkForNewContent, 2000);

		return () => {
			watcher?.close();
			clearInterval(pollInterval);
		};
	}

	private findSessionFile(sessionId: string): string | null {
		const projectsDir = join(homedir(), ".claude", "projects");
		if (!existsSync(projectsDir)) return null;

		try {
			const dirs = readdirSync(projectsDir, { withFileTypes: true });
			for (const dir of dirs) {
				if (!dir.isDirectory()) continue;
				const candidate = join(projectsDir, dir.name, `${sessionId}.jsonl`);
				if (existsSync(candidate)) return candidate;
			}
		} catch {}

		return null;
	}

	private parseJsonlEntry(entry: any, baseIndex: number): ParsedMessage[] {
		const results: ParsedMessage[] = [];
		const msgContent = entry.message?.content ?? "";
		const type = entry.type;

		if (type === "user") {
			if (typeof msgContent === "string" && msgContent) {
				results.push({ index: baseIndex, type: "user", content: msgContent, timestamp: entry.timestamp ?? "" });
			} else if (Array.isArray(msgContent)) {
				const text = msgContent.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
				if (text) results.push({ index: baseIndex, type: "user", content: text, timestamp: entry.timestamp ?? "" });
				for (const block of msgContent) {
					if (block.type === "tool_result") {
						results.push({
							index: baseIndex,
							type: "tool_result",
							content: { tool_use_id: block.tool_use_id, content: block.content, is_error: block.is_error },
							timestamp: entry.timestamp ?? "",
						});
					}
				}
			}
		} else if (type === "assistant") {
			if (typeof msgContent === "string" && msgContent) {
				results.push({ index: baseIndex, type: "assistant", content: msgContent, timestamp: entry.timestamp ?? "" });
			} else if (Array.isArray(msgContent)) {
				for (const block of msgContent) {
					if (block.type === "text" && block.text) {
						results.push({ index: baseIndex, type: "assistant", content: block.text, timestamp: entry.timestamp ?? "" });
					} else if (block.type === "tool_use") {
						results.push({
							index: baseIndex,
							type: "tool_use",
							content: { tool: block.name, input: block.input, id: block.id },
							timestamp: entry.timestamp ?? "",
						});
					}
				}
			}
		}

		return results;
	}

	// --- Private helpers ---

	private getActiveSessionIds(): Set<string> {
		const active = new Set<string>();
		if (!existsSync(this.sessionsDir)) return active;

		let files: ReturnType<typeof readdirSync>;
		try {
			files = readdirSync(this.sessionsDir, { withFileTypes: true });
		} catch {
			return active;
		}

		for (const file of files) {
			if (!file.isFile() || !file.name.endsWith(".json")) continue;
			try {
				const data = JSON.parse(readFileSync(join(this.sessionsDir, file.name), "utf-8"));
				if (!data.sessionId || !data.pid) continue;
				try {
					process.kill(data.pid, 0);
					active.add(data.sessionId);
				} catch {
					// PID not alive
				}
			} catch {
				continue;
			}
		}

		return active;
	}
}

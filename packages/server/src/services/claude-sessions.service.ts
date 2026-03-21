import { basename } from "path";
import { homedir } from "os";
import { join } from "path";
import { readdirSync, readFileSync, existsSync } from "fs";
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

	async getMessages(sessionId: string, fromIdx?: number): Promise<ParsedMessage[]> {
		const rawMessages = await getSessionMessages(sessionId, {
			offset: fromIdx,
		});

		const entries: ParsedMessage[] = [];
		let index = fromIdx ?? 0;

		for (const msg of rawMessages) {
			if (msg.type === "user") {
				let text = "";
				if (msg.message && typeof msg.message === "object" && "content" in msg.message) {
					const msgContent = (msg.message as any).content;
					if (typeof msgContent === "string") {
						text = msgContent;
					} else if (Array.isArray(msgContent)) {
						text = msgContent
							.filter((b: any) => b.type === "text")
							.map((b: any) => b.text)
							.join("\n");
					}
				}
				entries.push({ index: index++, type: "user", content: text, timestamp: "" });
			} else if (msg.type === "assistant") {
				const msgContent =
					msg.message && typeof msg.message === "object" && "content" in msg.message
						? (msg.message as any).content
						: "";

				if (typeof msgContent === "string") {
					entries.push({ index: index++, type: "assistant", content: msgContent, timestamp: "" });
				} else if (Array.isArray(msgContent)) {
					for (const block of msgContent) {
						if (block.type === "text") {
							entries.push({ index: index++, type: "assistant", content: block.text, timestamp: "" });
						} else if (block.type === "tool_use") {
							entries.push({
								index: index++,
								type: "tool_use",
								content: { tool: block.name, input: block.input, id: block.id },
								timestamp: "",
							});
						} else if (block.type === "tool_result") {
							entries.push({
								index: index++,
								type: "tool_result",
								content: {
									tool_use_id: block.tool_use_id,
									content: block.content,
									is_error: block.is_error,
								},
								timestamp: "",
							});
						}
						// Skip "thinking" blocks and any other unknown types
					}
				}
			}
		}

		return entries;
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

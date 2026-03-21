import { randomUUID } from "crypto";
import type { CreateSessionInput, ServerConfig } from "@tricorder/shared";
import type { ClaudeSessionsService } from "./claude-sessions.service";
import type { ManifestService } from "./manifest.service";
import type { ReposService } from "./repos.service";
import type { AgentService } from "./agent.service";
import type { WorktreeService } from "./worktree.service";

interface ActiveSession {
	abortController: AbortController;
	messageBuffer: unknown[];
	subscribers: Set<(msg: unknown) => void>;
}

export class SessionService {
	private activeSessions = new Map<string, ActiveSession>();

	constructor(
		private claudeSessionsService: ClaudeSessionsService,
		private manifestService: ManifestService,
		private reposService: ReposService,
		private agentService: AgentService,
		private worktreeService: WorktreeService,
		private config: ServerConfig,
	) {}

	private getActiveCount(): number {
		let count = 0;
		for (const [, session] of this.activeSessions) {
			if (!session.abortController.signal.aborted) {
				count++;
			}
		}
		return count;
	}

	async create(input: CreateSessionInput): Promise<string> {
		if (this.getActiveCount() >= this.config.maxConcurrentSessions) {
			throw new Error(
				`Concurrent session limit reached (${this.config.maxConcurrentSessions}). Pause or cancel an existing session first.`,
			);
		}

		const repo = await this.reposService.findByName(input.repoName);
		if (!repo) {
			throw new Error(`Repository "${input.repoName}" not found`);
		}

		const sessionId = randomUUID();
		const sessionName = input.prompt.slice(0, 80);
		const branch = input.branch ?? "main";

		const worktreePath = await this.worktreeService.createWorktree(repo.path, branch, sessionId);

		const abortController = new AbortController();
		const activeSession: ActiveSession = {
			abortController,
			messageBuffer: [],
			subscribers: new Set(),
		};
		this.activeSessions.set(sessionId, activeSession);

		// Fire and forget — start the agent in the background
		this.agentService.startSession({
			prompt: input.prompt,
			cwd: worktreePath,
			mode: input.mode,
			callbacks: {
				onSessionId: (agentSessionId: string) => {
					this.manifestService.addSession(agentSessionId, {
						worktreePath,
						mode: input.mode,
						repoPath: repo.path,
						launchedAt: new Date().toISOString(),
					});
				},
				onMessage: (message: unknown) => {
					activeSession.messageBuffer.push(message);
					for (const subscriber of activeSession.subscribers) {
						subscriber(message);
					}
				},
				onComplete: () => {
					this.activeSessions.delete(sessionId);
				},
				onError: (_error: Error) => {
					this.activeSessions.delete(sessionId);
				},
			},
			abortSignal: abortController.signal,
		});

		return sessionId;
	}

	async list() {
		const claudeSessions = await this.claudeSessionsService.listSessions();
		const manifest = this.manifestService.listTricorderSessions();

		return claudeSessions.map((s) => ({
			id: s.sessionId,
			name: s.name,
			repoName: s.repoName,
			branch: s.gitBranch,
			mode: manifest[s.sessionId]?.mode ?? "interactive",
			status: this.activeSessions.has(s.sessionId) || s.active ? "active" : "completed",
			lastActivity: null,
			lastError: null,
			worktreePath: manifest[s.sessionId]?.worktreePath ?? null,
			agentSessionId: s.sessionId,
			createdAt: s.firstTimestamp,
			updatedAt: s.lastTimestamp,
		}));
	}

	async getById(id: string) {
		const meta = await this.claudeSessionsService.getSessionMeta(id);
		if (!meta) throw new Error(`Session "${id}" not found`);
		const manifest = this.manifestService.getSession(id);
		return {
			id: meta.sessionId,
			name: meta.name,
			initialPrompt: meta.initialPrompt,
			repoName: meta.repoName,
			branch: meta.gitBranch,
			mode: manifest?.mode ?? "interactive",
			status: this.activeSessions.has(id) || meta.active ? "active" : "completed",
			lastActivity: null,
			lastError: null,
			worktreePath: manifest?.worktreePath ?? null,
			agentSessionId: meta.sessionId,
			createdAt: meta.firstTimestamp,
			updatedAt: meta.lastTimestamp,
		};
	}

	async getMessages(sessionId: string, fromIdx?: number) {
		// For active Tricorder sessions, check in-memory buffer first
		const active = this.activeSessions.get(sessionId);
		if (active && active.messageBuffer.length > 0) {
			const msgs = active.messageBuffer.map((msg, i) => ({
				index: i,
				type:
					typeof msg === "object" && msg !== null && "type" in msg
						? String((msg as Record<string, unknown>).type)
						: "unknown",
				content: msg,
				timestamp: new Date().toISOString(),
			}));
			if (fromIdx !== undefined) return msgs.filter((m) => m.index >= fromIdx);
			return msgs;
		}
		// Fall back to JSONL history
		return await this.claudeSessionsService.getMessages(sessionId, fromIdx);
	}

	subscribe(sessionId: string, callback: (msg: unknown) => void): () => void {
		// For Tricorder-launched sessions, use in-memory subscribers
		const active = this.activeSessions.get(sessionId);
		if (active) {
			active.subscribers.add(callback);
			return () => {
				active.subscribers.delete(callback);
			};
		}

		// For terminal-launched sessions, tail the JSONL file
		const unwatch = this.claudeSessionsService.watchSession(sessionId, (msg) => {
			callback(msg);
		});
		return unwatch;
	}

	pause(sessionId: string) {
		const active = this.activeSessions.get(sessionId);
		if (active) {
			active.abortController.abort();
			this.activeSessions.delete(sessionId);
		}
	}

	cancel(sessionId: string) {
		const active = this.activeSessions.get(sessionId);
		if (active) {
			active.abortController.abort();
			this.activeSessions.delete(sessionId);
		}
	}

	async sendMessage(sessionId: string, message: string) {
		const session = await this.getById(sessionId);
		if (!session.agentSessionId) {
			throw new Error("Session has no agent session ID — cannot resume");
		}
		if (!session.worktreePath) {
			throw new Error("Session has no worktree path — cannot resume");
		}

		const abortController = new AbortController();
		const activeSession: ActiveSession = {
			abortController,
			messageBuffer: [],
			subscribers: new Set(),
		};
		this.activeSessions.set(sessionId, activeSession);

		this.agentService.startSession({
			prompt: message,
			cwd: session.worktreePath,
			mode: session.mode as "autonomous" | "interactive",
			resumeSessionId: session.agentSessionId,
			callbacks: {
				onSessionId: (_agentSessionId: string) => {
					// Session already tracked in manifest
				},
				onMessage: (msg: unknown) => {
					activeSession.messageBuffer.push(msg);
					for (const subscriber of activeSession.subscribers) {
						subscriber(msg);
					}
				},
				onComplete: () => {
					this.activeSessions.delete(sessionId);
				},
				onError: (_error: Error) => {
					this.activeSessions.delete(sessionId);
				},
			},
			abortSignal: abortController.signal,
		});
	}

	async getHandoff(sessionId: string) {
		const session = await this.getById(sessionId);
		const allowedStatuses = ["paused", "completed", "error", "cancelled"];
		if (!allowedStatuses.includes(session.status)) {
			throw new Error(`Cannot hand off an active session. Current status: ${session.status}`);
		}

		const resumeCommand = session.agentSessionId
			? `claude --resume ${session.agentSessionId}`
			: `claude`;

		return {
			sessionId: session.id,
			sessionName: session.name,
			worktreePath: session.worktreePath ?? null,
			resumeCommand,
		};
	}

	async getActivityFeed(limit = 50) {
		const sessions = await this.claudeSessionsService.listSessions();
		const events: Array<{
			id: string;
			sessionId: string;
			sessionName: string;
			type: string;
			description: string;
			timestamp: string;
		}> = [];

		for (const session of sessions) {
			events.push({
				id: `${session.sessionId}-created`,
				sessionId: session.sessionId,
				sessionName: session.name,
				type: "created",
				description: `Session started in ${session.repoName}`,
				timestamp: session.firstTimestamp,
			});
			if (!session.active) {
				events.push({
					id: `${session.sessionId}-completed`,
					sessionId: session.sessionId,
					sessionName: session.name,
					type: "completed",
					description: "Session completed",
					timestamp: session.lastTimestamp,
				});
			}
		}

		return events
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, limit);
	}

	async renameSession(sessionId: string, title: string) {
		await this.claudeSessionsService.rename(sessionId, title);
	}

	async tagSession(sessionId: string, tag: string | null) {
		await this.claudeSessionsService.tag(sessionId, tag);
	}

	async forkSession(sessionId: string, options?: { upToMessageId?: string; title?: string }) {
		return this.claudeSessionsService.fork(sessionId, options);
	}
}

import { randomUUID } from "crypto";
import type { CreateSessionInput, ServerConfig } from "@tricorder/shared";
import type { SessionsRepository } from "../repositories/sessions.repo";
import type { MessagesRepository } from "../repositories/messages.repo";
import type { ActivityRepository } from "../repositories/activity.repo";
import type { ReposRepository } from "../repositories/repos.repo";
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
		private sessionsRepo: SessionsRepository,
		private messagesRepo: MessagesRepository,
		private activityRepo: ActivityRepository,
		private reposRepo: ReposRepository,
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

		const repo = await this.reposRepo.findByName(input.repoName);
		if (!repo) {
			throw new Error(`Repository "${input.repoName}" not found`);
		}

		const sessionId = randomUUID();
		const sessionName = input.prompt.slice(0, 80);
		const branch = input.branch ?? "main";

		const worktreePath = await this.worktreeService.createWorktree(repo.path, branch, sessionId);

		this.sessionsRepo.insert({
			id: sessionId,
			name: sessionName,
			repoName: input.repoName,
			branch,
			mode: input.mode,
			worktreePath,
		});

		this.activityRepo.insert({
			id: randomUUID(),
			sessionId,
			sessionName,
			type: "created",
			description: `Session created for ${input.repoName} on branch ${branch}`,
		});

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
					this.sessionsRepo.updateAgentSession(sessionId, agentSessionId);
				},
				onMessage: (message: unknown) => {
					activeSession.messageBuffer.push(message);
					const idx = activeSession.messageBuffer.length - 1;
					const type =
						typeof message === "object" && message !== null && "type" in message
							? String((message as Record<string, unknown>).type)
							: "unknown";
					this.messagesRepo.insert(sessionId, idx, type, message);
					this.sessionsRepo.updateActivity(sessionId, type);
					for (const subscriber of activeSession.subscribers) {
						subscriber(message);
					}
				},
				onComplete: () => {
					this.sessionsRepo.updateStatus(sessionId, "completed");
					this.activityRepo.insert({
						id: randomUUID(),
						sessionId,
						sessionName,
						type: "completed",
						description: "Session completed successfully",
					});
					this.activeSessions.delete(sessionId);
				},
				onError: (error: Error) => {
					this.sessionsRepo.updateError(sessionId, error.message);
					this.activityRepo.insert({
						id: randomUUID(),
						sessionId,
						sessionName,
						type: "error",
						description: `Session error: ${error.message}`,
					});
					this.activeSessions.delete(sessionId);
				},
			},
			abortSignal: abortController.signal,
		});

		return sessionId;
	}

	list() {
		return this.sessionsRepo.findAll();
	}

	getById(id: string) {
		const session = this.sessionsRepo.findById(id);
		if (!session) {
			throw new Error(`Session "${id}" not found`);
		}
		return session;
	}

	getMessages(sessionId: string, fromIdx?: number) {
		if (fromIdx !== undefined) {
			return this.messagesRepo.findBySessionFrom(sessionId, fromIdx);
		}
		return this.messagesRepo.findBySession(sessionId);
	}

	subscribe(sessionId: string, callback: (msg: unknown) => void): () => void {
		const active = this.activeSessions.get(sessionId);
		if (!active) {
			return () => {};
		}
		active.subscribers.add(callback);
		return () => {
			active.subscribers.delete(callback);
		};
	}

	pause(sessionId: string) {
		const active = this.activeSessions.get(sessionId);
		if (active) {
			active.abortController.abort();
			this.activeSessions.delete(sessionId);
		}
		const session = this.getById(sessionId);
		this.sessionsRepo.updateStatus(sessionId, "paused");
		this.activityRepo.insert({
			id: randomUUID(),
			sessionId,
			sessionName: session.name,
			type: "paused",
			description: "Session paused by user",
		});
	}

	cancel(sessionId: string) {
		const active = this.activeSessions.get(sessionId);
		if (active) {
			active.abortController.abort();
			this.activeSessions.delete(sessionId);
		}
		const session = this.getById(sessionId);
		this.sessionsRepo.updateStatus(sessionId, "cancelled");
		this.activityRepo.insert({
			id: randomUUID(),
			sessionId,
			sessionName: session.name,
			type: "cancelled",
			description: "Session cancelled by user",
		});
	}

	async sendMessage(sessionId: string, message: string) {
		const session = this.getById(sessionId);
		if (!session.agentSessionId) {
			throw new Error("Session has no agent session ID — cannot resume");
		}
		if (!session.worktreePath) {
			throw new Error("Session has no worktree path — cannot resume");
		}

		const sessionName = session.name;
		const abortController = new AbortController();
		const activeSession: ActiveSession = {
			abortController,
			messageBuffer: [],
			subscribers: new Set(),
		};
		this.activeSessions.set(sessionId, activeSession);

		this.sessionsRepo.updateStatus(sessionId, "active");

		this.agentService.startSession({
			prompt: message,
			cwd: session.worktreePath,
			mode: session.mode as "autonomous" | "interactive",
			resumeSessionId: session.agentSessionId,
			callbacks: {
				onSessionId: (agentSessionId: string) => {
					this.sessionsRepo.updateAgentSession(sessionId, agentSessionId);
				},
				onMessage: (msg: unknown) => {
					activeSession.messageBuffer.push(msg);
					const existingCount = this.messagesRepo.countBySession(sessionId);
					const idx = existingCount + activeSession.messageBuffer.length - 1;
					const type =
						typeof msg === "object" && msg !== null && "type" in msg
							? String((msg as Record<string, unknown>).type)
							: "unknown";
					this.messagesRepo.insert(sessionId, idx, type, msg);
					this.sessionsRepo.updateActivity(sessionId, type);
					for (const subscriber of activeSession.subscribers) {
						subscriber(msg);
					}
				},
				onComplete: () => {
					this.sessionsRepo.updateStatus(sessionId, "completed");
					this.activityRepo.insert({
						id: randomUUID(),
						sessionId,
						sessionName,
						type: "completed",
						description: "Session completed successfully",
					});
					this.activeSessions.delete(sessionId);
				},
				onError: (error: Error) => {
					this.sessionsRepo.updateError(sessionId, error.message);
					this.activityRepo.insert({
						id: randomUUID(),
						sessionId,
						sessionName,
						type: "error",
						description: `Session error: ${error.message}`,
					});
					this.activeSessions.delete(sessionId);
				},
			},
			abortSignal: abortController.signal,
		});
	}

	getHandoff(sessionId: string) {
		const session = this.getById(sessionId);
		const allowedStatuses = ["paused", "completed", "error", "cancelled"];
		if (!allowedStatuses.includes(session.status)) {
			throw new Error(`Cannot hand off an active session. Current status: ${session.status}`);
		}

		const resumeCommand = session.agentSessionId ? `claude --resume ${session.agentSessionId}` : `claude`;

		return {
			sessionId: session.id,
			sessionName: session.name,
			worktreePath: session.worktreePath ?? null,
			resumeCommand,
		};
	}

	getActivityFeed(limit?: number) {
		return this.activityRepo.findRecent(limit);
	}
}

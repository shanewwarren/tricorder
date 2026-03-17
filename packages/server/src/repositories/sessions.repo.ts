import { eq, desc } from "drizzle-orm";
import { schema, type Db } from "../db";
import type { SessionStatus, SessionMode } from "@tricorder/shared";

export class SessionsRepository {
	constructor(private db: Db) {}

	insert(data: {
		id: string;
		name: string;
		repoName: string;
		branch: string;
		mode: SessionMode;
		worktreePath?: string | null;
		agentSessionId?: string | null;
	}) {
		this.db
			.insert(schema.sessions)
			.values({
				...data,
				worktreePath: data.worktreePath ?? null,
				agentSessionId: data.agentSessionId ?? null,
			})
			.run();
	}

	findById(id: string) {
		return this.db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get();
	}

	findAll() {
		return this.db.select().from(schema.sessions).orderBy(desc(schema.sessions.updatedAt)).all();
	}

	updateStatus(id: string, status: SessionStatus) {
		this.db
			.update(schema.sessions)
			.set({ status, updatedAt: new Date().toISOString() })
			.where(eq(schema.sessions.id, id))
			.run();
	}

	updateActivity(id: string, activity: string) {
		this.db
			.update(schema.sessions)
			.set({ lastActivity: activity, updatedAt: new Date().toISOString() })
			.where(eq(schema.sessions.id, id))
			.run();
	}

	updateError(id: string, error: string) {
		this.db
			.update(schema.sessions)
			.set({ status: "error", lastError: error, updatedAt: new Date().toISOString() })
			.where(eq(schema.sessions.id, id))
			.run();
	}

	updateAgentSession(id: string, agentSessionId: string) {
		this.db
			.update(schema.sessions)
			.set({ agentSessionId, updatedAt: new Date().toISOString() })
			.where(eq(schema.sessions.id, id))
			.run();
	}

	clearWorktreePath(id: string) {
		this.db
			.update(schema.sessions)
			.set({ worktreePath: null, updatedAt: new Date().toISOString() })
			.where(eq(schema.sessions.id, id))
			.run();
	}

	delete(id: string) {
		this.db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run();
	}
}

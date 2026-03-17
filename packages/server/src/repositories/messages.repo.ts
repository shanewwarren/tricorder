import { eq, gte, asc, count, and } from "drizzle-orm";
import { schema, type Db } from "../db";

export class MessagesRepository {
	constructor(private db: Db) {}

	insert(sessionId: string, idx: number, type: string, content: unknown) {
		this.db
			.insert(schema.messages)
			.values({
				sessionId,
				idx,
				type,
				content: JSON.stringify(content),
			})
			.run();
	}

	findBySession(sessionId: string) {
		return this.db
			.select()
			.from(schema.messages)
			.where(eq(schema.messages.sessionId, sessionId))
			.orderBy(asc(schema.messages.idx))
			.all();
	}

	findBySessionFrom(sessionId: string, fromIdx: number) {
		return this.db
			.select()
			.from(schema.messages)
			.where(and(eq(schema.messages.sessionId, sessionId), gte(schema.messages.idx, fromIdx)))
			.orderBy(asc(schema.messages.idx))
			.all();
	}

	countBySession(sessionId: string): number {
		return (
			this.db.select({ count: count() }).from(schema.messages).where(eq(schema.messages.sessionId, sessionId)).get()
				?.count ?? 0
		);
	}
}

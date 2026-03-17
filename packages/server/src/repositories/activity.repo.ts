import { desc } from "drizzle-orm";
import { schema, type Db } from "../db";

export class ActivityRepository {
	constructor(private db: Db) {}

	insert(event: {
		id: string;
		sessionId: string;
		sessionName: string;
		type: string;
		description: string;
	}) {
		this.db.insert(schema.activityEvents).values(event).run();
	}

	findRecent(limit = 50) {
		return this.db
			.select()
			.from(schema.activityEvents)
			.orderBy(desc(schema.activityEvents.timestamp))
			.limit(limit)
			.all();
	}
}

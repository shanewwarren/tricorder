import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

export function createDb(path: string) {
	const sqlite = new Database(path);
	sqlite.run("PRAGMA journal_mode = WAL");
	sqlite.run("PRAGMA foreign_keys = ON");
	return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };

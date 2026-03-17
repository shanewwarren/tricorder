import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const sessions = sqliteTable("sessions", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	repoName: text("repo_name").notNull(),
	branch: text("branch").notNull().default("main"),
	mode: text("mode", { enum: ["autonomous", "interactive"] }).notNull(),
	status: text("status", { enum: ["active", "paused", "completed", "cancelled", "error"] })
		.notNull()
		.default("active"),
	worktreePath: text("worktree_path"),
	workingDirectory: text("working_directory"),
	lastActivity: text("last_activity"),
	lastError: text("last_error"),
	agentSessionId: text("agent_session_id"),
	createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
	updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const messages = sqliteTable("messages", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	sessionId: text("session_id")
		.notNull()
		.references(() => sessions.id),
	idx: integer("idx").notNull(),
	type: text("type").notNull(),
	content: text("content").notNull(),
	timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

export const activityEvents = sqliteTable("activity_events", {
	id: text("id").primaryKey(),
	sessionId: text("session_id").notNull(),
	sessionName: text("session_name").notNull(),
	type: text("type").notNull(),
	description: text("description").notNull(),
	timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

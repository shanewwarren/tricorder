CREATE TABLE `activity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`session_name` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`idx` integer NOT NULL,
	`type` text NOT NULL,
	`content` text NOT NULL,
	`timestamp` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`repo_name` text NOT NULL,
	`branch` text DEFAULT 'main' NOT NULL,
	`mode` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`worktree_path` text,
	`working_directory` text,
	`last_activity` text,
	`last_error` text,
	`agent_session_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);

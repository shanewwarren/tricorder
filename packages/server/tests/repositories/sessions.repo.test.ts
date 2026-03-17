import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { unlinkSync } from "fs";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { createDb } from "../../src/db";
import { SessionsRepository } from "../../src/repositories/sessions.repo";

const TEST_DB_PATH = "/tmp/tricorder-test-sessions.sqlite";

describe("SessionsRepository", () => {
	let repo: SessionsRepository;

	beforeEach(() => {
		const db = createDb(TEST_DB_PATH);
		migrate(db, { migrationsFolder: "./drizzle" });
		repo = new SessionsRepository(db);
	});

	afterEach(() => {
		try {
			unlinkSync(TEST_DB_PATH);
			unlinkSync(`${TEST_DB_PATH}-wal`);
			unlinkSync(`${TEST_DB_PATH}-shm`);
		} catch {
			// ignore if files don't exist
		}
	});

	it("insert + findById returns the session", () => {
		repo.insert({
			id: "s1",
			name: "Test Session",
			repoName: "my-repo",
			branch: "main",
			mode: "autonomous",
		});

		const session = repo.findById("s1");
		expect(session).toBeDefined();
		expect(session!.id).toBe("s1");
		expect(session!.name).toBe("Test Session");
		expect(session!.repoName).toBe("my-repo");
		expect(session!.branch).toBe("main");
		expect(session!.mode).toBe("autonomous");
		expect(session!.status).toBe("active");
	});

	it("findAll returns sessions ordered by updatedAt desc", () => {
		repo.insert({
			id: "s1",
			name: "First",
			repoName: "repo",
			branch: "main",
			mode: "autonomous",
		});

		repo.insert({
			id: "s2",
			name: "Second",
			repoName: "repo",
			branch: "main",
			mode: "interactive",
		});

		// Update s1 so its updatedAt is more recent
		repo.updateActivity("s1", "doing stuff");

		const all = repo.findAll();
		expect(all).toHaveLength(2);
		expect(all[0].id).toBe("s1");
		expect(all[1].id).toBe("s2");
	});

	it("updateStatus changes the session status", () => {
		repo.insert({
			id: "s1",
			name: "Test",
			repoName: "repo",
			branch: "main",
			mode: "autonomous",
		});

		repo.updateStatus("s1", "paused");

		const session = repo.findById("s1");
		expect(session!.status).toBe("paused");
	});

	it("updateError sets status to error and stores error message", () => {
		repo.insert({
			id: "s1",
			name: "Test",
			repoName: "repo",
			branch: "main",
			mode: "autonomous",
		});

		repo.updateError("s1", "Something went wrong");

		const session = repo.findById("s1");
		expect(session!.status).toBe("error");
		expect(session!.lastError).toBe("Something went wrong");
	});

	it("delete removes the session", () => {
		repo.insert({
			id: "s1",
			name: "Test",
			repoName: "repo",
			branch: "main",
			mode: "autonomous",
		});

		repo.delete("s1");

		const session = repo.findById("s1");
		expect(session).toBeUndefined();
	});
});

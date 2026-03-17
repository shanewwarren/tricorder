import { createClient } from "../client";

export async function list() {
	try {
		const client = createClient();
		const sessions = await client.sessions.list.query();

		if (sessions.length === 0) {
			console.log("No sessions found.");
			return;
		}

		console.log("Sessions:\n");
		for (const s of sessions) {
			const status = (s as any).status.toUpperCase().padEnd(10);
			const mode = (s as any).mode.padEnd(12);
			const name = (s as any).name;
			const repo = (s as any).repoName;
			const branch = (s as any).branch;
			const id = (s as any).id.slice(0, 8);
			console.log(`  ${status} ${mode} ${name}`);
			console.log(`           ${repo} • ${branch} • ${id}`);
			console.log();
		}
	} catch {
		console.error("Cannot connect to Tricorder server");
		process.exit(1);
	}
}

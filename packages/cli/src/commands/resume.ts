import { createClient } from "../client";
import { execSync } from "child_process";

export async function resume(nameOrId: string) {
	if (!nameOrId) {
		console.error("Usage: tricorder resume <session-name>");
		process.exit(1);
	}

	const client = createClient();
	const sessions = await client.sessions.list.query();
	const session = sessions.find(
		(s: any) => s.id === nameOrId || s.name.toLowerCase().replace(/\s+/g, "-").includes(nameOrId.toLowerCase()),
	);

	if (!session) {
		console.error(`Session not found: ${nameOrId}`);
		process.exit(1);
	}

	const handoff = await client.sessions.handoff.query({ id: session.id });
	const detail = await client.sessions.detail.query({ id: session.id });

	console.log(`Resuming session: ${handoff.sessionName}`);
	const cwd = handoff.worktreePath || process.cwd();
	console.log(`Working directory: ${cwd}`);

	const agentSessionId = (detail.session as any).agentSessionId;
	if (!agentSessionId) {
		console.error("No agent session ID available for resume");
		process.exit(1);
	}

	try {
		execSync(`claude --resume ${agentSessionId}`, { cwd, stdio: "inherit" });
	} catch (err: any) {
		if (err.status !== 0) {
			console.error("Claude exited with an error");
			process.exit(1);
		}
	}
}

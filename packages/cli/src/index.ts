#!/usr/bin/env bun
import { parseArgs } from "util";

const { positionals } = parseArgs({
	args: Bun.argv.slice(2),
	allowPositionals: true,
	strict: false,
});

const command = positionals[0];
const args = positionals.slice(1);

switch (command) {
	case "resume": {
		const { resume } = await import("./commands/resume");
		await resume(args[0]);
		break;
	}
	case "list": {
		const { list } = await import("./commands/list");
		await list();
		break;
	}
	case "status": {
		const { status } = await import("./commands/status");
		await status();
		break;
	}
	default:
		console.log("Usage: tricorder <resume|list|status>");
		console.log("  resume <name>  — resume session in terminal via claude --resume");
		console.log("  list           — list all sessions");
		console.log("  status         — show server status + usage");
		process.exit(1);
}

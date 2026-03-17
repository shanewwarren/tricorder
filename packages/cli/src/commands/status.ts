import { createClient } from "../client";

export async function status() {
	try {
		const client = createClient();
		const config = await client.config.get.query();
		const usage = await client.usage.current.query();
		const sessions = await client.sessions.list.query();

		const activeCount = sessions.filter((s: any) => s.status === "active").length;

		console.log(`Tricorder Server: ${(config as any).host}:${(config as any).port}`);
		console.log(`Scan Directory: ${(config as any).scanDirectory}`);
		console.log(`Active Sessions: ${activeCount}`);
		console.log();

		if ((usage as any).available) {
			console.log("Usage:");
			for (const tier of (usage as any).tiers) {
				const filled = Math.floor(tier.percentage / 5);
				const bar = "█".repeat(filled) + "░".repeat(20 - filled);
				console.log(`  ${tier.label.padEnd(12)} ${bar} ${tier.percentage}%`);
			}
		} else {
			console.log("Usage: unavailable");
		}
	} catch {
		const url = process.env.TRICORDER_URL || "http://localhost:3141";
		console.error(`Cannot connect to server at ${url}`);
		process.exit(1);
	}
}

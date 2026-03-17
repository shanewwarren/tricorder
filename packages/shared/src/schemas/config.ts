import { z } from "zod";

export const serverConfig = z.object({
	scanDirectory: z.string().default("~/code"),
	host: z.string().default("127.0.0.1"),
	port: z.number().default(3141),
	plugins: z.array(z.string()).default([]),
	mcpServers: z
		.record(
			z.object({
				command: z.string(),
				args: z.array(z.string()),
			}),
		)
		.default({}),
	maxConcurrentSessions: z.number().default(5),
	defaultMode: z.enum(["autonomous", "interactive"]).default("autonomous"),
	defaultAllowedTools: z
		.array(z.string())
		.default(["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "WebSearch", "WebFetch"]),
});

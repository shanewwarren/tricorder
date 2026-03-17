import { z } from "zod";

export const repoSummary = z.object({
	name: z.string(),
	path: z.string(),
	defaultBranch: z.string(),
	lastCommitDate: z.string().nullable(),
});

export const repoDetail = z.object({
	name: z.string(),
	path: z.string(),
	branches: z.array(z.string()),
	recentCommits: z.array(
		z.object({
			hash: z.string(),
			message: z.string(),
			date: z.string(),
		}),
	),
});

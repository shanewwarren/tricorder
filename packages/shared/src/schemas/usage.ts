import { z } from "zod";

export const usageTier = z.object({
	label: z.string(),
	subtitle: z.string(),
	percentage: z.number(),
	resetIn: z.string().nullable(),
	dollarAmount: z.number().nullable(),
	dollarLimit: z.number().nullable(),
});

export const usageData = z.object({
	tiers: z.array(usageTier),
	updatedAt: z.string(),
	available: z.boolean(),
});

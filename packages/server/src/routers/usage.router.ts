import { router, publicProcedure } from "../trpc";

export const usageRouter = router({
	current: publicProcedure.query(() => {
		return {
			tiers: [],
			updatedAt: new Date().toISOString(),
			available: false,
		};
	}),
});

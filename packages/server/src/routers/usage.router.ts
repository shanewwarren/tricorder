import { router, publicProcedure } from "../trpc";

export const usageRouter = router({
	current: publicProcedure.query(async ({ ctx }) => {
		const usageService = ctx.container.resolve("usageService");
		return usageService.getUsage();
	}),
});

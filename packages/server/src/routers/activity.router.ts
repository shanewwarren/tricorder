import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const activityRouter = router({
	list: publicProcedure.input(z.object({ limit: z.number().optional() }).optional()).query(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.getActivityFeed(input?.limit);
	}),
});

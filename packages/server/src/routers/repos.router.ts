import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const reposRouter = router({
	list: publicProcedure.query(async ({ ctx }) => {
		const reposService = ctx.container.resolve("reposService");
		return reposService.findAll();
	}),

	detail: publicProcedure.input(z.object({ path: z.string() })).query(async ({ input, ctx }) => {
		const reposService = ctx.container.resolve("reposService");
		return reposService.getDetail(input.path);
	}),

	memory: publicProcedure.input(z.object({ path: z.string() })).query(({ input, ctx }) => {
		const reposService = ctx.container.resolve("reposService");
		return reposService.getProjectMemory(input.path);
	}),
});

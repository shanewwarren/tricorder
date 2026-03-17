import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const reposRouter = router({
	list: publicProcedure.query(({ ctx }) => {
		const reposRepo = ctx.container.resolve("reposRepo");
		return reposRepo.findAll();
	}),

	detail: publicProcedure.input(z.object({ path: z.string() })).query(({ input, ctx }) => {
		const reposRepo = ctx.container.resolve("reposRepo");
		return reposRepo.getDetail(input.path);
	}),
});

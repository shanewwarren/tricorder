import { router, publicProcedure } from "../trpc";

export const configRouter = router({
	get: publicProcedure.query(({ ctx }) => {
		return ctx.container.resolve("config");
	}),
});

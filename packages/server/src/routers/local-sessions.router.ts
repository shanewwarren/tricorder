import { z } from "zod";
import { router, publicProcedure } from "../trpc";

export const localSessionsRouter = router({
	list: publicProcedure.query(({ ctx }) => {
		const watcherService = ctx.container.resolve("watcherService");
		return watcherService.scanLocalSessions();
	}),

	detail: publicProcedure.input(z.object({ id: z.string() })).query(({ input, ctx }) => {
		const watcherService = ctx.container.resolve("watcherService");
		const sessions = watcherService.scanLocalSessions();
		const session = sessions.find((s: any) => s.id === input.id);
		if (!session) throw new Error("Local session not found");
		return session;
	}),

	takeover: publicProcedure.input(z.object({ id: z.string() })).mutation(async ({ input, ctx }) => {
		const watcherService = ctx.container.resolve("watcherService");
		const sessions = watcherService.scanLocalSessions();
		const session = sessions.find((s: any) => s.id === input.id);
		if (!session) throw new Error("Local session not found");
		if (session.active) throw new Error("Session is active in terminal — stop it first to take over");

		// For now, return the session info. Full takeover (resume via Agent SDK)
		// requires more complex integration with SessionService
		return {
			id: session.id,
			name: session.name,
			directory: session.directory,
		};
	}),
});

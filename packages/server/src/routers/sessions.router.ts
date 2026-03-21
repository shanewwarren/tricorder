import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { createSessionInput } from "@tricorder/shared";
import { router, publicProcedure } from "../trpc";

export const sessionsRouter = router({
	create: publicProcedure.input(createSessionInput).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.create(input);
	}),

	list: publicProcedure.query(({ ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.list();
	}),

	detail: publicProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		const session = await sessionService.getById(input.id);
		const messages = await sessionService.getMessages(input.id);
		return { session, messages };
	}),

	message: publicProcedure.input(z.object({ id: z.string(), message: z.string() })).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.sendMessage(input.id, input.message);
	}),

	pause: publicProcedure.input(z.object({ id: z.string() })).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.pause(input.id);
	}),

	cancel: publicProcedure.input(z.object({ id: z.string() })).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.cancel(input.id);
	}),

	handoff: publicProcedure.input(z.object({ id: z.string() })).query(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.getHandoff(input.id);
	}),

	rename: publicProcedure.input(z.object({ id: z.string(), title: z.string() })).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.renameSession(input.id, input.title);
	}),

	tag: publicProcedure.input(z.object({ id: z.string(), tag: z.string().nullable() })).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.tagSession(input.id, input.tag);
	}),

	fork: publicProcedure.input(z.object({ id: z.string(), upToMessageId: z.string().optional(), title: z.string().optional() })).mutation(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		return sessionService.forkSession(input.id, { upToMessageId: input.upToMessageId, title: input.title });
	}),

	stream: publicProcedure
		.input(z.object({ id: z.string(), lastSeenIndex: z.number().optional() }))
		.subscription(({ input, ctx }) => {
			return observable((emit) => {
				const sessionService = ctx.container.resolve("sessionService");

				// Replay missed messages (async, but observable expects sync setup)
				sessionService.getMessages(input.id, input.lastSeenIndex).then((missed: any[]) => {
					for (const msg of missed) {
						emit.next(msg);
					}
				});

				// Subscribe to new messages
				const unsubscribe = sessionService.subscribe(input.id, (msg: unknown) => {
					emit.next(msg);
				});

				return unsubscribe;
			});
		}),
});

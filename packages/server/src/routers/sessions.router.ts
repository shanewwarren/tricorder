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

	detail: publicProcedure.input(z.object({ id: z.string() })).query(({ input, ctx }) => {
		const sessionService = ctx.container.resolve("sessionService");
		const session = sessionService.getById(input.id);
		const messages = sessionService.getMessages(input.id);
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

	stream: publicProcedure
		.input(z.object({ id: z.string(), lastSeenIndex: z.number().optional() }))
		.subscription(({ input, ctx }) => {
			return observable((emit) => {
				const sessionService = ctx.container.resolve("sessionService");

				// Replay missed messages
				const missed = sessionService.getMessages(input.id, input.lastSeenIndex);
				for (const msg of missed) {
					emit.next(msg);
				}

				// Subscribe to new messages
				const unsubscribe = sessionService.subscribe(input.id, (msg: unknown) => {
					emit.next(msg);
				});

				return unsubscribe;
			});
		}),
});

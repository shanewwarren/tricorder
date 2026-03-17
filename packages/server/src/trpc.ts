import { initTRPC } from "@trpc/server";
import type { AwilixContainer } from "awilix";

export interface TrpcContext {
	container: AwilixContainer;
}

const t = initTRPC.context<TrpcContext>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

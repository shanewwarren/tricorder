import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";

const SERVER_URL = process.env.TRICORDER_URL || "http://localhost:3141";

export function createClient() {
	return createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: SERVER_URL })] });
}

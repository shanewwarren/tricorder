import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppRouter } from "@tricorder/server";
import { createWSClient, httpBatchLink, splitLink, wsLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

export const trpc = createTRPCReact<AppRouter>();

export async function getServerUrl(): Promise<string> {
	const stored = await AsyncStorage.getItem("tricorder-server-url");
	const port = process.env.EXPO_PUBLIC_SERVER_PORT || "3141";
	return stored || `http://localhost:${port}`;
}

export function createTrpcClient(serverUrl: string) {
	const wsClient = createWSClient({
		url: serverUrl.replace("http", "ws"),
		retryDelayMs: () => 3000,
	});

	return trpc.createClient({
		links: [
			splitLink({
				condition: (op) => op.type === "subscription",
				true: wsLink({ client: wsClient }),
				false: httpBatchLink({ url: serverUrl }),
			}),
		],
	});
}

import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, splitLink, wsLink, createWSClient } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const trpc = createTRPCReact<AppRouter>();

export async function getServerUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem("tricorder-server-url");
  return stored || "http://localhost:3141";
}

export function createTrpcClient(serverUrl: string) {
  const wsClient = createWSClient({ url: serverUrl.replace("http", "ws") });

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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { trpc, createTrpcClient } from "./trpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

const DEFAULT_URL = "http://localhost:3141";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient, setTrpcClient] = useState(() => createTrpcClient(DEFAULT_URL));

  useEffect(() => {
    AsyncStorage.getItem("tricorder-server-url").then((url) => {
      if (url && url !== DEFAULT_URL) {
        setTrpcClient(createTrpcClient(url));
        queryClient.clear();
      }
    });
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export { queryClient };

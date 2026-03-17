import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
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

interface TrpcContextValue {
  reconnect: (url: string) => void;
  serverUrl: string;
}

const TrpcContext = createContext<TrpcContextValue>({ reconnect: () => {}, serverUrl: DEFAULT_URL });

export function useTrpcContext() {
  return useContext(TrpcContext);
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
  const [trpcClient, setTrpcClient] = useState(() => createTrpcClient(DEFAULT_URL));

  useEffect(() => {
    AsyncStorage.getItem("tricorder-server-url").then((url) => {
      if (url && url !== DEFAULT_URL) {
        setServerUrl(url);
        setTrpcClient(createTrpcClient(url));
        queryClient.clear();
      }
    });
  }, []);

  const reconnect = useCallback((url: string) => {
    setServerUrl(url);
    setTrpcClient(createTrpcClient(url));
    queryClient.clear();
    AsyncStorage.setItem("tricorder-server-url", url);
  }, []);

  return (
    <TrpcContext.Provider value={{ reconnect, serverUrl }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </TrpcContext.Provider>
  );
}

export { queryClient };

import { join } from "path";
import cors from "cors";
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { loadConfig, getDbPath } from "./config";
import { createDb } from "./db";
import { createAppContainer } from "./container";
import { appRouter } from "./routers";

const config = loadConfig();
const db = createDb(getDbPath());

// Run migrations on startup
migrate(db, { migrationsFolder: join(import.meta.dir, "../drizzle") });

const container = createAppContainer(config, db);

const httpServer = createHTTPServer({
	router: appRouter,
	createContext: () => ({ container }),
	middleware: cors(),
	onError: ({ error, path }) => {
		console.error(`[tRPC error] ${path}:`, error.message);
	},
});

// Log incoming requests
const originalListeners = httpServer.listeners("request");
httpServer.removeAllListeners("request");
httpServer.on("request", (req, res) => {
	console.log(`[${req.method}] ${req.url}`);
	for (const listener of originalListeners) {
		(listener as Function).call(httpServer, req, res);
	}
});

const wss = new WebSocketServer({ server: httpServer });
applyWSSHandler({ wss, router: appRouter, createContext: () => ({ container }) });

const { host, port } = config;
httpServer.listen(port, host);
console.log(`Tricorder server listening on ${host}:${port}`);
console.log(`Scanning repos in: ${config.scanDirectory}`);

const cleanupService = container.resolve("cleanupService");
cleanupService.start();

export type { AppRouter } from "./routers";

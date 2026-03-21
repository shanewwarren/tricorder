import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { serverConfig, type ServerConfig } from "@tricorder/shared";

const BASE_DIR = join(homedir(), ".tricorder");
const CONFIG_PATH = join(BASE_DIR, "config.json");
const DB_PATH = join(BASE_DIR, "tricorder.db");

export function loadConfig(): ServerConfig {
	if (!existsSync(BASE_DIR)) {
		mkdirSync(BASE_DIR, { recursive: true });
	}
	if (!existsSync(CONFIG_PATH)) {
		const example = { scanDirectory: join(homedir(), "code"), host: "127.0.0.1" };
		writeFileSync(CONFIG_PATH, JSON.stringify(example, null, 2));
	}
	const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
	const config = serverConfig.parse(raw);

	// Env var override for port (set by scripts/dev.sh for multi-instance support)
	if (process.env.TRICORDER_PORT) {
		config.port = Number(process.env.TRICORDER_PORT);
	}

	return config;
}

export function getDbPath(): string {
	return DB_PATH;
}
export function getTricorderDir(): string {
	return BASE_DIR;
}

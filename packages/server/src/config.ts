import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { serverConfig, type ServerConfig } from "@tricorder/shared";

const TRICORDER_DIR = join(homedir(), ".tricorder");
const CONFIG_PATH = join(TRICORDER_DIR, "config.json");
const DB_PATH = join(TRICORDER_DIR, "tricorder.db");

export function loadConfig(): ServerConfig {
	if (!existsSync(TRICORDER_DIR)) {
		mkdirSync(TRICORDER_DIR, { recursive: true });
	}
	if (!existsSync(CONFIG_PATH)) {
		const example = { scanDirectory: join(homedir(), "code"), host: "127.0.0.1" };
		writeFileSync(CONFIG_PATH, JSON.stringify(example, null, 2));
	}
	const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
	return serverConfig.parse(raw);
}

export function getDbPath(): string {
	return DB_PATH;
}
export function getTricorderDir(): string {
	return TRICORDER_DIR;
}

import { readFileSync, writeFileSync, renameSync, existsSync } from "fs";
import { join } from "path";
import { getTricorderDir } from "../config";

export interface ManifestEntry {
	worktreePath: string | null;
	mode: "autonomous" | "interactive";
	repoPath: string;
	launchedAt: string;
}

export interface Manifest {
	sessions: Record<string, ManifestEntry>;
}

export class ManifestService {
	private manifestPath: string;

	constructor() {
		this.manifestPath = join(getTricorderDir(), "manifest.json");
	}

	addSession(agentSessionId: string, entry: ManifestEntry): void {
		const manifest = this.readManifest();
		manifest.sessions[agentSessionId] = entry;
		this.writeManifest(manifest);
	}

	getSession(agentSessionId: string): ManifestEntry | null {
		const manifest = this.readManifest();
		return manifest.sessions[agentSessionId] ?? null;
	}

	removeWorktree(agentSessionId: string): void {
		const manifest = this.readManifest();
		const entry = manifest.sessions[agentSessionId];
		if (entry) {
			entry.worktreePath = null;
			this.writeManifest(manifest);
		}
	}

	listTricorderSessions(): Record<string, ManifestEntry> {
		const manifest = this.readManifest();
		return manifest.sessions;
	}

	private readManifest(): Manifest {
		if (!existsSync(this.manifestPath)) {
			return { sessions: {} };
		}
		const raw = readFileSync(this.manifestPath, "utf-8");
		return JSON.parse(raw) as Manifest;
	}

	private writeManifest(manifest: Manifest): void {
		const tmpPath = this.manifestPath + ".tmp";
		writeFileSync(tmpPath, JSON.stringify(manifest, null, 2), "utf-8");
		renameSync(tmpPath, this.manifestPath);
	}
}

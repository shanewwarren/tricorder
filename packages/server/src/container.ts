import { createContainer, asClass, asValue, InjectionMode } from "awilix";
import type { ServerConfig } from "@tricorder/shared";
import { ClaudeSessionsService } from "./services/claude-sessions.service";
import { ManifestService } from "./services/manifest.service";
import { ReposService } from "./services/repos.service";
import { SessionService } from "./services/session.service";
import { AgentService } from "./services/agent.service";
import { SandboxService } from "./services/sandbox.service";
import { WorktreeService } from "./services/worktree.service";
import { UsageService } from "./services/usage.service";
import { CleanupService } from "./services/cleanup.service";

export function createAppContainer(config: ServerConfig) {
	const container = createContainer({
		injectionMode: InjectionMode.CLASSIC,
	});

	container.register({
		config: asValue(config),
		claudeSessionsService: asClass(ClaudeSessionsService).singleton(),
		manifestService: asClass(ManifestService).singleton(),
		reposService: asClass(ReposService).singleton(),
		sessionService: asClass(SessionService).singleton(),
		agentService: asClass(AgentService).singleton(),
		sandboxService: asClass(SandboxService).singleton(),
		worktreeService: asClass(WorktreeService).singleton(),
		usageService: asClass(UsageService).singleton(),
		cleanupService: asClass(CleanupService).singleton(),
	});

	return container;
}

export type AppContainer = ReturnType<typeof createAppContainer>;

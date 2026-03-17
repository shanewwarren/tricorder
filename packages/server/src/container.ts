import { createContainer, asClass, asValue, asFunction, InjectionMode } from "awilix";
import type { ServerConfig } from "@tricorder/shared";
import type { Db } from "./db";
import { SessionsRepository } from "./repositories/sessions.repo";
import { MessagesRepository } from "./repositories/messages.repo";
import { ActivityRepository } from "./repositories/activity.repo";
import { ReposRepository } from "./repositories/repos.repo";
import { SessionService } from "./services/session.service";
import { AgentService } from "./services/agent.service";
import { SandboxService } from "./services/sandbox.service";
import { WorktreeService } from "./services/worktree.service";
import { UsageService } from "./services/usage.service";

export function createAppContainer(config: ServerConfig, db: Db) {
	const container = createContainer({
		injectionMode: InjectionMode.CLASSIC,
	});

	container.register({
		config: asValue(config),
		db: asValue(db),
		sessionsRepo: asClass(SessionsRepository).singleton(),
		messagesRepo: asClass(MessagesRepository).singleton(),
		activityRepo: asClass(ActivityRepository).singleton(),
		reposRepo: asFunction(() => new ReposRepository(config.scanDirectory)).singleton(),
		sessionService: asClass(SessionService).singleton(),
		agentService: asClass(AgentService).singleton(),
		sandboxService: asClass(SandboxService).singleton(),
		worktreeService: asClass(WorktreeService).singleton(),
		usageService: asClass(UsageService).singleton(),
	});

	return container;
}

export type AppContainer = ReturnType<typeof createAppContainer>;

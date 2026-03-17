import { createContainer, asClass, asValue, asFunction, InjectionMode } from "awilix";
import type { ServerConfig } from "@tricorder/shared";
import type { Db } from "./db";
import { SessionsRepository } from "./repositories/sessions.repo";
import { MessagesRepository } from "./repositories/messages.repo";
import { ActivityRepository } from "./repositories/activity.repo";
import { ReposRepository } from "./repositories/repos.repo";

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
	});

	return container;
}

export type AppContainer = ReturnType<typeof createAppContainer>;

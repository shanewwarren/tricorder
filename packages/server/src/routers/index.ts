import { router } from "../trpc";
import { sessionsRouter } from "./sessions.router";
import { reposRouter } from "./repos.router";
import { activityRouter } from "./activity.router";
import { configRouter } from "./config.router";
import { usageRouter } from "./usage.router";
import { localSessionsRouter } from "./local-sessions.router";

export const appRouter = router({
	sessions: sessionsRouter,
	repos: reposRouter,
	activity: activityRouter,
	config: configRouter,
	usage: usageRouter,
	localSessions: localSessionsRouter,
});

export type AppRouter = typeof appRouter;

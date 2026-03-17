import { router } from "../trpc";
import { sessionsRouter } from "./sessions.router";
import { reposRouter } from "./repos.router";
import { activityRouter } from "./activity.router";
import { configRouter } from "./config.router";
import { usageRouter } from "./usage.router";

export const appRouter = router({
	sessions: sessionsRouter,
	repos: reposRouter,
	activity: activityRouter,
	config: configRouter,
	usage: usageRouter,
});

export type AppRouter = typeof appRouter;

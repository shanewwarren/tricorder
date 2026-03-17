import { z } from "zod";
import * as session from "../schemas/session";
import * as repo from "../schemas/repo";
import * as usage from "../schemas/usage";
import * as activity from "../schemas/activity";
import * as config from "../schemas/config";

export type CreateSessionInput = z.infer<typeof session.createSessionInput>;
export type SessionSummary = z.infer<typeof session.sessionSummary>;
export type SessionMessage = z.infer<typeof session.sessionMessage>;
export type SessionHandoff = z.infer<typeof session.sessionHandoff>;
export type RepoSummary = z.infer<typeof repo.repoSummary>;
export type RepoDetail = z.infer<typeof repo.repoDetail>;
export type UsageData = z.infer<typeof usage.usageData>;
export type ActivityEvent = z.infer<typeof activity.activityEvent>;
export type ServerConfig = z.infer<typeof config.serverConfig>;

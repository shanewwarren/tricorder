import { z } from "zod";
import { SESSION_STATUSES, SESSION_MODES } from "../constants";

export const createSessionInput = z.object({
	repoName: z.string(),
	branch: z.string().optional().default("main"),
	prompt: z.string().min(1),
	mode: z.enum(SESSION_MODES),
});

export const sessionStatus = z.enum(SESSION_STATUSES);

export const sessionSummary = z.object({
	id: z.string(),
	name: z.string(),
	repoName: z.string(),
	branch: z.string(),
	mode: z.enum(SESSION_MODES),
	status: sessionStatus,
	lastActivity: z.string().nullable(),
	lastError: z.string().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export const sessionMessage = z.object({
	index: z.number(),
	type: z.enum(["assistant", "tool_use", "tool_result", "result", "error", "status", "approval_request"]),
	content: z.unknown(),
	timestamp: z.string(),
});

export const sessionHandoff = z.object({
	sessionId: z.string(),
	sessionName: z.string(),
	worktreePath: z.string().nullable(),
	resumeCommand: z.string(),
});

import { z } from "zod";

export const activityEvent = z.object({
	id: z.string(),
	sessionId: z.string(),
	sessionName: z.string(),
	type: z.enum(["created", "completed", "errored", "paused", "cancelled", "approval_requested"]),
	description: z.string(),
	timestamp: z.string(),
});

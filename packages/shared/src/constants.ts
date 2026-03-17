export const SESSION_STATUSES = ["active", "paused", "completed", "cancelled", "error"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_MODES = ["autonomous", "interactive"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export const AUTONOMOUS_TOOLS = [
	"Read",
	"Write",
	"Edit",
	"Bash",
	"Glob",
	"Grep",
	"Agent",
	"WebSearch",
	"WebFetch",
] as const;

export const INTERACTIVE_TOOLS = ["Read", "Glob", "Grep"] as const;

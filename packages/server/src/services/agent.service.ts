import { randomUUID } from "crypto";
import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import type { SandboxService } from "./sandbox.service";
import type { SessionMode, ServerConfig } from "@tricorder/shared";
import { AUTONOMOUS_TOOLS, INTERACTIVE_TOOLS } from "@tricorder/shared";

export interface AgentStreamCallbacks {
	onMessage: (message: unknown) => void;
	onSessionId: (sessionId: string) => void;
	onComplete: () => void;
	onError: (error: Error) => void;
	onApprovalRequest?: (request: { toolUseId: string; toolName: string; title: string; input: Record<string, unknown> }) => Promise<boolean>;
}

export class AgentService {
	constructor(
		private sandboxService: SandboxService,
		private config: ServerConfig,
	) {}

	async startSession(opts: {
		prompt: string;
		cwd: string;
		mode: SessionMode;
		resumeSessionId?: string;
		callbacks: AgentStreamCallbacks;
		abortSignal?: AbortSignal;
	}) {
		const { prompt, cwd, mode, resumeSessionId, callbacks, abortSignal } = opts;

		const allowedTools = mode === "autonomous" ? [...AUTONOMOUS_TOOLS] : [...INTERACTIVE_TOOLS];

		const abortController = new AbortController();
		if (abortSignal) {
			abortSignal.addEventListener("abort", () => abortController.abort(), {
				once: true,
			});
		}

		const plugins =
			this.config.plugins.length > 0
				? this.config.plugins.map((p) => ({
						type: "local" as const,
						path: p,
					}))
				: undefined;

		const mcpServers = Object.keys(this.config.mcpServers).length > 0 ? this.config.mcpServers : undefined;

		const options: Options = {
			allowedTools,
			cwd,
			abortController,
			includePartialMessages: true,
			...(resumeSessionId ? { resume: resumeSessionId } : {}),
			...(plugins ? { plugins } : {}),
			...(mcpServers ? { mcpServers } : {}),
			...(mode === "interactive" && callbacks.onApprovalRequest
				? {
						canUseTool: async (toolName: string, toolInput: Record<string, unknown>) => {
							const toolUseId = randomUUID();
							const title = `${toolName}`;

							callbacks.onMessage({
								type: "approval_request",
								content: {
									toolUseId,
									toolName,
									title,
									description: toolName,
									input: toolInput,
								},
							});

							const approved = await Promise.race([
								callbacks.onApprovalRequest!({ toolUseId, toolName, title, input: toolInput }),
								new Promise<boolean>((resolve) =>
									setTimeout(() => resolve(false), 5 * 60 * 1000),
								),
							]);

							return approved
								? { behavior: "allow" as const }
								: { behavior: "deny" as const, message: "Denied from Tricorder" };
						},
					}
				: {}),
			hooks: {
				PreToolUse: [
					{
						matcher: "Read|Write|Edit|Bash",
						hooks: [this.createSandboxHook(cwd)],
					},
				],
			},
		};

		try {
			for await (const message of query({ prompt, options })) {
				if (abortSignal?.aborted) break;

				if (
					"type" in message &&
					message.type === "system" &&
					"subtype" in message &&
					message.subtype === "init" &&
					"session_id" in message &&
					typeof message.session_id === "string"
				) {
					callbacks.onSessionId(message.session_id);
				}

				callbacks.onMessage(message);
			}

			callbacks.onComplete();
		} catch (error) {
			callbacks.onError(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private createSandboxHook(worktreeRoot: string) {
		const sandboxHook = this.sandboxService.createPreToolUseHook(worktreeRoot);
		return async (
			input: { tool_name?: string; tool_input?: unknown },
			_toolUseId: string | undefined,
			_options: { signal: AbortSignal },
		) => {
			return sandboxHook(input);
		};
	}
}

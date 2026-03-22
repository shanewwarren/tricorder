import { randomUUID } from "crypto";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
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

		// Discover installed plugins from ~/.claude/plugins/cache/
		const discoveredPlugins = this.discoverPlugins();
		const configPlugins = this.config.plugins.map((p) => ({
			type: "local" as const,
			path: p,
		}));
		const plugins = [...configPlugins, ...discoveredPlugins];
		const pluginsOption = plugins.length > 0 ? plugins : undefined;

		// Merge config MCP servers with user's ~/.claude/mcp.json
		const userMcpServers = this.loadUserMcpConfig();
		const allMcpServers = { ...userMcpServers, ...this.config.mcpServers };
		const mcpServers = Object.keys(allMcpServers).length > 0 ? allMcpServers : undefined;

		const options: Options = {
			allowedTools,
			cwd,
			abortController,
			includePartialMessages: true,
			...(resumeSessionId ? { resume: resumeSessionId } : {}),
			...(pluginsOption ? { plugins: pluginsOption } : {}),
			...(mcpServers ? { mcpServers } : {}),
			...(mode === "interactive" && callbacks.onApprovalRequest
				? {
						canUseTool: async (toolName: string, toolInput: Record<string, unknown>, sdkOptions: any) => {
							const toolUseId = randomUUID();
							const detail = (toolInput.command ?? toolInput.file_path ?? toolInput.pattern ?? "") as string;
							const title = sdkOptions?.title ?? `Claude wants to use ${toolName}`;
							const description = detail ? `${title}\n${detail}` : title;

							callbacks.onMessage({
								type: "approval_request",
								content: {
									toolUseId,
									toolName,
									title,
									description,
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

	private discoverPlugins(): Array<{ type: "local"; path: string }> {
		const plugins: Array<{ type: "local"; path: string }> = [];
		const cacheDir = join(homedir(), ".claude", "plugins", "cache");
		if (!existsSync(cacheDir)) return plugins;

		try {
			for (const marketplace of readdirSync(cacheDir, { withFileTypes: true })) {
				if (!marketplace.isDirectory()) continue;
				const marketplacePath = join(cacheDir, marketplace.name);
				for (const plugin of readdirSync(marketplacePath, { withFileTypes: true })) {
					if (!plugin.isDirectory()) continue;
					const pluginPath = join(marketplacePath, plugin.name);
					// Find latest version
					const versions = readdirSync(pluginPath, { withFileTypes: true })
						.filter((d) => d.isDirectory())
						.map((d) => d.name)
						.sort()
						.reverse();
					if (versions.length > 0) {
						plugins.push({ type: "local", path: join(pluginPath, versions[0]) });
					}
				}
			}
		} catch {}

		return plugins;
	}

	private loadUserMcpConfig(): Record<string, unknown> {
		const mcpPath = join(homedir(), ".claude", "mcp.json");
		if (!existsSync(mcpPath)) return {};
		try {
			const data = JSON.parse(readFileSync(mcpPath, "utf-8"));
			return data.mcpServers ?? {};
		} catch {
			return {};
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

import { resolve, isAbsolute } from "path";

interface SandboxResult {
	allowed: boolean;
	reason?: string;
}

const DANGEROUS_PATTERNS = [
	/\brm\s+(-\w*\s+)*-rf\s+[\/~]/,
	/\bsudo\b/,
	/\bchmod\s+(-\w+\s+)*777\b/,
	/\bmkfs\b/,
	/\bdd\s+if=/,
	/:\(\)\{\s*:\|:&\s*\};:/,
];

export class SandboxService {
	checkPathContainment(worktreeRoot: string, targetPath: string): SandboxResult {
		const resolvedTarget = isAbsolute(targetPath) ? resolve(targetPath) : resolve(worktreeRoot, targetPath);
		const resolvedRoot = resolve(worktreeRoot);

		if (resolvedTarget.startsWith(resolvedRoot + "/") || resolvedTarget === resolvedRoot) {
			return { allowed: true };
		}
		return {
			allowed: false,
			reason: `Path ${targetPath} is outside worktree ${worktreeRoot}`,
		};
	}

	checkBashSafety(command: string, _worktreeRoot: string): SandboxResult {
		for (const pattern of DANGEROUS_PATTERNS) {
			if (pattern.test(command)) {
				return {
					allowed: false,
					reason: `Blocked dangerous command pattern: ${pattern}`,
				};
			}
		}
		return { allowed: true };
	}

	createPreToolUseHook(worktreeRoot: string) {
		return async (input: any) => {
			const toolName = input?.tool_name;
			const toolInput = input?.tool_input;
			if (!toolName || !toolInput) return {};

			if (["Read", "Write", "Edit"].includes(toolName) && toolInput.file_path) {
				const result = this.checkPathContainment(worktreeRoot, toolInput.file_path);
				if (!result.allowed) return { decision: "block", reason: result.reason };
			}

			if (toolName === "Bash" && toolInput.command) {
				const result = this.checkBashSafety(toolInput.command, worktreeRoot);
				if (!result.allowed) return { decision: "block", reason: result.reason };
			}

			return {};
		};
	}
}

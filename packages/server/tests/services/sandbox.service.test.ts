import { describe, test, expect } from "bun:test";
import { SandboxService } from "../../src/services/sandbox.service";

describe("SandboxService", () => {
	const sandbox = new SandboxService();

	describe("checkPathContainment", () => {
		test("allows paths inside worktree", () => {
			const result = sandbox.checkPathContainment("/tmp/wt/session-1", "/tmp/wt/session-1/src/index.ts");
			expect(result.allowed).toBe(true);
		});

		test("allows relative paths inside worktree", () => {
			const result = sandbox.checkPathContainment("/tmp/wt/session-1", "src/index.ts");
			expect(result.allowed).toBe(true);
		});

		test("blocks paths outside worktree", () => {
			const result = sandbox.checkPathContainment("/tmp/wt/session-1", "/etc/passwd");
			expect(result.allowed).toBe(false);
		});

		test("blocks parent traversal outside worktree", () => {
			const result = sandbox.checkPathContainment("/tmp/wt/session-1", "/tmp/wt/session-2/file.ts");
			expect(result.allowed).toBe(false);
		});
	});

	describe("checkBashSafety", () => {
		test("allows safe commands", () => {
			expect(sandbox.checkBashSafety("npm test", "/tmp/wt").allowed).toBe(true);
		});

		test("allows git commands", () => {
			expect(sandbox.checkBashSafety("git status", "/tmp/wt").allowed).toBe(true);
		});

		test("blocks rm -rf /", () => {
			expect(sandbox.checkBashSafety("rm -rf /", "/tmp/wt").allowed).toBe(false);
		});

		test("blocks rm -rf ~", () => {
			expect(sandbox.checkBashSafety("rm -rf ~", "/tmp/wt").allowed).toBe(false);
		});

		test("blocks sudo", () => {
			expect(sandbox.checkBashSafety("sudo apt install foo", "/tmp/wt").allowed).toBe(false);
		});

		test("blocks chmod 777", () => {
			expect(sandbox.checkBashSafety("chmod -R 777 /", "/tmp/wt").allowed).toBe(false);
		});

		test("blocks mkfs", () => {
			expect(sandbox.checkBashSafety("mkfs.ext4 /dev/sda1", "/tmp/wt").allowed).toBe(false);
		});

		test("blocks dd", () => {
			expect(sandbox.checkBashSafety("dd if=/dev/zero of=/dev/sda", "/tmp/wt").allowed).toBe(false);
		});
	});

	describe("createPreToolUseHook", () => {
		test("blocks file write outside worktree", async () => {
			const hook = sandbox.createPreToolUseHook("/tmp/wt/session-1");
			const result = await hook({
				tool_name: "Write",
				tool_input: { file_path: "/etc/passwd" },
			});
			expect(result.decision).toBe("block");
		});

		test("allows file read inside worktree", async () => {
			const hook = sandbox.createPreToolUseHook("/tmp/wt/session-1");
			const result = await hook({
				tool_name: "Read",
				tool_input: { file_path: "/tmp/wt/session-1/src/index.ts" },
			});
			expect(result.decision).toBeUndefined();
		});

		test("blocks dangerous bash command", async () => {
			const hook = sandbox.createPreToolUseHook("/tmp/wt/session-1");
			const result = await hook({
				tool_name: "Bash",
				tool_input: { command: "sudo rm -rf /" },
			});
			expect(result.decision).toBe("block");
		});
	});
});

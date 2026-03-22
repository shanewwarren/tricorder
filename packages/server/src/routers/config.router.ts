import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { router, publicProcedure } from "../trpc";

interface SkillInfo {
	name: string;
	description: string;
	source: string; // "user" | plugin name
}

function scanSkills(): SkillInfo[] {
	const claudeDir = join(homedir(), ".claude");
	const skills: SkillInfo[] = [];
	const seen = new Set<string>();

	// 1. User-installed skills: ~/.claude/skills/<name>/instructions.md
	const userSkillsDir = join(claudeDir, "skills");
	if (existsSync(userSkillsDir)) {
		try {
			for (const dir of readdirSync(userSkillsDir, { withFileTypes: true })) {
				if (!dir.isDirectory()) continue;
				const parsed = parseSkillFile(join(userSkillsDir, dir.name));
				if (parsed && !seen.has(parsed.name)) {
					seen.add(parsed.name);
					skills.push({ ...parsed, source: "user" });
				}
			}
		} catch {}
	}

	// 2. Plugin-provided skills: ~/.claude/plugins/cache/<plugin>/<version>/skills/<name>/
	const pluginCacheDir = join(claudeDir, "plugins", "cache");
	if (existsSync(pluginCacheDir)) {
		try {
			for (const pluginDir of readdirSync(pluginCacheDir, { withFileTypes: true })) {
				if (!pluginDir.isDirectory()) continue;
				const pluginPath = join(pluginCacheDir, pluginDir.name);
				// Find latest version
				const versions = readdirSync(pluginPath, { withFileTypes: true })
					.filter((d) => d.isDirectory())
					.map((d) => d.name)
					.sort()
					.reverse();
				if (versions.length === 0) continue;
				const latestPath = join(pluginPath, versions[0]);

				// Check for skills subdirectory
				for (const subDir of readdirSync(latestPath, { withFileTypes: true })) {
					if (!subDir.isDirectory()) continue;
					const skillsDir = join(latestPath, subDir.name, "skills");
					if (existsSync(skillsDir)) {
						try {
							for (const skillDir of readdirSync(skillsDir, { withFileTypes: true })) {
								if (!skillDir.isDirectory()) continue;
								const parsed = parseSkillFile(join(skillsDir, skillDir.name));
								const qualifiedName = `${subDir.name}:${parsed?.name || skillDir.name}`;
								if (parsed && !seen.has(qualifiedName)) {
									seen.add(qualifiedName);
									skills.push({ name: qualifiedName, description: parsed.description, source: subDir.name });
								}
							}
						} catch {}
					}
				}
			}
		} catch {}
	}

	return skills;
}

function parseSkillFile(dir: string): { name: string; description: string } | null {
	// Try instructions.md first, then SKILL.md
	for (const filename of ["instructions.md", "SKILL.md"]) {
		const filePath = join(dir, filename);
		if (!existsSync(filePath)) continue;
		try {
			const content = readFileSync(filePath, "utf-8");
			const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
			if (!match) continue;
			const frontmatter = match[1];
			const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.replace(/['"]/g, "").trim();
			const desc = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.replace(/['"]/g, "").trim();
			if (name) return { name, description: desc || "" };
		} catch {}
	}
	return null;
}

export const configRouter = router({
	get: publicProcedure.query(({ ctx }) => {
		return ctx.container.resolve("config");
	}),

	skills: publicProcedure.query(() => {
		return scanSkills();
	}),
});

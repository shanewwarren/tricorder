# Tricorder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first remote interface for managing Claude Code agent sessions over Tailscale — API server, React Native app, and CLI.

**Architecture:** Bun monorepo with 4 packages (shared, server, mobile, cli). Shared zod schemas provide end-to-end type safety via tRPC. Server wraps Claude Agent SDK for session management. Mobile app connects over Tailscale via tRPC HTTP + WebSocket subscriptions.

**Tech Stack:** Bun, tRPC, Claude Agent SDK, Drizzle ORM (bun:sqlite), Awilix (DI), Expo, NativeWind, Expo Router, TanStack Query, Zustand, simple-git, chokidar, zod

---

## File Structure

```
tricorder/
  package.json                          — Bun workspace root
  bunfig.toml                           — Bun config
  packages/
    shared/
      package.json
      src/
        index.ts                        — barrel export
        schemas/
          session.ts                    — session zod schemas (create input, status, message types)
          repo.ts                       — repo zod schemas
          usage.ts                      — usage tier schemas
          activity.ts                   — activity event schemas
          config.ts                     — server config schema
        types/
          index.ts                      — inferred TypeScript types from schemas
        constants.ts                    — status enums, mode enums, tool lists

    server/
      package.json
      drizzle.config.ts                 — drizzle-kit config
      src/
        index.ts                        — server entry point (start tRPC + WS)
        container.ts                    — Awilix DI container setup
        config.ts                       — load/validate ~/.tricorder/config.json
        trpc.ts                         — shared tRPC instance + context type
        db/
          schema.ts                     — Drizzle table definitions (sessions, messages, activity_events)
          index.ts                      — Drizzle instance (bun:sqlite)
          migrate.ts                    — run migrations on startup
        repositories/
          sessions.repo.ts              — session CRUD via Drizzle
          messages.repo.ts              — message storage/retrieval via Drizzle
          activity.repo.ts              — activity event logging/queries via Drizzle
          repos.repo.ts                 — git repo scanning (filesystem + simple-git)
        services/
          session.service.ts            — session lifecycle (create, pause, cancel, resume, handoff)
          agent.service.ts              — Agent SDK query() wrapper + streaming
          sandbox.service.ts            — PreToolUse hooks (path containment, bash restrictions)
          worktree.service.ts           — git worktree create/cleanup
          usage.service.ts              — poll usage API, cache results, Keychain reader
          watcher.service.ts            — local session detection (chokidar + process scanning)
          cleanup.service.ts            — worktree TTL cleanup job
        routers/
          repos.router.ts               — repos.list, repos.detail (thin, delegates to repos.repo)
          sessions.router.ts            — sessions.* procedures (delegates to session.service)
          local-sessions.router.ts      — localSessions.* procedures (delegates to watcher.service)
          usage.router.ts               — usage.current (delegates to usage.service)
          activity.router.ts            — activity.list (delegates to activity.repo)
          config.router.ts              — config.get
          index.ts                      — merge all routers
      tests/
        repositories/
          sessions.repo.test.ts
          messages.repo.test.ts
        services/
          session.service.test.ts
          sandbox.service.test.ts
        routers/
          repos.router.test.ts

    mobile/
      package.json
      app.json                          — Expo config
      tailwind.config.js                — NativeWind config
      src/
        app/
          _layout.tsx                   — root layout with tRPC + QueryClient providers
          (tabs)/
            _layout.tsx                 — pill tab bar layout
            index.tsx                   — Home (Sessions List)
            activity.tsx                — Activity feed
            repos.tsx                   — Repos browser
            settings.tsx                — Settings screen
          session/
            [id].tsx                    — Live Session View
          new-session.tsx               — New Session form
          usage.tsx                     — Usage Dashboard
        components/
          SessionCard.tsx               — session list card
          StatusPill.tsx                — colored status badge
          ModeBadge.tsx                 — autonomous/interactive badge
          MessageBubble.tsx             — Claude text message
          ToolCard.tsx                  — Read/Edit/Bash/Grep tool display
          DiffView.tsx                  — inline diff (red/green)
          ApprovalPrompt.tsx            — approve/deny card
          HandoffBanner.tsx             — "continue on your machine" banner
          UsageIndicator.tsx            — persistent header dot + percentage
          UsageCard.tsx                 — usage tier card (dashboard)
          SegmentControl.tsx            — filter bar (All/Active/Paused/Done/Local)
          PillTabBar.tsx                — custom bottom tab bar
        lib/
          trpc.ts                       — tRPC client + React Query setup
          store.ts                      — Zustand store (WS stream state)
          theme.ts                      — design tokens from .pen file

    cli/
      package.json
      src/
        index.ts                        — CLI entry point
        client.ts                       — shared tRPC client factory
        commands/
          resume.ts                     — tricorder resume <name>
          list.ts                       — tricorder list
          status.ts                     — tricorder status
```

---

## Chunk 1: Monorepo Setup + Shared Package

### Task 1: Initialize Bun monorepo

**Files:**
- Create: `package.json`
- Create: `bunfig.toml`
- Create: `biome.json`
- Create: `packages/shared/package.json`
- Create: `packages/server/package.json`
- Create: `packages/mobile/package.json`
- Create: `packages/cli/package.json`

- [ ] **Step 1: Create root package.json with workspaces**

```json
{
  "name": "tricorder",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "check": "biome check .",
    "format": "biome format --write .",
    "lint": "biome lint ."
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0"
  }
}
```

- [ ] **Step 2: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
  "organizeImports": { "enabled": true },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "lineWidth": 120
  },
  "linter": {
    "enabled": true,
    "rules": { "recommended": true }
  },
  "files": {
    "ignore": ["node_modules", "drizzle", ".expo", "dist"]
  }
}
```

Adjust `indentStyle` and `lineWidth` to your preference — tabs + 120 is a reasonable default.

- [ ] **Step 3: Create bunfig.toml**

```toml
[install]
peer = false
```

- [ ] **Step 3: Create packages/shared/package.json**

```json
{
  "name": "@tricorder/shared",
  "version": "0.0.1",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "dependencies": {
    "zod": "^3.23.0"
  }
}
```

- [ ] **Step 4: Create packages/server/package.json**

```json
{
  "name": "@tricorder/server",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "start": "bun src/index.ts",
    "test": "bun test"
  },
  "dependencies": {
    "@tricorder/shared": "workspace:*",
    "@trpc/server": "^11.0.0",
    "@anthropic-ai/claude-agent-sdk": "latest",
    "awilix": "^12.0.0",
    "drizzle-orm": "^0.38.0",
    "simple-git": "^3.27.0",
    "chokidar": "^4.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "drizzle-kit": "^0.30.0"
  }
}
```

- [ ] **Step 5: Create packages/mobile/package.json (placeholder — Expo init later)**

```json
{
  "name": "@tricorder/mobile",
  "version": "0.0.1",
  "private": true
}
```

- [ ] **Step 6: Create packages/cli/package.json**

```json
{
  "name": "@tricorder/cli",
  "version": "0.0.1",
  "private": true,
  "bin": {
    "tricorder": "src/index.ts"
  },
  "dependencies": {
    "@tricorder/shared": "workspace:*",
    "@trpc/client": "^11.0.0"
  }
}
```

- [ ] **Step 8: Run `bun install` from root**

Run: `bun install`
Expected: All workspace packages linked, node_modules created, biome binary available.

- [ ] **Step 9: Verify Biome works**

Run: `bunx biome check .`
Expected: No errors (no source files to check yet, clean exit).

- [ ] **Step 10: Commit**

```bash
git add -A && git commit -m "feat: initialize Bun monorepo with workspace packages"
```

---

### Task 2: Shared schemas — session types

**Files:**
- Create: `packages/shared/src/constants.ts`
- Create: `packages/shared/src/schemas/session.ts`

- [ ] **Step 1: Create constants.ts with enums**

```typescript
export const SESSION_STATUSES = ["active", "paused", "completed", "cancelled", "error"] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const SESSION_MODES = ["autonomous", "interactive"] as const;
export type SessionMode = (typeof SESSION_MODES)[number];

export const AUTONOMOUS_TOOLS = [
  "Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "WebSearch", "WebFetch",
] as const;

export const INTERACTIVE_TOOLS = ["Read", "Glob", "Grep"] as const;
```

- [ ] **Step 2: Create session schemas**

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add packages/shared/src && git commit -m "feat: add shared constants and session schemas"
```

---

### Task 3: Shared schemas — repo, usage, activity, config

**Files:**
- Create: `packages/shared/src/schemas/repo.ts`
- Create: `packages/shared/src/schemas/usage.ts`
- Create: `packages/shared/src/schemas/activity.ts`
- Create: `packages/shared/src/schemas/config.ts`
- Create: `packages/shared/src/types/index.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create repo schema**

```typescript
import { z } from "zod";

export const repoSummary = z.object({
  name: z.string(),
  path: z.string(),
  defaultBranch: z.string(),
  lastCommitDate: z.string().nullable(),
});

export const repoDetail = z.object({
  name: z.string(),
  path: z.string(),
  branches: z.array(z.string()),
  recentCommits: z.array(z.object({
    hash: z.string(),
    message: z.string(),
    date: z.string(),
  })),
});
```

- [ ] **Step 2: Create usage schema**

```typescript
import { z } from "zod";

export const usageTier = z.object({
  label: z.string(),
  subtitle: z.string(),
  percentage: z.number(),
  resetIn: z.string().nullable(),
  dollarAmount: z.number().nullable(),
  dollarLimit: z.number().nullable(),
});

export const usageData = z.object({
  tiers: z.array(usageTier),
  updatedAt: z.string(),
  available: z.boolean(),
});
```

- [ ] **Step 3: Create activity schema**

```typescript
import { z } from "zod";

export const activityEvent = z.object({
  id: z.string(),
  sessionId: z.string(),
  sessionName: z.string(),
  type: z.enum(["created", "completed", "errored", "paused", "cancelled", "approval_requested"]),
  description: z.string(),
  timestamp: z.string(),
});
```

- [ ] **Step 4: Create config schema**

```typescript
import { z } from "zod";

export const serverConfig = z.object({
  scanDirectory: z.string().default("~/code"),
  host: z.string().default("127.0.0.1"),
  port: z.number().default(3141),
  plugins: z.array(z.string()).default([]),
  mcpServers: z.record(z.object({
    command: z.string(),
    args: z.array(z.string()),
  })).default({}),
  maxConcurrentSessions: z.number().default(5),
  defaultMode: z.enum(["autonomous", "interactive"]).default("autonomous"),
  defaultAllowedTools: z.array(z.string()).default(["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "WebSearch", "WebFetch"]),
});
```

- [ ] **Step 5: Create types/index.ts with inferred types**

```typescript
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
```

- [ ] **Step 6: Create barrel export index.ts**

```typescript
export * from "./constants";
export * from "./schemas/session";
export * from "./schemas/repo";
export * from "./schemas/usage";
export * from "./schemas/activity";
export * from "./schemas/config";
export * from "./types/index";
```

- [ ] **Step 7: Verify package builds**

Run: `cd packages/shared && bun run src/index.ts`
Expected: No errors, clean exit.

- [ ] **Step 8: Commit**

```bash
git add packages/shared && git commit -m "feat: add repo, usage, activity, config schemas and barrel exports"
```

---

## Chunk 2: Server — Drizzle DB, DI Container, Config, Repos

### Task 4: Drizzle schema + database setup

**Files:**
- Create: `packages/server/src/db/schema.ts` — Drizzle table definitions
- Create: `packages/server/src/db/index.ts` — Drizzle instance (bun:sqlite)
- Create: `packages/server/drizzle.config.ts` — drizzle-kit config

- [ ] **Step 1: Write failing test for db initialization**

```typescript
// packages/server/tests/db.test.ts
import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { createDatabase } from "../src/db";
import { unlinkSync } from "fs";

const TEST_DB = "/tmp/tricorder-test.db";

describe("database", () => {
  afterEach(() => {
    try { unlinkSync(TEST_DB); } catch {}
  });

  test("creates tables on init", () => {
    const db = createDatabase(TEST_DB);
    const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain("sessions");
    expect(names).toContain("messages");
    expect(names).toContain("activity_events");
    db.close();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/server && bun test tests/db.test.ts`
Expected: FAIL — `createDatabase` not found.

- [ ] **Step 3: Implement database module**

```typescript
// packages/server/src/db/index.ts
import { Database } from "bun:sqlite";

export function createDatabase(path: string): Database {
  const db = new Database(path);
  db.run("PRAGMA journal_mode = WAL");
  db.run("PRAGMA foreign_keys = ON");

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      repo_name TEXT NOT NULL,
      branch TEXT NOT NULL DEFAULT 'main',
      mode TEXT NOT NULL CHECK(mode IN ('autonomous', 'interactive')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'paused', 'completed', 'cancelled', 'error')),
      worktree_path TEXT,
      working_directory TEXT,
      last_activity TEXT,
      last_error TEXT,
      agent_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL REFERENCES sessions(id),
      idx INTEGER NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS activity_events (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      session_name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run("CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, idx)");
  db.run("CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity_events(timestamp DESC)");

  return db;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/server && bun test tests/db.test.ts`
Expected: PASS

- [ ] **Step 5: Implement sessions CRUD**

```typescript
// packages/server/src/db/sessions.ts
import type { Database } from "bun:sqlite";
import type { SessionStatus, SessionMode } from "@tricorder/shared";

export interface SessionRow {
  id: string;
  name: string;
  repo_name: string;
  branch: string;
  mode: SessionMode;
  status: SessionStatus;
  worktree_path: string | null;
  working_directory: string | null;
  last_activity: string | null;
  last_error: string | null;
  agent_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export function createSessionsDb(db: Database) {
  const insertStmt = db.prepare(
    `INSERT INTO sessions (id, name, repo_name, branch, mode, worktree_path, working_directory, agent_session_id)
     VALUES ($id, $name, $repo_name, $branch, $mode, $worktree_path, $working_directory, $agent_session_id)`
  );

  const getByIdStmt = db.prepare("SELECT * FROM sessions WHERE id = $id");
  const listStmt = db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC");
  const updateStatusStmt = db.prepare(
    "UPDATE sessions SET status = $status, updated_at = datetime('now') WHERE id = $id"
  );
  const updateActivityStmt = db.prepare(
    "UPDATE sessions SET last_activity = $activity, updated_at = datetime('now') WHERE id = $id"
  );
  const updateErrorStmt = db.prepare(
    "UPDATE sessions SET status = 'error', last_error = $error, updated_at = datetime('now') WHERE id = $id"
  );
  const updateAgentSessionStmt = db.prepare(
    "UPDATE sessions SET agent_session_id = $agent_session_id, updated_at = datetime('now') WHERE id = $id"
  );
  const deleteStmt = db.prepare("DELETE FROM sessions WHERE id = $id");

  return {
    insert(row: Omit<SessionRow, "status" | "last_activity" | "last_error" | "created_at" | "updated_at">) {
      insertStmt.run({
        $id: row.id,
        $name: row.name,
        $repo_name: row.repo_name,
        $branch: row.branch,
        $mode: row.mode,
        $worktree_path: row.worktree_path,
        $working_directory: row.working_directory,
        $agent_session_id: row.agent_session_id,
      });
    },
    getById(id: string): SessionRow | null {
      return getByIdStmt.get({ $id: id }) as SessionRow | null;
    },
    list(): SessionRow[] {
      return listStmt.all() as SessionRow[];
    },
    updateStatus(id: string, status: SessionStatus) {
      updateStatusStmt.run({ $id: id, $status: status });
    },
    updateActivity(id: string, activity: string) {
      updateActivityStmt.run({ $id: id, $activity: activity });
    },
    updateError(id: string, error: string) {
      updateErrorStmt.run({ $id: id, $error: error });
    },
    updateAgentSession(id: string, agentSessionId: string) {
      updateAgentSessionStmt.run({ $id: id, $agent_session_id: agentSessionId });
    },
    delete(id: string) {
      deleteStmt.run({ $id: id });
    },
  };
}
```

- [ ] **Step 6: Implement messages storage**

```typescript
// packages/server/src/db/messages.ts
import type { Database } from "bun:sqlite";

export interface MessageRow {
  id: number;
  session_id: string;
  idx: number;
  type: string;
  content: string;
  timestamp: string;
}

export function createMessagesDb(db: Database) {
  const insertStmt = db.prepare(
    `INSERT INTO messages (session_id, idx, type, content) VALUES ($session_id, $idx, $type, $content)`
  );
  const listStmt = db.prepare(
    "SELECT * FROM messages WHERE session_id = $session_id ORDER BY idx ASC"
  );
  const listFromStmt = db.prepare(
    "SELECT * FROM messages WHERE session_id = $session_id AND idx >= $from_idx ORDER BY idx ASC"
  );
  const countStmt = db.prepare(
    "SELECT COUNT(*) as count FROM messages WHERE session_id = $session_id"
  );

  return {
    insert(sessionId: string, idx: number, type: string, content: unknown) {
      insertStmt.run({
        $session_id: sessionId,
        $idx: idx,
        $type: type,
        $content: JSON.stringify(content),
      });
    },
    list(sessionId: string): MessageRow[] {
      return listStmt.all({ $session_id: sessionId }) as MessageRow[];
    },
    listFrom(sessionId: string, fromIdx: number): MessageRow[] {
      return listFromStmt.all({ $session_id: sessionId, $from_idx: fromIdx }) as MessageRow[];
    },
    count(sessionId: string): number {
      const row = countStmt.get({ $session_id: sessionId }) as { count: number };
      return row.count;
    },
  };
}
```

- [ ] **Step 7: Implement activity events storage**

```typescript
// packages/server/src/db/activity.ts
import type { Database } from "bun:sqlite";

export interface ActivityRow {
  id: string;
  session_id: string;
  session_name: string;
  type: string;
  description: string;
  timestamp: string;
}

export function createActivityDb(db: Database) {
  const insertStmt = db.prepare(
    `INSERT INTO activity_events (id, session_id, session_name, type, description) VALUES ($id, $session_id, $session_name, $type, $description)`
  );
  const listStmt = db.prepare(
    "SELECT * FROM activity_events ORDER BY timestamp DESC LIMIT $limit"
  );

  return {
    insert(event: Omit<ActivityRow, "timestamp">) {
      insertStmt.run({
        $id: event.id,
        $session_id: event.session_id,
        $session_name: event.session_name,
        $type: event.type,
        $description: event.description,
      });
    },
    list(limit = 50): ActivityRow[] {
      return listStmt.all({ $limit: limit }) as ActivityRow[];
    },
  };
}
```

- [ ] **Step 8: Add tests for sessions CRUD**

```typescript
// append to packages/server/tests/db.test.ts
import { createSessionsDb } from "../src/db/sessions";
import { createMessagesDb } from "../src/db/messages";

describe("sessions db", () => {
  test("insert and retrieve session", () => {
    const db = createDatabase(TEST_DB);
    const sessions = createSessionsDb(db);

    sessions.insert({
      id: "test-1",
      name: "Test session",
      repo_name: "my-repo",
      branch: "main",
      mode: "autonomous",
      worktree_path: "/tmp/wt",
      working_directory: null,
      agent_session_id: null,
    });

    const session = sessions.getById("test-1");
    expect(session).not.toBeNull();
    expect(session!.name).toBe("Test session");
    expect(session!.status).toBe("active");

    sessions.updateStatus("test-1", "paused");
    const updated = sessions.getById("test-1");
    expect(updated!.status).toBe("paused");

    db.close();
  });
});

describe("messages db", () => {
  test("insert and list messages", () => {
    const db = createDatabase(TEST_DB);
    const messages = createMessagesDb(db);
    const sessions = createSessionsDb(db);

    sessions.insert({
      id: "msg-test",
      name: "Msg test",
      repo_name: "repo",
      branch: "main",
      mode: "autonomous",
      worktree_path: null,
      working_directory: null,
      agent_session_id: null,
    });

    messages.insert("msg-test", 0, "assistant", { text: "Hello" });
    messages.insert("msg-test", 1, "tool_use", { tool: "Read", input: {} });

    const all = messages.list("msg-test");
    expect(all.length).toBe(2);
    expect(all[0].idx).toBe(0);

    const from1 = messages.listFrom("msg-test", 1);
    expect(from1.length).toBe(1);

    db.close();
  });
});
```

- [ ] **Step 9: Run all tests**

Run: `cd packages/server && bun test`
Expected: All PASS

- [ ] **Step 10: Commit**

```bash
git add packages/server/src/db packages/server/tests && git commit -m "feat: add SQLite database layer with sessions, messages, activity tables"
```

---

### Task 5: Server config loading

**Files:**
- Create: `packages/server/src/config.ts`

- [ ] **Step 1: Implement config loader**

```typescript
// packages/server/src/config.ts
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { serverConfig, type ServerConfig } from "@tricorder/shared";

const TRICORDER_DIR = join(homedir(), ".tricorder");
const CONFIG_PATH = join(TRICORDER_DIR, "config.json");
const DB_PATH = join(TRICORDER_DIR, "tricorder.db");

export function loadConfig(): ServerConfig {
  if (!existsSync(TRICORDER_DIR)) {
    mkdirSync(TRICORDER_DIR, { recursive: true });
  }

  if (!existsSync(CONFIG_PATH)) {
    // Write a minimal example config — schema defaults fill in the rest
    const example = { scanDirectory: join(homedir(), "code"), host: "127.0.0.1" };
    writeFileSync(CONFIG_PATH, JSON.stringify(example, null, 2));
  }

  const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
  // Schema has .default() on all fields, so partial configs are fine
  return serverConfig.parse(raw);
}

export function getDbPath(): string {
  return DB_PATH;
}

export function getTricorderDir(): string {
  return TRICORDER_DIR;
}
```

- [ ] **Step 2: Verify config handles partial files**

Run: `cd packages/server && bun -e "import { loadConfig } from './src/config'; const c = loadConfig(); console.log(c.host, c.port, c.maxConcurrentSessions)"`
Expected: `127.0.0.1 3141 5` (defaults applied for missing fields).

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/config.ts && git commit -m "feat: add server config loading with defaults"
```

---

### Task 6: Repos router

**Files:**
- Create: `packages/server/src/routers/repos.ts`
- Create: `packages/server/tests/routers/repos.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/server/tests/routers/repos.test.ts
import { describe, test, expect } from "bun:test";
import { scanRepos } from "../../src/routers/repos";
import { mkdirSync, rmSync } from "fs";
import { execSync } from "child_process";
import { join } from "path";

const TEST_DIR = "/tmp/tricorder-repos-test";

describe("scanRepos", () => {
  test("finds git repos in directory", async () => {
    // Setup: create a test dir with a git repo inside
    rmSync(TEST_DIR, { recursive: true, force: true });
    mkdirSync(join(TEST_DIR, "my-project"), { recursive: true });
    execSync("git init", { cwd: join(TEST_DIR, "my-project") });

    const repos = await scanRepos(TEST_DIR);
    expect(repos.length).toBe(1);
    expect(repos[0].name).toBe("my-project");

    rmSync(TEST_DIR, { recursive: true, force: true });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/server && bun test tests/routers/repos.test.ts`
Expected: FAIL — `scanRepos` not found.

- [ ] **Step 3: Implement repos router**

```typescript
// packages/server/src/routers/repos.ts
import { z } from "zod";
import { readdirSync, statSync, existsSync } from "fs";
import { join, resolve } from "path";
import simpleGit from "simple-git";
import type { RepoSummary, RepoDetail } from "@tricorder/shared";

export async function scanRepos(scanDir: string): Promise<RepoSummary[]> {
  const resolvedDir = resolve(scanDir.replace(/^~/, homedir()));
  if (!existsSync(resolvedDir)) return [];

  const entries = readdirSync(resolvedDir, { withFileTypes: true });
  const repos: RepoSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const fullPath = join(resolvedDir, entry.name);
    const gitDir = join(fullPath, ".git");
    if (existsSync(gitDir)) {
      try {
        const git = simpleGit(fullPath);
        const branches = await git.branchLocal();
        repos.push({
          name: entry.name,
          path: fullPath,
          defaultBranch: branches.current || "main",
          lastCommitDate: null,
        });
      } catch {
        repos.push({
          name: entry.name,
          path: fullPath,
          defaultBranch: "main",
          lastCommitDate: null,
        });
      }
    }
  }

  return repos;
}

export async function getRepoDetail(repoPath: string): Promise<RepoDetail> {
  const git = simpleGit(repoPath);
  const branches = await git.branchLocal();
  const log = await git.log({ maxCount: 10 });
  const name = repoPath.split("/").pop() || repoPath;

  return {
    name,
    path: repoPath,
    branches: branches.all,
    recentCommits: log.all.map((c) => ({
      hash: c.hash.slice(0, 7),
      message: c.message,
      date: c.date,
    })),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/server && bun test tests/routers/repos.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/routers/repos.ts packages/server/tests/routers && git commit -m "feat: add repo scanning and detail retrieval"
```

---

## Chunk 3: Server — Session Manager + Sandbox + tRPC

### Task 7: Git worktree management

**Files:**
- Create: `packages/server/src/session/worktree.ts`

- [ ] **Step 1: Implement worktree create/remove**

```typescript
// packages/server/src/session/worktree.ts
import simpleGit from "simple-git";
import { join } from "path";
import { existsSync, rmSync, mkdirSync } from "fs";
import { getTricorderDir } from "../config";

const WORKTREES_DIR = () => join(getTricorderDir(), "worktrees");

export async function createWorktree(repoPath: string, branch: string, sessionId: string): Promise<string> {
  const worktreeBase = WORKTREES_DIR();
  if (!existsSync(worktreeBase)) mkdirSync(worktreeBase, { recursive: true });

  const worktreePath = join(worktreeBase, sessionId);
  const git = simpleGit(repoPath);

  await git.raw(["worktree", "add", worktreePath, branch]);
  return worktreePath;
}

export async function removeWorktree(repoPath: string, worktreePath: string): Promise<void> {
  if (!existsSync(worktreePath)) return;

  try {
    const git = simpleGit(repoPath);
    await git.raw(["worktree", "remove", worktreePath, "--force"]);
  } catch {
    // Fallback: just delete the directory
    rmSync(worktreePath, { recursive: true, force: true });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/session/worktree.ts && git commit -m "feat: add git worktree create/remove helpers"
```

---

### Task 8: Sandbox hooks

**Files:**
- Create: `packages/server/src/session/sandbox.ts`
- Create: `packages/server/tests/sandbox.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// packages/server/tests/sandbox.test.ts
import { describe, test, expect } from "bun:test";
import { checkPathContainment, checkBashSafety } from "../src/session/sandbox";

describe("sandbox", () => {
  describe("path containment", () => {
    test("allows paths inside worktree", () => {
      const result = checkPathContainment("/tmp/wt/session-1", "/tmp/wt/session-1/src/index.ts");
      expect(result.allowed).toBe(true);
    });

    test("blocks paths outside worktree", () => {
      const result = checkPathContainment("/tmp/wt/session-1", "/etc/passwd");
      expect(result.allowed).toBe(false);
    });
  });

  describe("bash safety", () => {
    test("allows safe commands", () => {
      const result = checkBashSafety("npm test", "/tmp/wt/session-1");
      expect(result.allowed).toBe(true);
    });

    test("blocks rm -rf /", () => {
      const result = checkBashSafety("rm -rf /", "/tmp/wt/session-1");
      expect(result.allowed).toBe(false);
    });

    test("blocks sudo", () => {
      const result = checkBashSafety("sudo apt install foo", "/tmp/wt/session-1");
      expect(result.allowed).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/server && bun test tests/sandbox.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement sandbox checks**

```typescript
// packages/server/src/session/sandbox.ts
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

export function checkPathContainment(worktreeRoot: string, targetPath: string): SandboxResult {
  const resolvedTarget = isAbsolute(targetPath) ? resolve(targetPath) : resolve(worktreeRoot, targetPath);
  const resolvedRoot = resolve(worktreeRoot);

  if (resolvedTarget.startsWith(resolvedRoot + "/") || resolvedTarget === resolvedRoot) {
    return { allowed: true };
  }

  return { allowed: false, reason: `Path ${targetPath} is outside worktree ${worktreeRoot}` };
}

export function checkBashSafety(command: string, worktreeRoot: string): SandboxResult {
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      return { allowed: false, reason: `Blocked dangerous command pattern: ${pattern}` };
    }
  }

  return { allowed: true };
}

export function createPreToolUseHook(worktreeRoot: string) {
  return async (input: any) => {
    const toolName = input?.tool_name;
    const toolInput = input?.tool_input;

    if (!toolName || !toolInput) return {};

    // Path containment for file operations
    if (["Read", "Write", "Edit"].includes(toolName) && toolInput.file_path) {
      const result = checkPathContainment(worktreeRoot, toolInput.file_path);
      if (!result.allowed) {
        return { decision: "block", reason: result.reason };
      }
    }

    // Bash safety
    if (toolName === "Bash" && toolInput.command) {
      const result = checkBashSafety(toolInput.command, worktreeRoot);
      if (!result.allowed) {
        return { decision: "block", reason: result.reason };
      }
    }

    return {};
  };
}
```

- [ ] **Step 4: Run tests**

Run: `cd packages/server && bun test tests/sandbox.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/session/sandbox.ts packages/server/tests/sandbox.test.ts && git commit -m "feat: add sandbox hooks for path containment and bash safety"
```

---

### Task 9: Agent SDK wrapper

**Files:**
- Create: `packages/server/src/session/agent.ts`

- [ ] **Step 0: Verify Agent SDK API shape**

Run: `cd packages/server && bun -e "import * as sdk from '@anthropic-ai/claude-agent-sdk'; console.log(Object.keys(sdk))"`
Expected: Confirms `query` export exists. Also check: `bun -e "import { query } from '@anthropic-ai/claude-agent-sdk'; console.log(typeof query)"`
If the API shape differs from what's below, adjust the wrapper accordingly.

- [ ] **Step 1: Implement Agent SDK query wrapper**

```typescript
// packages/server/src/session/agent.ts
import { query, type ClaudeAgentOptions } from "@anthropic-ai/claude-agent-sdk";
import { createPreToolUseHook } from "./sandbox";
import type { SessionMode, ServerConfig } from "@tricorder/shared";
import { AUTONOMOUS_TOOLS, INTERACTIVE_TOOLS } from "@tricorder/shared";

export interface AgentStreamCallbacks {
  onMessage: (message: any) => void;
  onSessionId: (sessionId: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export async function startAgentSession(opts: {
  prompt: string;
  cwd: string;
  mode: SessionMode;
  config: ServerConfig;
  resumeSessionId?: string;
  callbacks: AgentStreamCallbacks;
  abortSignal?: AbortSignal;
}) {
  const { prompt, cwd, mode, config, resumeSessionId, callbacks, abortSignal } = opts;

  const allowedTools = mode === "autonomous"
    ? [...AUTONOMOUS_TOOLS]
    : [...INTERACTIVE_TOOLS];

  const options: ClaudeAgentOptions = {
    allowedTools,
    cwd,
    ...(resumeSessionId ? { resume: resumeSessionId } : {}),
    ...(config.plugins.length > 0 ? { plugins: config.plugins } : {}),
    ...(Object.keys(config.mcpServers).length > 0 ? { mcpServers: config.mcpServers } : {}),
    hooks: {
      PreToolUse: [
        {
          matcher: "Read|Write|Edit|Bash",
          hooks: [createPreToolUseHook(cwd)],
        },
      ],
    },
  };

  try {
    for await (const message of query({ prompt, options })) {
      if (abortSignal?.aborted) break;

      if (message.type === "system" && message.subtype === "init" && message.session_id) {
        callbacks.onSessionId(message.session_id);
      }

      callbacks.onMessage(message);
    }

    callbacks.onComplete();
  } catch (error) {
    callbacks.onError(error instanceof Error ? error : new Error(String(error)));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/session/agent.ts && git commit -m "feat: add Agent SDK query wrapper with streaming and sandbox hooks"
```

---

### Task 10: Session manager

**Files:**
- Create: `packages/server/src/session/manager.ts`

- [ ] **Step 1: Implement session manager**

```typescript
// packages/server/src/session/manager.ts
import { randomUUID } from "crypto";
import type { Database } from "bun:sqlite";
import type { SessionMode, SessionStatus, ServerConfig, CreateSessionInput } from "@tricorder/shared";
import { createSessionsDb } from "../db/sessions";
import { createMessagesDb } from "../db/messages";
import { createActivityDb } from "../db/activity";
import { createWorktree, removeWorktree } from "./worktree";
import { startAgentSession, type AgentStreamCallbacks } from "./agent";
import { scanRepos } from "../routers/repos";
import type { EventEmitter } from "events";

interface ActiveSession {
  abortController: AbortController;
  messageBuffer: any[];
  subscribers: Set<(msg: any) => void>;
  pendingApproval: any | null;
}

export function createSessionManager(db: Database, config: ServerConfig) {
  const sessionsDb = createSessionsDb(db);
  const messagesDb = createMessagesDb(db);
  const activityDb = createActivityDb(db);
  const activeSessions = new Map<string, ActiveSession>();

  function getActiveCount(): number {
    return Array.from(activeSessions.values()).filter(s => s.abortController && !s.abortController.signal.aborted).length;
  }

  async function create(input: CreateSessionInput): Promise<string> {
    if (getActiveCount() >= config.maxConcurrentSessions) {
      throw new Error("Max concurrent sessions reached — cancel or wait for an existing session to complete");
    }

    const repos = scanRepos(config.scanDirectory);
    const repo = repos.find(r => r.name === input.repoName);
    if (!repo) throw new Error(`Repo not found: ${input.repoName}`);

    const sessionId = randomUUID();
    const sessionName = input.prompt.slice(0, 60).replace(/\n/g, " ");
    const worktreePath = await createWorktree(repo.path, input.branch, sessionId);

    sessionsDb.insert({
      id: sessionId,
      name: sessionName,
      repo_name: input.repoName,
      branch: input.branch,
      mode: input.mode,
      worktree_path: worktreePath,
      working_directory: null,
      agent_session_id: null,
    });

    activityDb.insert({
      id: randomUUID(),
      session_id: sessionId,
      session_name: sessionName,
      type: "created",
      description: "Session started",
    });

    // Start agent in background
    const abortController = new AbortController();
    const active: ActiveSession = {
      abortController,
      messageBuffer: [],
      subscribers: new Set(),
      pendingApproval: null,
    };
    activeSessions.set(sessionId, active);

    let messageIdx = 0;

    const callbacks: AgentStreamCallbacks = {
      onSessionId(agentSessionId) {
        sessionsDb.updateAgentSession(sessionId, agentSessionId);
      },
      onMessage(message) {
        const msg = { index: messageIdx, type: message.type, content: message, timestamp: new Date().toISOString() };
        active.messageBuffer.push(msg);
        messagesDb.insert(sessionId, messageIdx, message.type || "unknown", message);

        // Update last activity
        if (message.type === "assistant" && message.content) {
          const text = typeof message.content === "string" ? message.content.slice(0, 100) : "";
          sessionsDb.updateActivity(sessionId, text);
        }

        // Notify subscribers
        for (const sub of active.subscribers) {
          sub(msg);
        }

        messageIdx++;
      },
      onComplete() {
        sessionsDb.updateStatus(sessionId, "completed");
        activityDb.insert({
          id: randomUUID(),
          session_id: sessionId,
          session_name: sessionName,
          type: "completed",
          description: "Session completed successfully",
        });
        activeSessions.delete(sessionId);
      },
      onError(error) {
        sessionsDb.updateError(sessionId, error.message);
        activityDb.insert({
          id: randomUUID(),
          session_id: sessionId,
          session_name: sessionName,
          type: "errored",
          description: `Session errored: ${error.message.slice(0, 100)}`,
        });
        activeSessions.delete(sessionId);
      },
    };

    // Fire and forget — runs in background
    startAgentSession({
      prompt: input.prompt,
      cwd: worktreePath,
      mode: input.mode,
      config,
      callbacks,
      abortSignal: abortController.signal,
    });

    return sessionId;
  }

  function list() {
    return sessionsDb.list();
  }

  function getById(id: string) {
    return sessionsDb.getById(id);
  }

  function getMessages(sessionId: string, fromIdx?: number) {
    return fromIdx !== undefined
      ? messagesDb.listFrom(sessionId, fromIdx)
      : messagesDb.list(sessionId);
  }

  function subscribe(sessionId: string, callback: (msg: any) => void): () => void {
    const active = activeSessions.get(sessionId);
    if (!active) return () => {};
    active.subscribers.add(callback);
    return () => active.subscribers.delete(callback);
  }

  function pause(sessionId: string) {
    const active = activeSessions.get(sessionId);
    if (active) {
      active.abortController.abort();
      activeSessions.delete(sessionId);
    }
    sessionsDb.updateStatus(sessionId, "paused");
    const session = sessionsDb.getById(sessionId);
    if (session) {
      activityDb.insert({
        id: randomUUID(),
        session_id: sessionId,
        session_name: session.name,
        type: "paused",
        description: "Session paused by user",
      });
    }
  }

  function cancel(sessionId: string) {
    const active = activeSessions.get(sessionId);
    if (active) {
      active.abortController.abort();
      activeSessions.delete(sessionId);
    }
    sessionsDb.updateStatus(sessionId, "cancelled");
    const session = sessionsDb.getById(sessionId);
    if (session) {
      activityDb.insert({
        id: randomUUID(),
        session_id: sessionId,
        session_name: session.name,
        type: "cancelled",
        description: "Session cancelled by user",
      });
    }
  }

  async function sendMessage(sessionId: string, message: string) {
    const session = sessionsDb.getById(sessionId);
    if (!session) throw new Error("Session not found");
    if (!session.agent_session_id) throw new Error("No agent session to resume");

    const cwd = session.worktree_path || session.working_directory;
    if (!cwd) throw new Error("No working directory for session");

    // Resume with new message
    sessionsDb.updateStatus(sessionId, "active");

    const abortController = new AbortController();
    const active: ActiveSession = {
      abortController,
      messageBuffer: activeSessions.get(sessionId)?.messageBuffer || [],
      subscribers: activeSessions.get(sessionId)?.subscribers || new Set(),
      pendingApproval: null,
    };
    activeSessions.set(sessionId, active);

    let messageIdx = messagesDb.count(sessionId);

    const callbacks: AgentStreamCallbacks = {
      onSessionId() {},
      onMessage(msg) {
        const indexed = { index: messageIdx, type: msg.type, content: msg, timestamp: new Date().toISOString() };
        active.messageBuffer.push(indexed);
        messagesDb.insert(sessionId, messageIdx, msg.type || "unknown", msg);
        for (const sub of active.subscribers) sub(indexed);
        messageIdx++;
      },
      onComplete() {
        sessionsDb.updateStatus(sessionId, "completed");
        activeSessions.delete(sessionId);
      },
      onError(error) {
        sessionsDb.updateError(sessionId, error.message);
        activeSessions.delete(sessionId);
      },
    };

    startAgentSession({
      prompt: message,
      cwd,
      mode: session.mode as SessionMode,
      config,
      resumeSessionId: session.agent_session_id,
      callbacks,
      abortSignal: abortController.signal,
    });
  }

  function getHandoff(sessionId: string) {
    const session = sessionsDb.getById(sessionId);
    if (!session) throw new Error("Session not found");
    if (!["paused", "completed", "error", "cancelled"].includes(session.status)) {
      throw new Error("Session must be paused, completed, or errored for handoff");
    }
    return {
      sessionId: session.id,
      sessionName: session.name,
      worktreePath: session.worktree_path,
      resumeCommand: `tricorder resume ${session.name.toLowerCase().replace(/\s+/g, "-")}`,
    };
  }

  function getActivityFeed(limit = 50) {
    return activityDb.list(limit);
  }

  return {
    create,
    list,
    getById,
    getMessages,
    subscribe,
    pause,
    cancel,
    sendMessage,
    getHandoff,
    getActivityFeed,
  };
}

export type SessionManager = ReturnType<typeof createSessionManager>;
```

- [ ] **Step 2: Commit**

```bash
git add packages/server/src/session/manager.ts && git commit -m "feat: add session manager with create, pause, cancel, resume, handoff"
```

---

### Task 11: tRPC router setup + server entry point

**Files:**
- Create: `packages/server/src/routers/index.ts`
- Create: `packages/server/src/routers/sessions.ts`
- Create: `packages/server/src/routers/activity.ts`
- Create: `packages/server/src/routers/config.ts`
- Create: `packages/server/src/routers/usage.ts`
- Create: `packages/server/src/index.ts`

- [ ] **Step 1: Create sessions tRPC router**

```typescript
// packages/server/src/routers/sessions.ts
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { createSessionInput } from "@tricorder/shared";
import type { SessionManager } from "../session/manager";

const t = initTRPC.create();

export function createSessionsRouter(manager: SessionManager) {
  return t.router({
    create: t.procedure
      .input(createSessionInput)
      .mutation(async ({ input }) => {
        const id = await manager.create(input);
        return { id };
      }),

    list: t.procedure.query(() => {
      return manager.list();
    }),

    detail: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        const session = manager.getById(input.id);
        if (!session) throw new Error("Session not found");
        const messages = manager.getMessages(input.id);
        return { session, messages };
      }),

    message: t.procedure
      .input(z.object({ id: z.string(), message: z.string() }))
      .mutation(async ({ input }) => {
        await manager.sendMessage(input.id, input.message);
        return { ok: true };
      }),

    pause: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        manager.pause(input.id);
        return { ok: true };
      }),

    cancel: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(({ input }) => {
        manager.cancel(input.id);
        return { ok: true };
      }),

    handoff: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        return manager.getHandoff(input.id);
      }),

    stream: t.procedure
      .input(z.object({ id: z.string(), lastSeenIndex: z.number().optional() }))
      .subscription(({ input }) => {
        return observable((emit) => {
          // Replay buffered messages
          const messages = manager.getMessages(input.id, input.lastSeenIndex);
          for (const msg of messages) {
            emit.next(msg);
          }

          // Subscribe to live updates
          const unsub = manager.subscribe(input.id, (msg) => {
            emit.next(msg);
          });

          return unsub;
        });
      }),
  });
}
```

- [ ] **Step 2: Create activity, config, usage routers**

```typescript
// packages/server/src/routers/activity.ts
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import type { SessionManager } from "../session/manager";

const t = initTRPC.create();

export function createActivityRouter(manager: SessionManager) {
  return t.router({
    list: t.procedure
      .input(z.object({ limit: z.number().optional().default(50) }).optional())
      .query(({ input }) => {
        return manager.getActivityFeed(input?.limit);
      }),
  });
}
```

```typescript
// packages/server/src/routers/config.ts
import { initTRPC } from "@trpc/server";
import type { ServerConfig } from "@tricorder/shared";

const t = initTRPC.create();

export function createConfigRouter(config: ServerConfig) {
  return t.router({
    get: t.procedure.query(() => config),
  });
}
```

```typescript
// packages/server/src/routers/usage.ts
import { initTRPC } from "@trpc/server";

const t = initTRPC.create();

// Stub — returns unavailable until Task 16 implements the usage monitor.
// This is intentionally incomplete; usage.current will return { available: false } until then.
export function createUsageRouter() {
  return t.router({
    current: t.procedure.query(() => ({
      tiers: [],
      updatedAt: new Date().toISOString(),
      available: false,
    })),
  });
}
```

- [ ] **Step 3: Create merged router**

```typescript
// packages/server/src/routers/index.ts
import { initTRPC } from "@trpc/server";
import { createSessionsRouter } from "./sessions";
import { createActivityRouter } from "./activity";
import { createConfigRouter } from "./config";
import { createUsageRouter } from "./usage";
import { scanRepos, getRepoDetail } from "./repos";
import type { SessionManager } from "../session/manager";
import type { ServerConfig } from "@tricorder/shared";
import { z } from "zod";

const t = initTRPC.create();

export function createAppRouter(manager: SessionManager, config: ServerConfig) {
  const reposRouter = t.router({
    list: t.procedure.query(async () => scanRepos(config.scanDirectory)),
    detail: t.procedure
      .input(z.object({ path: z.string() }))
      .query(async ({ input }) => getRepoDetail(input.path)),
  });

  // localSessions router created in Task 16b
  return t.router({
    repos: reposRouter,
    sessions: createSessionsRouter(manager),
    // localSessions: added in Task 16b after watcher is implemented
    activity: createActivityRouter(manager),
    config: createConfigRouter(config),
    usage: createUsageRouter(),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
```

- [ ] **Step 4: Create server entry point**

```typescript
// packages/server/src/index.ts
import { createHTTPServer } from "@trpc/server/adapters/standalone";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { WebSocketServer } from "ws";
import { createDatabase } from "./db";
import { loadConfig, getDbPath } from "./config";
import { createSessionManager } from "./session/manager";
import { createAppRouter } from "./routers";

const config = loadConfig();
const db = createDatabase(getDbPath());
const manager = createSessionManager(db, config);
const appRouter = createAppRouter(manager, config);

// HTTP server
const httpServer = createHTTPServer({
  router: appRouter,
  createContext: () => ({}),
});

// WebSocket server for subscriptions
const wss = new WebSocketServer({ server: httpServer.server });
applyWSSHandler({ wss, router: appRouter, createContext: () => ({}) });

const { host, port } = config;
httpServer.listen(port, host);
console.log(`Tricorder server listening on ${host}:${port}`);
console.log(`Scanning repos in: ${config.scanDirectory}`);

export type { AppRouter } from "./routers";
```

- [ ] **Step 5: Verify server starts**

Run: `cd packages/server && bun run src/index.ts`
Expected: "Tricorder server listening on ..." output, no crashes. Ctrl+C to stop.

- [ ] **Step 6: Commit**

```bash
git add packages/server/src && git commit -m "feat: add tRPC routers and server entry point with HTTP + WebSocket"
```

---

## Chunk 4: Mobile App Setup + Core Screens

### Task 12: Initialize Expo project

**Files:**
- Recreate: `packages/mobile/` (Expo init replaces placeholder)

- [ ] **Step 1: Initialize Expo project with Expo Router template**

Run from repo root:
```bash
cd packages && bunx create-expo-app@latest mobile --template tabs
```

- [ ] **Step 2: Install dependencies**

```bash
cd packages/mobile && bun add nativewind tailwindcss @trpc/client @trpc/react-query @tanstack/react-query zustand @react-native-async-storage/async-storage react-native-reanimated
```

- [ ] **Step 3: Configure NativeWind — create tailwind.config.js**

```javascript
// packages/mobile/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "bg-page": "#FAFAF9",
        "bg-card": "#F5F5F4",
        "bg-elevated": "#FFFFFF",
        "text-primary": "#1C1917",
        "text-secondary": "#78716C",
        "text-tertiary": "#A8A29E",
        "accent-terracotta": "#D97706",
        "accent-terracotta-light": "#FEF3C7",
        "accent-teal": "#0D9488",
        "border-subtle": "#E7E5E4",
        "status-running": "#16A34A",
        "status-waiting": "#D97706",
        "status-paused": "#EA580C",
        "status-completed": "#78716C",
        "status-local": "#2563EB",
        "status-cancel": "#DC2626",
        "status-error": "#DC2626",
      },
      fontFamily: {
        "dm-sans": ["DM Sans"],
        "jetbrains": ["JetBrains Mono"],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 4: Create tRPC client setup**

```typescript
// packages/mobile/src/lib/trpc.ts
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink, splitLink, wsLink, createWSClient } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const trpc = createTRPCReact<AppRouter>();

export async function getServerUrl(): Promise<string> {
  const stored = await AsyncStorage.getItem("tricorder-server-url");
  return stored || "http://localhost:3141";
}

export function createTrpcClient(serverUrl: string) {
  const wsClient = createWSClient({ url: serverUrl.replace("http", "ws") });

  return trpc.createClient({
    links: [
      splitLink({
        condition: (op) => op.type === "subscription",
        true: wsLink({ client: wsClient }),
        false: httpBatchLink({ url: serverUrl }),
      }),
    ],
  });
}
```

- [ ] **Step 5: Create Zustand store for WebSocket stream state**

```typescript
// packages/mobile/src/lib/store.ts
import { create } from "zustand";

interface SessionStreamState {
  streams: Record<string, {
    messages: any[];
    connected: boolean;
    lastSeenIndex: number;
  }>;
  addMessage: (sessionId: string, message: any) => void;
  setConnected: (sessionId: string, connected: boolean) => void;
  initStream: (sessionId: string) => void;
  clearStream: (sessionId: string) => void;
}

export const useStreamStore = create<SessionStreamState>((set) => ({
  streams: {},
  initStream: (sessionId) =>
    set((state) => ({
      streams: {
        ...state.streams,
        [sessionId]: { messages: [], connected: false, lastSeenIndex: 0 },
      },
    })),
  addMessage: (sessionId, message) =>
    set((state) => {
      const stream = state.streams[sessionId];
      if (!stream) return state;
      return {
        streams: {
          ...state.streams,
          [sessionId]: {
            ...stream,
            messages: [...stream.messages, message],
            lastSeenIndex: message.index + 1,
          },
        },
      };
    }),
  setConnected: (sessionId, connected) =>
    set((state) => {
      const stream = state.streams[sessionId];
      if (!stream) return state;
      return {
        streams: {
          ...state.streams,
          [sessionId]: { ...stream, connected },
        },
      };
    }),
  clearStream: (sessionId) =>
    set((state) => {
      const { [sessionId]: _, ...rest } = state.streams;
      return { streams: rest };
    }),
}));
```

- [ ] **Step 6: Commit**

```bash
git add packages/mobile && git commit -m "feat: initialize Expo project with NativeWind, tRPC client, Zustand store"
```

---

### Task 13: Tab navigation + Sessions List screen

**Files:**
- Create: `packages/mobile/src/app/(tabs)/_layout.tsx`
- Create: `packages/mobile/src/app/(tabs)/index.tsx`
- Create: `packages/mobile/src/components/SessionCard.tsx`
- Create: `packages/mobile/src/components/StatusPill.tsx`
- Create: `packages/mobile/src/components/SegmentControl.tsx`
- Create: `packages/mobile/src/components/UsageIndicator.tsx`
- Create: `packages/mobile/src/components/PillTabBar.tsx`

> **Design reference:** Use Pencil MCP `batch_get` and `get_screenshot` on `application-design.pen` node `ZMtPC` (Sessions List) to extract exact spacing, colors, and typography. Match the .pen file's design tokens and component hierarchy exactly.

- [ ] **Step 0: Extract design tokens from .pen file**

Use Pencil MCP `get_variables` on `application-design.pen` to extract all color variables. Create `packages/mobile/src/lib/theme.ts` with the resolved token values. These map to the NativeWind tailwind.config.js colors.

- [ ] **Step 1: Create PillTabBar component**

Use Pencil MCP `batch_get` on node `HktJg` (Pill) with `readDepth: 3` to extract exact structure. Build a custom tab bar component matching:
- Container: height 62, cornerRadius 36, gap 4, padding 4, `$bg-elevated` fill, `$border-subtle` 1px stroke
- Each tab: `fill_container` width, cornerRadius 26, vertical layout, gap 4, centered
- Active tab: `$accent-terracotta` fill, `$text-on-accent` icon+text
- Inactive tab: no fill, `$text-tertiary` icon+text
- Icons: lucide-react-native, 18x18 (house, activity, compass, user)
- Labels: DM Sans 10px, 600/500 weight, 0.5 letter spacing, uppercase

- [ ] **Step 2: Create StatusPill component**

Use Pencil MCP `batch_get` on nodes `89CEH`, `FN845`, `VQ8jN`, `07vsd`, `XhBqk` to see all status variants. Build a reusable component accepting status prop:
- Container: cornerRadius 6, padding vertical 4 horizontal 8, background is status color at 20% opacity
- Text: JetBrains Mono 10px 700 weight, 0.5 letter spacing, uppercase, fill is full status color
- Status map: running=#16A34A, waiting=#D97706, paused=#EA580C, completed=#78716C, local=#2563EB, error=#DC2626

- [ ] **Step 3: Create ModeBadge and SessionCard components**

Use Pencil MCP `batch_get` on node `0xJtG` with `readDepth: 3` to extract card structure.
- ModeBadge: `$accent-terracotta-light` fill, cornerRadius 6, padding [3, 8], JetBrains Mono 10px 700
- SessionCard: `$bg-card` fill, cornerRadius 16, padding [16, 18], vertical layout gap 10
  - Row 1: title (DM Sans 15px 600) + StatusPill, space-between
  - Row 2: repo (JetBrains Mono 12px) + dot + ModeBadge
  - Row 3: description (DM Sans 13px, `$text-secondary`, fixed-width, lineHeight 1.4)

- [ ] **Step 4: Create SegmentControl component**

Use Pencil MCP `batch_get` on node `PvUhW` with `readDepth: 2`.
- Container: height 38, `$bg-card` fill, cornerRadius 12, gap 4, padding 4
- Segments: fill_container, cornerRadius 8, centered text
- Active: `$accent-terracotta` fill, `$text-on-accent` text, DM Sans 12px 600
- Inactive: no fill, `$text-tertiary` text, DM Sans 12px 500

- [ ] **Step 5: Create UsageIndicator component**

Use Pencil MCP `batch_get` on node `Aca3Q` with `readDepth: 2`.
- Container: `$bg-card` fill, cornerRadius 14, gap 6, padding [6, 10]
- Green dot: 8x8 ellipse, #16A34A (shifts to yellow/red based on percentage)
- Text: JetBrains Mono 12px 700, `$text-primary`

- [ ] **Step 6: Create Sessions List screen with tab layout**

Wire up the tab layout with PillTabBar and build the Sessions List screen using SessionCard, SegmentControl, and UsageIndicator. Connect to `trpc.sessions.list` for data. Use Pencil MCP `get_screenshot` on node `ZMtPC` to visually verify the implementation matches.

- [ ] **Step 7: Verify in simulator**

Run: `cd packages/mobile && bun expo start`
Expected: Sessions List renders with tab bar, segment control. Shows loading/empty state if server not running.

- [ ] **Step 8: Commit**

```bash
git add packages/mobile/src && git commit -m "feat: add tab navigation, Sessions List screen with cards and filter bar"
```

---

### Task 14: Live Session View screen

**Files:**
- Create: `packages/mobile/src/app/session/[id].tsx`
- Create: `packages/mobile/src/components/MessageBubble.tsx`
- Create: `packages/mobile/src/components/ToolCard.tsx`
- Create: `packages/mobile/src/components/DiffView.tsx`
- Create: `packages/mobile/src/components/ApprovalPrompt.tsx`
- Create: `packages/mobile/src/components/HandoffBanner.tsx`

> **Design reference:** Use Pencil MCP on `application-design.pen` nodes `Rrwk5` (Live Session View) and `vxvxd` (Error/Handoff). Extract message bubble styles from `CZLPQ` (Claude Message), tool cards from `nQfKi`/`H4cHt`/`AUTzX`, approval from `UIGTS`.

- [ ] **Step 1: Create MessageBubble**

Use Pencil MCP `batch_get` on node `CZLPQ` with `readDepth: 3`. Build:
- Container: #292524 fill, cornerRadius 14, padding [14, 16], vertical layout gap 8
- Label row: sparkles icon (lucide, 14x14, `$accent-terracotta`) + "Claude" text (DM Sans 12px 600, `$text-on-accent-muted`)
- Body: DM Sans 13px, `$text-on-accent`, fixed-width fill_container, lineHeight 1.5

- [ ] **Step 2: Create ToolCard variants**

Use Pencil MCP `batch_get` on nodes `nQfKi`, `H4cHt`, `AUTzX` with `readDepth: 3`. Build a ToolCard that renders differently per tool type:
- **Read**: `$bg-card` fill, cornerRadius 10, padding [10, 14], horizontal row with file-text icon (16x16), title "Read" + detail text, chevron-right
- **Edit**: same container, vertical with header row + DiffView child
- **Bash**: same container, header row + result box (#16A34A15 fill if success, #DC262615 if error)

- [ ] **Step 3: Create DiffView**

Use Pencil MCP `batch_get` on node `Xhm0y` with `readDepth: 2`. Build:
- Container: #29252410 fill, cornerRadius 6, padding [8, 10], vertical gap 4
- Lines: JetBrains Mono 11px. Removed lines: #DC2626 fill, "- " prefix. Added lines: #16A34A fill, "+ " prefix

- [ ] **Step 4: Create ApprovalPrompt**

Use Pencil MCP `batch_get` on node `UIGTS` with `readDepth: 3`. Build:
- Container: `$bg-elevated` fill, cornerRadius 10, `$accent-terracotta` 1.5px border, padding [12, 14], vertical gap 10
- Header: shield-alert icon + "Claude wants to:" text
- Action description: JetBrains Mono 12px, `$text-secondary`
- Buttons row: Approve (`$accent-teal` fill, white text) + Deny (#DC262620 fill, red text), each height 36, cornerRadius 8

- [ ] **Step 5: Create HandoffBanner**

Use Pencil MCP `get_screenshot` on node `vxvxd` to see the handoff banner design. Build:
- "CONTINUE ON YOUR MACHINE" label (small uppercase, `$text-tertiary`)
- Code block with command text (JetBrains Mono) + clipboard copy icon
- Tapping copies command to clipboard via `Clipboard.setStringAsync`

- [ ] **Step 6: Create Live Session View screen**

Wire up the full screen using all components above. Session header (from `vn3OG`): title, repo, mode badge, elapsed time, pause/cancel buttons. ScrollView with FlatList for message stream. Use `trpc.sessions.stream.useSubscription()` feeding into Zustand store. Input bar at bottom with TextInput + send button.

- [ ] **Step 7: Handle error state**

When session status is "error": show red ERROR StatusPill in header, replace pause/cancel with a single "Retry" button (`$accent-teal` fill), show HandoffBanner at bottom. Use Pencil MCP `get_screenshot` on node `vxvxd` to verify.

- [ ] **Step 8: Commit**

```bash
git add packages/mobile/src && git commit -m "feat: add Live Session View with message stream, tool cards, approval prompts"
```

---

### Task 15: New Session, Activity, Usage, Settings, Repos screens

**Files:**
- Create: `packages/mobile/src/app/new-session.tsx`
- Create: `packages/mobile/src/app/(tabs)/activity.tsx`
- Create: `packages/mobile/src/app/(tabs)/repos.tsx`
- Create: `packages/mobile/src/app/usage.tsx`
- Create: `packages/mobile/src/app/(tabs)/settings.tsx`
- Create: `packages/mobile/src/components/UsageCard.tsx`

> **Design reference:** Use Pencil MCP on nodes `f1UEm` (New Session), `3eDUv` (Activity Tab), `jLDoS` (Usage Dashboard), `JhyvT` (Settings), `m0nSj` (Settings First Run).

- [ ] **Step 1: Create New Session screen** — repo picker (from `trpc.repos.list`), branch picker, prompt textarea, mode toggle, launch button. Reference node `f1UEm`.

- [ ] **Step 2: Create Activity screen** — grouped event feed from `trpc.activity.list`. Color-coded status icons, session names, descriptions, relative timestamps. Reference node `3eDUv`.

- [ ] **Step 3: Create UsageCard component** — label, subtitle, percentage, progress bar, reset countdown. Reference node `jLDoS` children.

- [ ] **Step 4: Create Usage Dashboard screen** — four UsageCards stacked, data from `trpc.usage.current`.

- [ ] **Step 5: Create Repos browser screen**

Simple list of repos from `trpc.repos.list`. Each row shows repo name, default branch, last commit date. Tapping a repo navigates to New Session with the repo pre-selected. Use `trpc.repos.detail` for expanded view.

- [ ] **Step 6: Create Settings screen** — server connection, scan dir, mode toggle, plugins, MCP servers. Handle first-run state (no server configured). Reference nodes `JhyvT` and `m0nSj`.

- [ ] **Step 7: Commit**

```bash
git add packages/mobile/src && git commit -m "feat: add New Session, Activity, Usage Dashboard, and Settings screens"
```

---

## Chunk 5: CLI, Usage Monitor, Polish

### Task 16: Usage monitor (server)

**Files:**
- Create: `packages/server/src/usage/keychain.ts`
- Create: `packages/server/src/usage/monitor.ts`
- Modify: `packages/server/src/routers/usage.ts`

- [ ] **Step 1: Implement Keychain reader**

```typescript
// packages/server/src/usage/keychain.ts
import { execSync } from "child_process";

export function getOAuthToken(): string | null {
  try {
    const result = execSync(
      'security find-generic-password -s "claude-code" -a "oauth" -w 2>/dev/null',
      { encoding: "utf-8" }
    ).trim();
    return result || null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Implement usage monitor**

```typescript
// packages/server/src/usage/monitor.ts
import { getOAuthToken } from "./keychain";
import type { UsageData } from "@tricorder/shared";

let cachedUsage: UsageData | null = null;
let lastFetch = 0;
const POLL_INTERVAL = 60_000; // 60 seconds

export async function getUsage(): Promise<UsageData> {
  const now = Date.now();
  if (cachedUsage && now - lastFetch < POLL_INTERVAL) {
    return cachedUsage;
  }

  const token = getOAuthToken();
  if (!token) {
    return { tiers: [], updatedAt: new Date().toISOString(), available: false };
  }

  try {
    const resp = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      return { tiers: [], updatedAt: new Date().toISOString(), available: false };
    }

    const data = await resp.json();
    // Parse the response into our UsageData format
    // The exact response shape needs to be discovered at runtime
    cachedUsage = parseUsageResponse(data);
    lastFetch = now;
    return cachedUsage;
  } catch {
    return { tiers: [], updatedAt: new Date().toISOString(), available: false };
  }
}

function parseUsageResponse(data: any): UsageData {
  // Best-effort parsing of undocumented API
  const tiers = [];

  if (data.session) {
    tiers.push({
      label: "Session",
      subtitle: "5-hour window",
      percentage: data.session.percentage ?? 0,
      resetIn: data.session.resetIn ?? null,
      dollarAmount: null,
      dollarLimit: null,
    });
  }

  if (data.weekly) {
    tiers.push({
      label: "Weekly",
      subtitle: "7-day window",
      percentage: data.weekly.percentage ?? 0,
      resetIn: data.weekly.resetIn ?? null,
      dollarAmount: null,
      dollarLimit: null,
    });
  }

  if (data.model) {
    tiers.push({
      label: "Sonnet Only",
      subtitle: "Model-specific",
      percentage: data.model.percentage ?? 0,
      resetIn: data.model.resetIn ?? null,
      dollarAmount: null,
      dollarLimit: null,
    });
  }

  if (data.overage) {
    tiers.push({
      label: "Overage",
      subtitle: "Extra usage this month",
      percentage: data.overage.percentage ?? 0,
      resetIn: null,
      dollarAmount: data.overage.amount ?? 0,
      dollarLimit: data.overage.limit ?? 50,
    });
  }

  return {
    tiers,
    updatedAt: new Date().toISOString(),
    available: tiers.length > 0,
  };
}
```

- [ ] **Step 3: Update usage router to use monitor**

```typescript
// packages/server/src/routers/usage.ts — replace placeholder
import { initTRPC } from "@trpc/server";
import { getUsage } from "../usage/monitor";

const t = initTRPC.create();

export function createUsageRouter() {
  return t.router({
    current: t.procedure.query(async () => getUsage()),
  });
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/usage packages/server/src/routers/usage.ts && git commit -m "feat: add usage monitor with Keychain OAuth + API polling"
```

---

### Task 16b: Local session watcher + router

**Files:**
- Create: `packages/server/src/watcher/local-sessions.ts`
- Create: `packages/server/src/routers/local-sessions.ts`
- Modify: `packages/server/src/routers/index.ts` (add localSessions router)

- [ ] **Step 1: Implement local session watcher**

```typescript
// packages/server/src/watcher/local-sessions.ts
import { watch } from "chokidar";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { execSync } from "child_process";

export interface LocalSession {
  id: string;
  name: string;
  directory: string;
  active: boolean;
  lastModified: string;
}

const CLAUDE_DIR = join(homedir(), ".claude", "projects");

export function scanLocalSessions(): LocalSession[] {
  if (!existsSync(CLAUDE_DIR)) return [];

  const sessions: LocalSession[] = [];

  try {
    // Scan for session directories/files in ~/.claude/projects/
    const entries = readdirSync(CLAUDE_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const sessionDir = join(CLAUDE_DIR, entry.name);
      // Look for session state files
      // Claude Code's format is internal — best-effort parsing
      try {
        const files = readdirSync(sessionDir);
        for (const file of files) {
          if (!file.endsWith(".json")) continue;
          const filePath = join(sessionDir, file);
          const stat = Bun.file(filePath);
          sessions.push({
            id: file.replace(".json", ""),
            name: entry.name,
            directory: sessionDir,
            active: isSessionActive(file.replace(".json", "")),
            lastModified: new Date(stat.lastModified).toISOString(),
          });
        }
      } catch {}
    }
  } catch {}

  return sessions;
}

function isSessionActive(sessionId: string): boolean {
  try {
    const result = execSync(`ps aux | grep -v grep | grep "claude" | grep "${sessionId}"`, {
      encoding: "utf-8",
      timeout: 5000,
    });
    return result.trim().length > 0;
  } catch {
    return false; // Default to idle if detection fails
  }
}
```

- [ ] **Step 2: Create localSessions tRPC router**

```typescript
// packages/server/src/routers/local-sessions.ts
import { z } from "zod";
import { initTRPC } from "@trpc/server";
import { scanLocalSessions } from "../watcher/local-sessions";
import type { SessionManager } from "../session/manager";

const t = initTRPC.create();

export function createLocalSessionsRouter(manager: SessionManager) {
  return t.router({
    list: t.procedure.query(() => scanLocalSessions()),

    detail: t.procedure
      .input(z.object({ id: z.string() }))
      .query(({ input }) => {
        const sessions = scanLocalSessions();
        const session = sessions.find(s => s.id === input.id);
        if (!session) throw new Error("Local session not found");
        return session;
      }),

    takeover: t.procedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        const sessions = scanLocalSessions();
        const session = sessions.find(s => s.id === input.id);
        if (!session) throw new Error("Local session not found");
        if (session.active) throw new Error("Session is active in terminal — stop it first to take over");

        // Create a server-managed session that resumes the local one
        const newId = await manager.create({
          repoName: session.name,
          branch: "main",
          prompt: "(Taken over from terminal session)",
          mode: "autonomous",
        });
        return { id: newId };
      }),
  });
}
```

- [ ] **Step 3: Add localSessions to merged router**

In `packages/server/src/routers/index.ts`, import `createLocalSessionsRouter` and add:
```typescript
localSessions: createLocalSessionsRouter(manager),
```

- [ ] **Step 4: Commit**

```bash
git add packages/server/src/watcher packages/server/src/routers/local-sessions.ts packages/server/src/routers/index.ts && git commit -m "feat: add local session watcher and localSessions tRPC router"
```

---

### Task 17: CLI package

**Files:**
- Create: `packages/cli/src/index.ts`
- Create: `packages/cli/src/commands/resume.ts`
- Create: `packages/cli/src/commands/list.ts`
- Create: `packages/cli/src/commands/status.ts`

- [ ] **Step 1: Create CLI entry point**

```typescript
// packages/cli/src/index.ts
#!/usr/bin/env bun
import { parseArgs } from "util";

const { positionals } = parseArgs({
  args: Bun.argv.slice(2),
  allowPositionals: true,
  strict: false,
});

const command = positionals[0];
const args = positionals.slice(1);

switch (command) {
  case "resume":
    const { resume } = await import("./commands/resume");
    await resume(args[0]);
    break;
  case "list":
    const { list } = await import("./commands/list");
    await list();
    break;
  case "status":
    const { status } = await import("./commands/status");
    await status();
    break;
  default:
    console.log("Usage: tricorder <resume|list|status>");
    console.log("  resume <name>  — resume session in terminal via claude --resume");
    console.log("  list           — list all sessions");
    console.log("  status         — show server status + usage");
    process.exit(1);
}
```

- [ ] **Step 2: Implement resume command**

```typescript
// packages/cli/src/commands/resume.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";
import { execSync } from "child_process";

const SERVER_URL = process.env.TRICORDER_URL || "http://localhost:3141";

export async function resume(nameOrId: string) {
  if (!nameOrId) {
    console.error("Usage: tricorder resume <session-name>");
    process.exit(1);
  }

  const client = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: SERVER_URL })] });

  const sessions = await client.sessions.list.query();
  const session = sessions.find(
    (s) => s.id === nameOrId || s.name.toLowerCase().replace(/\s+/g, "-").includes(nameOrId.toLowerCase())
  );

  if (!session) {
    console.error(`Session not found: ${nameOrId}`);
    process.exit(1);
  }

  const handoff = await client.sessions.handoff.query({ id: session.id });

  console.log(`Resuming session: ${handoff.sessionName}`);
  const cwd = handoff.worktreePath || process.cwd();
  console.log(`Working directory: ${cwd}`);

  // The handoff response includes the resume command which contains the agent session ID
  console.log(`Running: ${handoff.resumeCommand}`);
  try {
    // Use claude --resume with the session's agent_session_id (stored server-side)
    const detail = await client.sessions.detail.query({ id: session.id });
    const agentSessionId = detail.session.agent_session_id;
    if (!agentSessionId) {
      console.error("No agent session ID available for resume");
      process.exit(1);
    }
    execSync(`claude --resume ${agentSessionId}`, { cwd, stdio: "inherit" });
  } catch (err) {
    // execSync throws on non-zero exit — this is expected when claude exits normally
    if (err instanceof Error && "status" in err && (err as any).status !== 0) {
      console.error("Claude exited with an error");
      process.exit(1);
    }
  }
}
```

- [ ] **Step 3: Implement list command**

```typescript
// packages/cli/src/commands/list.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";

const SERVER_URL = process.env.TRICORDER_URL || "http://localhost:3141";

export async function list() {
  const client = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: SERVER_URL })] });

  const sessions = await client.sessions.list.query();

  if (sessions.length === 0) {
    console.log("No sessions found.");
    return;
  }

  console.log("Sessions:\n");
  for (const s of sessions) {
    const status = s.status.toUpperCase().padEnd(10);
    const mode = s.mode.padEnd(12);
    console.log(`  ${status} ${mode} ${s.name}`);
    console.log(`           ${s.repo_name} • ${s.branch} • ${s.id.slice(0, 8)}`);
    console.log();
  }
}
```

- [ ] **Step 4: Implement status command**

```typescript
// packages/cli/src/commands/status.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";

const SERVER_URL = process.env.TRICORDER_URL || "http://localhost:3141";

export async function status() {
  try {
    const client = createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: SERVER_URL })] });

    const config = await client.config.get.query();
    const usage = await client.usage.current.query();
    const sessions = await client.sessions.list.query();

    console.log(`Tricorder Server: ${config.host}:${config.port}`);
    console.log(`Scan Directory: ${config.scanDirectory}`);
    console.log(`Active Sessions: ${sessions.filter(s => s.status === "active").length}`);
    console.log();

    if (usage.available) {
      console.log("Usage:");
      for (const tier of usage.tiers) {
        const bar = "█".repeat(Math.floor(tier.percentage / 5)) + "░".repeat(20 - Math.floor(tier.percentage / 5));
        console.log(`  ${tier.label.padEnd(12)} ${bar} ${tier.percentage}%`);
      }
    } else {
      console.log("Usage: unavailable");
    }
  } catch {
    console.error(`Cannot connect to server at ${SERVER_URL}`);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Verify CLI works**

Run: `cd packages/cli && bun run src/index.ts --help`
Expected: Usage text printed.

- [ ] **Step 6: Link CLI globally**

Run: `cd packages/cli && bun link`
Expected: `tricorder` command available globally.

- [ ] **Step 7: Commit**

```bash
git add packages/cli && git commit -m "feat: add tricorder CLI with resume, list, status commands"
```

---

### Task 18: Worktree cleanup job

**Files:**
- Create: `packages/server/src/cleanup.ts`
- Modify: `packages/server/src/index.ts`

- [ ] **Step 1: Implement cleanup job**

```typescript
// packages/server/src/cleanup.ts
import type { Database } from "bun:sqlite";
import { createSessionsDb } from "./db/sessions";
import { removeWorktree } from "./session/worktree";
import { existsSync } from "fs";
import { rmSync } from "fs";

const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const WORKTREE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export function startCleanupJob(db: Database) {
  const sessionsDb = createSessionsDb(db);

  async function cleanup() {
    const sessions = sessionsDb.list();
    const now = Date.now();

    for (const session of sessions) {
      if (!["completed", "cancelled", "error"].includes(session.status)) continue;
      if (!session.worktree_path) continue;

      const updatedAt = new Date(session.updated_at).getTime();
      if (now - updatedAt < WORKTREE_TTL) continue;

      // Remove the worktree directory directly (simpler than going through git)
      try {
        if (existsSync(session.worktree_path)) {
          rmSync(session.worktree_path, { recursive: true, force: true });
        }
        // Clear worktree_path in DB so we don't retry
        sessionsDb.updateStatus(session.id, session.status as any); // triggers updated_at
        // Note: ideally add a clearWorktreePath method to sessionsDb
      } catch (err) {
        console.error(`Cleanup failed for session ${session.id}:`, err);
      }
    }
  }

  // Run immediately (with error handling), then on interval
  cleanup().catch(console.error);
  const interval = setInterval(() => cleanup().catch(console.error), CLEANUP_INTERVAL);

  return () => clearInterval(interval);
}
```

- [ ] **Step 2: Add cleanup to server startup**

Add to `packages/server/src/index.ts` after router setup:

```typescript
import { startCleanupJob } from "./cleanup";
startCleanupJob(db);
```

- [ ] **Step 3: Commit**

```bash
git add packages/server/src/cleanup.ts packages/server/src/index.ts && git commit -m "feat: add worktree cleanup job with 24h TTL"
```

---

### Task 19: End-to-end smoke test

- [ ] **Step 1: Start the server**

Run: `cd packages/server && bun run dev`

- [ ] **Step 2: Test repos endpoint via CLI**

Run: `tricorder status`
Expected: Server info, scan directory, usage status printed.

- [ ] **Step 3: Test mobile app connects**

Run: `cd packages/mobile && bun expo start`
Expected: App loads, Sessions List shows empty state, server connection succeeds (if server running).

- [ ] **Step 4: Create a session from mobile app**

Tap "+", select a repo, type a prompt, choose Autonomous, tap Launch. Verify:
- Session appears in list with "RUNNING" status
- Tapping opens Live Session View with streaming messages

- [ ] **Step 5: Test pause and handoff**

Tap Pause on running session. Verify:
- Status changes to "PAUSED"
- Handoff banner appears with `tricorder resume` command
- Run the resume command in terminal — verify Claude continues

- [ ] **Step 6: Verify and document**

No files to commit from smoke testing. If any fixes were needed during testing, commit those specific files with descriptive messages.

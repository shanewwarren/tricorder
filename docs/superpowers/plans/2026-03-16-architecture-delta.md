# Architecture Delta: Awilix DI + Drizzle ORM + Layered Architecture

> **This document supersedes the raw SQL and flat architecture in the main implementation plan.**
> When implementing server-side tasks (Chunks 2, 3, 5), follow this architecture instead.

## Summary of Changes

The main plan uses raw `bun:sqlite` and flat function-based modules. This delta replaces that with:

1. **Drizzle ORM** — typed schema, migrations via drizzle-kit, query builder
2. **Awilix** — dependency injection container, constructor injection
3. **Layered architecture** — routers → services → repositories

---

## Layer Responsibilities

```
Routers (tRPC)     — HTTP/WS interface, input validation, delegates to services
     ↓
Services           — business logic, orchestration, no direct DB access
     ↓
Repositories       — data access via Drizzle, one per table/aggregate
```

- **Routers** are thin. They validate input (via zod/tRPC), resolve services from the Awilix container via tRPC context, call service methods, return results.
- **Services** contain all business logic. They receive repositories via constructor injection (Awilix). They do NOT import Drizzle directly.
- **Repositories** are the only layer that touches Drizzle. Each repository wraps one table (or a small aggregate). They expose typed methods like `findById`, `insert`, `updateStatus`.

---

## Database: Drizzle Setup

### Schema (`packages/server/src/db/schema.ts`)

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  repoName: text("repo_name").notNull(),
  branch: text("branch").notNull().default("main"),
  mode: text("mode", { enum: ["autonomous", "interactive"] }).notNull(),
  status: text("status", { enum: ["active", "paused", "completed", "cancelled", "error"] }).notNull().default("active"),
  worktreePath: text("worktree_path"),
  workingDirectory: text("working_directory"),
  lastActivity: text("last_activity"),
  lastError: text("last_error"),
  agentSessionId: text("agent_session_id"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: text("session_id").notNull().references(() => sessions.id),
  idx: integer("idx").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});

export const activityEvents = sqliteTable("activity_events", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  sessionName: text("session_name").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  timestamp: text("timestamp").notNull().default(sql`(datetime('now'))`),
});
```

### Instance (`packages/server/src/db/index.ts`)

```typescript
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

export function createDb(path: string) {
  const sqlite = new Database(path);
  sqlite.run("PRAGMA journal_mode = WAL");
  sqlite.run("PRAGMA foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;
export { schema };
```

### Migrations

```typescript
// packages/server/drizzle.config.ts
import type { Config } from "drizzle-kit";
export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
} satisfies Config;
```

Run `bunx drizzle-kit generate` then `bunx drizzle-kit push` on setup.

---

## Repositories

Each repository is a class that receives `Db` via constructor.

### SessionsRepository (`packages/server/src/repositories/sessions.repo.ts`)

```typescript
import { eq, desc } from "drizzle-orm";
import { schema, type Db } from "../db";
import type { SessionStatus, SessionMode } from "@tricorder/shared";

export class SessionsRepository {
  constructor(private db: Db) {}

  insert(data: { id: string; name: string; repoName: string; branch: string; mode: SessionMode; worktreePath?: string | null; agentSessionId?: string | null }) {
    this.db.insert(schema.sessions).values({ ...data, worktreePath: data.worktreePath ?? null, agentSessionId: data.agentSessionId ?? null }).run();
  }

  findById(id: string) { return this.db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).get(); }
  findAll() { return this.db.select().from(schema.sessions).orderBy(desc(schema.sessions.updatedAt)).all(); }
  updateStatus(id: string, status: SessionStatus) { this.db.update(schema.sessions).set({ status, updatedAt: new Date().toISOString() }).where(eq(schema.sessions.id, id)).run(); }
  updateActivity(id: string, activity: string) { this.db.update(schema.sessions).set({ lastActivity: activity, updatedAt: new Date().toISOString() }).where(eq(schema.sessions.id, id)).run(); }
  updateError(id: string, error: string) { this.db.update(schema.sessions).set({ status: "error", lastError: error, updatedAt: new Date().toISOString() }).where(eq(schema.sessions.id, id)).run(); }
  updateAgentSession(id: string, agentSessionId: string) { this.db.update(schema.sessions).set({ agentSessionId, updatedAt: new Date().toISOString() }).where(eq(schema.sessions.id, id)).run(); }
  clearWorktreePath(id: string) { this.db.update(schema.sessions).set({ worktreePath: null, updatedAt: new Date().toISOString() }).where(eq(schema.sessions.id, id)).run(); }
  delete(id: string) { this.db.delete(schema.sessions).where(eq(schema.sessions.id, id)).run(); }
}
```

### MessagesRepository (`packages/server/src/repositories/messages.repo.ts`)

```typescript
import { eq, gte, asc, count, and } from "drizzle-orm";
import { schema, type Db } from "../db";

export class MessagesRepository {
  constructor(private db: Db) {}

  insert(sessionId: string, idx: number, type: string, content: unknown) {
    this.db.insert(schema.messages).values({ sessionId, idx, type, content: JSON.stringify(content) }).run();
  }
  findBySession(sessionId: string) { return this.db.select().from(schema.messages).where(eq(schema.messages.sessionId, sessionId)).orderBy(asc(schema.messages.idx)).all(); }
  findBySessionFrom(sessionId: string, fromIdx: number) { return this.db.select().from(schema.messages).where(and(eq(schema.messages.sessionId, sessionId), gte(schema.messages.idx, fromIdx))).orderBy(asc(schema.messages.idx)).all(); }
  countBySession(sessionId: string): number { return this.db.select({ count: count() }).from(schema.messages).where(eq(schema.messages.sessionId, sessionId)).get()?.count ?? 0; }
}
```

### ActivityRepository (`packages/server/src/repositories/activity.repo.ts`)

```typescript
import { desc } from "drizzle-orm";
import { schema, type Db } from "../db";

export class ActivityRepository {
  constructor(private db: Db) {}

  insert(event: { id: string; sessionId: string; sessionName: string; type: string; description: string }) {
    this.db.insert(schema.activityEvents).values(event).run();
  }
  findRecent(limit = 50) { return this.db.select().from(schema.activityEvents).orderBy(desc(schema.activityEvents.timestamp)).limit(limit).all(); }
}
```

### ReposRepository (`packages/server/src/repositories/repos.repo.ts`)

Filesystem-based (no Drizzle). Receives `scanDirectory` string via constructor. Same implementation as the plan's `scanRepos`/`getRepoDetail` but as a class.

---

## Awilix Container (`packages/server/src/container.ts`)

```typescript
import { createContainer, asClass, asValue, asFunction, InjectionMode } from "awilix";
import type { ServerConfig } from "@tricorder/shared";
import type { Db } from "./db";

import { SessionsRepository } from "./repositories/sessions.repo";
import { MessagesRepository } from "./repositories/messages.repo";
import { ActivityRepository } from "./repositories/activity.repo";
import { ReposRepository } from "./repositories/repos.repo";

import { SessionService } from "./services/session.service";
import { AgentService } from "./services/agent.service";
import { SandboxService } from "./services/sandbox.service";
import { WorktreeService } from "./services/worktree.service";
import { UsageService } from "./services/usage.service";
import { WatcherService } from "./services/watcher.service";
import { CleanupService } from "./services/cleanup.service";

export function createAppContainer(config: ServerConfig, db: Db) {
  const container = createContainer({ injectionMode: InjectionMode.CLASSIC });

  container.register({
    // Values
    config: asValue(config),
    db: asValue(db),

    // Repositories
    sessionsRepo: asClass(SessionsRepository).singleton(),
    messagesRepo: asClass(MessagesRepository).singleton(),
    activityRepo: asClass(ActivityRepository).singleton(),
    reposRepo: asFunction(() => new ReposRepository(config.scanDirectory)).singleton(),

    // Services
    sessionService: asClass(SessionService).singleton(),
    agentService: asClass(AgentService).singleton(),
    sandboxService: asClass(SandboxService).singleton(),
    worktreeService: asClass(WorktreeService).singleton(),
    usageService: asClass(UsageService).singleton(),
    watcherService: asClass(WatcherService).singleton(),
    cleanupService: asClass(CleanupService).singleton(),
  });

  return container;
}

export type AppContainer = ReturnType<typeof createAppContainer>;
```

---

## Services

Services receive repositories via Awilix constructor injection. The parameter names must match the container registration keys.

### SessionService (`packages/server/src/services/session.service.ts`)

Replaces the plan's `session/manager.ts`. Constructor receives:
```typescript
constructor(
  private sessionsRepo: SessionsRepository,
  private messagesRepo: MessagesRepository,
  private activityRepo: ActivityRepository,
  private reposRepo: ReposRepository,
  private agentService: AgentService,
  private worktreeService: WorktreeService,
  private config: ServerConfig,
)
```

Methods: `create()`, `list()`, `getById()`, `getMessages()`, `subscribe()`, `pause()`, `cancel()`, `sendMessage()`, `getHandoff()`, `getActivityFeed()` — same logic as the plan's `createSessionManager`, but using injected repos instead of raw DB functions.

### AgentService (`packages/server/src/services/agent.service.ts`)

Replaces `session/agent.ts`. Wraps Agent SDK `query()`. Receives `SandboxService` and `config` via constructor.

### SandboxService (`packages/server/src/services/sandbox.service.ts`)

Replaces `session/sandbox.ts`. Same logic (path containment, bash restrictions), exposed as a class with `createPreToolUseHook(worktreeRoot)` method.

### WorktreeService (`packages/server/src/services/worktree.service.ts`)

Replaces `session/worktree.ts`. Same `createWorktree`/`removeWorktree` logic, as methods on a class.

### UsageService (`packages/server/src/services/usage.service.ts`)

Replaces `usage/monitor.ts` + `usage/keychain.ts`. Combined into one service. Receives `config` via constructor. Methods: `getUsage()`, `getOAuthToken()`.

### WatcherService (`packages/server/src/services/watcher.service.ts`)

Replaces `watcher/local-sessions.ts`. Methods: `scanLocalSessions()`, `isSessionActive()`.

### CleanupService (`packages/server/src/services/cleanup.service.ts`)

Replaces `cleanup.ts`. Receives `sessionsRepo` and `worktreeService`. Methods: `start()`, `stop()`, `runCleanup()`.

---

## tRPC Integration

### Shared tRPC instance (`packages/server/src/trpc.ts`)

```typescript
import { initTRPC } from "@trpc/server";
import type { AppContainer } from "./container";

export interface TrpcContext {
  container: AppContainer;
}

const t = initTRPC.context<TrpcContext>().create();
export const router = t.router;
export const publicProcedure = t.procedure;
```

### Router pattern — resolve from container

```typescript
// packages/server/src/routers/sessions.router.ts
import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { createSessionInput } from "@tricorder/shared";

export const sessionsRouter = router({
  create: publicProcedure.input(createSessionInput).mutation(async ({ input, ctx }) => {
    const sessionService = ctx.container.resolve("sessionService");
    const id = await sessionService.create(input);
    return { id };
  }),

  list: publicProcedure.query(({ ctx }) => {
    return ctx.container.resolve("sessionService").list();
  }),

  // ... etc
});
```

### Server entry point — pass container as context

```typescript
// packages/server/src/index.ts
const container = createAppContainer(config, db);

const httpServer = createHTTPServer({
  router: appRouter,
  createContext: () => ({ container }),
});
```

---

## CLI — Shared Client Factory

Extract duplicated `SERVER_URL` + tRPC client creation into a shared module:

```typescript
// packages/cli/src/client.ts
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@tricorder/server";

const SERVER_URL = process.env.TRICORDER_URL || "http://localhost:3141";

export function createClient() {
  return createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: SERVER_URL })] });
}
```

All command files import `createClient()` instead of duplicating the setup.

---

## Migration Path from Plan

| Plan Reference | Replaced By |
|---|---|
| `packages/server/src/db/index.ts` (raw SQL) | `db/schema.ts` + `db/index.ts` (Drizzle) |
| `packages/server/src/db/sessions.ts` | `repositories/sessions.repo.ts` |
| `packages/server/src/db/messages.ts` | `repositories/messages.repo.ts` |
| `packages/server/src/db/activity.ts` | `repositories/activity.repo.ts` |
| `packages/server/src/routers/repos.ts` (scanRepos fn) | `repositories/repos.repo.ts` (class) |
| `packages/server/src/session/manager.ts` | `services/session.service.ts` |
| `packages/server/src/session/agent.ts` | `services/agent.service.ts` |
| `packages/server/src/session/sandbox.ts` | `services/sandbox.service.ts` |
| `packages/server/src/session/worktree.ts` | `services/worktree.service.ts` |
| `packages/server/src/usage/monitor.ts` + `keychain.ts` | `services/usage.service.ts` |
| `packages/server/src/watcher/local-sessions.ts` | `services/watcher.service.ts` |
| `packages/server/src/cleanup.ts` | `services/cleanup.service.ts` |
| Multiple `initTRPC.create()` calls | Single `src/trpc.ts`, routers resolve from container |
| CLI duplicated `SERVER_URL` | `packages/cli/src/client.ts` shared factory |

All router files become thin (delegate to services), all services use constructor injection, all data access goes through Drizzle-backed repositories.

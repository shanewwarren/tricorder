# Tricorder — Design Spec

A mobile-first remote interface for managing Claude Code agent sessions on your development machine, accessible from your phone over Tailscale.

## Problem

You run multiple Claude Code sessions on your computer but have no way to interact with them while away from your desk. You want to kick off autonomous coding tasks from your phone (e.g., on a walk), monitor progress in real-time, course-correct if needed, and seamlessly hand sessions back to your terminal when you return.

## Solution

A three-component system:

1. **Tricorder API Server** — a Bun/TypeScript service running on your dev machine that wraps the Claude Agent SDK, manages sessions in isolated git worktrees, and exposes a typed API over Tailscale
2. **Tricorder Mobile App** — a React Native (Expo) app on your phone for browsing repos, launching sessions, monitoring live streams, and controlling session lifecycle
3. **Tricorder CLI** — a thin CLI for resuming phone-initiated sessions in your terminal

## Architecture

```
┌─────────────────────┐         Tailscale          ┌──────────────────────────────────┐
│   React Native App  │◄──────────────────────────►│     Tricorder API Server (Bun)    │
│                     │       tRPC (HTTP + WS)      │                                  │
│  • Session list     │                             │  ┌────────────────────────────┐  │
│  • Live viewer      │                             │  │ tRPC Router                │  │
│  • New session form │                             │  │  • repos.*                 │  │
│  • Usage dashboard  │                             │  │  • sessions.*              │  │
│  • Config           │                             │  │  • localSessions.*         │  │
│                     │                             │  │  • usage.*                 │  │
└─────────────────────┘                             │  │  • config.*                │  │
                                                    │  └────────────────────────────┘  │
                                                    │                                  │
                                                    │  ┌────────────────────────────┐  │
                                                    │  │ Session Manager            │  │
                                                    │  │  • Agent SDK query() calls │  │
                                                    │  │  • Git worktree isolation  │  │
                                                    │  │  • Message buffering       │  │
                                                    │  │  • Session persistence     │  │
                                                    │  └────────────────────────────┘  │
                                                    │                                  │
                                                    │  ┌────────────────────────────┐  │
                                                    │  │ Local Session Watcher      │  │
                                                    │  │  • Watches ~/.claude/      │  │
                                                    │  │  • Detects terminal sesns  │  │
                                                    │  └────────────────────────────┘  │
                                                    │                                  │
                                                    │  ┌────────────────────────────┐  │
                                                    │  │ Usage Monitor              │  │
                                                    │  │  • OAuth from Keychain     │  │
                                                    │  │  • Polls usage API         │  │
                                                    │  └────────────────────────────┘  │
                                                    └──────────────────────────────────┘
```

## Components

### 1. API Server

**Runtime:** Bun + TypeScript

**API Layer:** tRPC with HTTP and WebSocket transports. tRPC provides end-to-end type safety — the same type definitions used on the server are consumed directly by TanStack Query on the mobile app via `@trpc/react-query`. No code generation, no schema drift.

**tRPC Router:**

```
repos.list          — scan configured directory, return repo names + metadata
repos.detail        — branches, recent commits for a given repo

sessions.create     — create worktree, start Agent SDK query(), return session ID
sessions.list       — all sessions with status (active, paused, completed)
sessions.detail     — session metadata + full message history
sessions.message    — send follow-up message into a session
sessions.pause      — pause a running session
sessions.cancel     — cancel a running session
sessions.handoff    — returns structured handoff data: { sessionId, sessionName, worktreePath, resumeCommand }
                       does not change session state — session must already be paused/completed/error
sessions.stream     — tRPC subscription (WebSocket) streaming Agent SDK messages
                       accepts optional `lastSeenIndex` param for reconnection
                       server replays buffered messages from that index forward

localSessions.list  — detected Claude Code terminal sessions
localSessions.detail — read-only conversation history for a terminal session
localSessions.takeover — resume a terminal session via Agent SDK

usage.current       — current usage data (session, weekly, model-specific, overage)

config.get          — current server configuration
```

**Session Manager:**

Each session created via `sessions.create` follows this lifecycle:

1. Create a git worktree from the selected repo + branch into an isolated directory
2. Call Agent SDK `query()` with the user's prompt, configured `allowedTools`, plugins (superpowers), and MCP servers
3. Stream messages from the async iterator into a buffer (SQLite-backed)
4. Forward messages to any connected WebSocket subscribers
5. Handle cancel (abort iteration) and message queueing (send follow-up via new `query()` with `resume: sessionId`)

**Concurrency:** The server supports multiple concurrent Agent SDK sessions. A configurable `maxConcurrentSessions` limit (default: 5) prevents resource exhaustion. When the limit is reached, new session creation returns an error with a clear message ("max concurrent sessions reached — cancel or wait for an existing session to complete"). Each `query()` call runs its own async iterator; Bun handles the concurrency natively.

**Session Resume:** The Agent SDK natively supports session resumption via the `resume` option — passing a session ID to `query()` continues with full conversation context. This is the same mechanism Claude Code CLI uses with `claude --resume`. Each follow-up message or "continue after pause" creates a new `query()` call with `resume: sessionId`, preserving the full conversation history.

**Pause behavior:** Pausing a session means allowing the current `query()` iteration to complete (Claude finishes its current response), then not sending further messages. The session remains resumable via its ID. The server marks it as "paused" in the database. Resuming creates a new `query()` call with `resume: sessionId`.

**Session Modes:**

- **Autonomous** — all tools pre-approved via `allowedTools`: Read, Write, Edit, Bash, Glob, Grep, Agent, WebSearch, WebFetch. No human prompts. Pre-tool-use hooks enforce safety (block writes outside worktree, block dangerous bash patterns).
- **Interactive** — read-only tools pre-approved (Read, Glob, Grep). Write/Edit/Bash trigger approval prompts forwarded to the mobile app via WebSocket. If the phone is disconnected when an approval prompt fires, the session blocks and the prompt is queued. When the phone reconnects, all pending prompts are delivered. There is no auto-timeout — the session waits until approved or cancelled. This is intentional: interactive mode is for when you want to stay in the loop, not for fire-and-forget.

**Sandboxing (v1):**

- Git worktree isolation — each session operates in its own worktree, cannot affect main working directory or other sessions
- Agent SDK `PreToolUse` hooks enforce these rules:
  - **Path containment:** Block Read/Write/Edit operations targeting paths outside the session's worktree directory
  - **Bash restrictions:** Block commands matching destructive patterns: `rm -rf /`, `rm -rf ~`, `sudo *`, `chmod -R 777`, `mkfs.*`, `dd if=*`, `:(){ :|:& };:` (fork bomb). Path traversal check: resolve the command's working directory + any file arguments to absolute paths, block if any resolved path falls outside the worktree root. This is resolved-path checking, not raw string matching — `cd subdir && cat ../file.txt` is allowed if it stays within the worktree.
  - **Network restrictions:** No restrictions on network access (needed for `npm install`, `git clone`, etc.)
  - Hook returns `{ decision: "block", reason: "..." }` with a human-readable explanation when triggered
- nono.sh kernel-level sandbox deferred to v2

**Session Persistence:**

SQLite database (`~/.tricorder/tricorder.db`) stores:
- Session metadata (ID, name, repo, branch, mode, status, created/updated timestamps)
- Message history (ordered, typed messages from the Agent SDK stream)
- Worktree paths

Session statuses: `active`, `paused`, `completed`, `cancelled`, `error`. The `error` status captures Agent SDK failures, stream errors, or unexpected crashes. Error sessions store the error message and stack trace in a `lastError` field. The UI shows these with a red status pill and the error message.

**Error handling:** If `query()` throws or the stream errors mid-session, the session is marked `error` with the exception details. The user can retry (creates a new `query()` with `resume: sessionId`) or cancel. SQLite write failures are caught and logged — the message buffer continues in memory, with a degraded "persistence unavailable" flag on the session.

This enables reconnection without message loss and survives server restarts.

**Worktree Cleanup:** When a session reaches a terminal state (`completed`, `cancelled`, `error`), the worktree is retained for 24 hours so the user can review results or resume via CLI. After 24 hours, a background cleanup job removes the worktree directory and updates the session record. The cleanup interval runs every hour. Sessions that are resumed (via CLI or retry) reset their TTL. A `sessions.delete` procedure allows manual cleanup.

**Local Session Watcher:**

Uses chokidar to watch Claude Code's session directory (`~/.claude/`). Detects active terminal sessions and exposes them as read-only via `localSessions.*` procedures.

**Detection mechanism:** Claude Code stores sessions as JSON files in `~/.claude/projects/`. The watcher scans for session files and determines status by checking for a running `claude` process with a matching session ID (via `ps aux | grep claude` filtered by session arguments). Sessions with a matching active process are marked "active" (read-only in the UI). Sessions without an active process are marked "idle" (eligible for takeover). Detection is best-effort — Claude Code's session format is internal and may change. If detection fails, all discovered sessions default to "idle" with a warning indicator.

**Takeover flow:** The "takeover" action is only available for terminal sessions that are **idle** (not actively streaming). The user must stop their terminal Claude Code session first (Ctrl+C or let it finish). The server then resumes the session via `query({ resume: sessionId })`, using the terminal session's original working directory as the cwd (no new worktree created — the server adopts the existing workspace). The session is tracked in the Tricorder database from this point forward. Attempting to take over an actively running terminal session is blocked — the UI shows "session is active in terminal, stop it first to take over."

**Usage Monitor:**

Reads OAuth credentials from macOS Keychain (same approach as claudecodeusage). Polls `api.anthropic.com/api/oauth/usage` every 60 seconds. Caches results in memory with a TTL. Exposes four usage tiers:

- **Session** — 5-hour rolling window, percentage + reset countdown
- **Weekly** — 7-day rolling window
- **Sonnet Only** — model-specific limit
- **Overage** — dollar amount against monthly cap

Note: this uses an undocumented API. Designed to degrade gracefully if the endpoint changes.

**Configuration:**

Server config file (`~/.tricorder/config.json`):

```json
{
  "scanDirectory": "~/code",
  "host": "100.x.x.x",          // bind to Tailscale interface IP (NOT 0.0.0.0 — that exposes on all interfaces)
  "port": 3141,
  "plugins": ["superpowers"],  // loaded via Agent SDK's `plugins` option — references installed Claude Code plugins by name
  "mcpServers": {
    "figma": { "command": "...", "args": ["..."] },
    "context7": { "command": "...", "args": ["..."] }
  },
  "maxConcurrentSessions": 5,
  "defaultMode": "autonomous",
  "defaultAllowedTools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep", "Agent", "WebSearch", "WebFetch"]
}
```

### 2. Mobile App

**Stack:** Expo (managed workflow), NativeWind (Tailwind CSS), Expo Router, TanStack Query via `@trpc/react-query`, Zustand (WebSocket stream state)

**State Management Split:**
- **TanStack Query (via tRPC)** — all request/response data: repo lists, session lists, session details, usage, config
- **Zustand** — live WebSocket stream state: active message buffer per session, connection status, last seen index for reconnection

**Navigation:** Bottom tab bar with three tabs:

1. **Sessions** — session list + live viewer
2. **Repos** — browse available repositories
3. **Config** — server settings + defaults

**Screens:**

**Sessions List (Home)**

Filter bar: All / Active / Paused / Done / Local

Each session row shows:
- Title (prompt summary)
- Repo name + mode badge (autonomous/interactive)
- Status pill — green "running", amber "waiting" (needs approval), gray "completed", blue "local" (terminal session)
- Activity subtitle — current tool being used, or "Needs approval: Edit auth.ts", or "12 files changed • 3 min ago"

Local terminal sessions are visually distinguished with a "local terminal" label.

Floating action button opens New Session.

**Live Session View**

Header: session title, repo, mode, elapsed time. Pause (amber) and Cancel (red) action buttons.

Full conversation stream (auto-scrolling):
- **Claude text** — dark card with prose
- **Tool: Read** — compact: filename + line count
- **Tool: Edit** — filename + inline diff (red/green), collapsible for long diffs
- **Tool: Bash** — command + output, color-coded by exit status
- **Tool: Grep/Glob** — pattern + result count
- **Approval prompt** (interactive mode) — highlighted card with Approve/Deny buttons

On reconnection after disconnect, the live view auto-scrolls to the first pending approval prompt (if any). The Sessions List tab shows a badge count of sessions with pending approvals so the user can find them quickly.

Bottom bar: text input for follow-up messages.

When paused/completed: bottom bar replaced with handoff banner showing copyable `tricorder resume <name>` command.

**New Session**

Form with:
- Repository picker (dropdown of scanned repos)
- Branch picker (optional, defaults to main)
- Prompt textarea
- Mode toggle: Autonomous ("Fire & forget") / Interactive ("Approve changes")
- Launch button

**Usage Dashboard**

Tapping the persistent header usage indicator opens a detail view (bottom sheet or full screen) with four cards:
- Session (5h window) — percentage, progress bar, reset countdown
- Weekly (7d window) — percentage, progress bar, reset countdown
- Sonnet Only (model-specific) — percentage, progress bar, reset countdown
- Overage — dollar amount, progress bar, monthly cap

**Config / Server Setup**

First-run experience: the app prompts for the server's Tailscale IP and port (e.g., `100.x.x.x:3141`). This is stored in AsyncStorage on the device. The server's `/api/config.get` endpoint serves as a health check — if it responds, the connection is valid. The config screen shows:

- Server connection status (Tailscale IP, port, connected/disconnected indicator)
- Scan directory path
- Default session mode
- Enabled plugins list
- Configured MCP servers
- Button to change server address

**Persistent Usage Header**

Visible on all screens. Green dot + percentage (e.g., "3%"). Color shifts: green (0-60%), yellow (60-85%), red (85-100%). Tapping opens the full usage dashboard.

### 3. CLI

A thin Bun CLI (`tricorder`) for terminal-side operations:

```bash
tricorder resume <session-name>   # resolve session → cd to worktree → claude --resume <id>
                                  # works for both server-spawned and terminal sessions
                                  # (Agent SDK and Claude Code CLI share session storage —
                                  #  this is a core assumption; if they diverge, handoff
                                  #  falls back to starting a fresh session with context summary)
tricorder list                    # list all sessions (same as mobile view)
tricorder status                  # show server status + usage
```

Installed globally via the monorepo. Communicates with the running server via tRPC client.

### 4. Session Handoff

Bidirectional session mobility between phone and terminal:

**Phone → Terminal:**
1. Session completes or is paused from the phone
2. Mobile app shows: `tricorder resume <session-name>`
3. User copies command, runs in terminal
4. CLI resolves session ID + worktree path, opens `claude --resume <id>` in the worktree directory

**Terminal → Phone:**
1. Server's local session watcher detects active Claude Code terminal sessions
2. Phone shows them in the session list with a "local" badge
3. Read-only view of conversation history
4. "Take over" action resumes the session via Agent SDK, transitioning control to the server

## Tech Stack Summary

| Component | Technology |
|-----------|-----------|
| Runtime | Bun |
| API | tRPC (HTTP + WebSocket subscriptions) |
| Agent Engine | @anthropic-ai/claude-agent-sdk |
| Database | SQLite (bun:sqlite — native to Bun, no native module compilation) |
| Git Operations | simple-git |
| File Watching | chokidar |
| Validation | zod (shared with mobile via tRPC) |
| Mobile Framework | Expo (managed) |
| Mobile Styling | NativeWind |
| Mobile Navigation | Expo Router |
| Mobile Data | @trpc/react-query + TanStack Query |
| Mobile State | Zustand (WebSocket streams) |
| Mobile Testing | Expo EAS MCP |
| Network | Tailscale (no additional auth) |

## Project Structure

```
tricorder/
  packages/
    server/          — Bun + tRPC + Agent SDK
    mobile/          — Expo + React Native
    shared/          — zod schemas, tRPC router types, constants
    cli/             — thin Bun CLI binary (exports `tricorder` command via package.json `bin` field)
```

The monorepo uses Bun workspaces. The CLI package declares a `bin` field in its `package.json` and can be installed globally via `bun link` from the `packages/cli` directory.

The `shared` package is consumed by both server and mobile. tRPC's type inference means the mobile app gets full autocomplete and type checking on every API call with zero code generation.

## Security

- **Network:** Tailscale mutual authentication. Server binds to the Tailscale interface IP (configured in `host` field, e.g., `100.x.x.x`). Never bind to `0.0.0.0` in production — that exposes the server on all network interfaces. No additional auth layer.
- **Sandboxing (v1):** Git worktree isolation per session. Agent SDK PreToolUse hooks block writes outside worktree and dangerous bash patterns.
- **Sandboxing (future):** nono.sh kernel-level sandbox as optional Bash execution backend.
- **Usage API:** Undocumented endpoint — designed to degrade gracefully. No secrets stored by Tricorder; reads existing Keychain credentials.

## Future Enhancements (v2)

- **Scheduled sessions (cron)** — "kick off task X at 1am, task Y at 3am" — server already manages sessions, adding a scheduler is a natural extension
- **nono.sh sandbox integration** — kernel-level isolation for autonomous sessions
- **Session forking** — branch off from a point in a session to explore a different approach
- **Push notifications** — alert when an autonomous session completes or an interactive session needs approval

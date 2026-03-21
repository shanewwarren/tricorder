# Tricorder — Open Items

## High Priority

### 1. Session takeover stub
**Effort:** Medium
**File:** `packages/server/src/routers/local-sessions.router.ts`

The `localSessions.takeover` mutation currently just returns `{ id, name, directory }` without actually resuming the session. The mobile UI shows a "Take Over Session" button that calls this but nothing happens.

**What needs to happen:**
- Use the Agent SDK to resume the local Claude Code session (the `agentSessionId` is stored in Claude's session JSON files in `~/.claude/projects/`)
- Create a new server-managed session entry in the DB, linking it to the resumed agent session
- Transition the UI from the local session detail view to the live server session view with streaming
- The `SessionService.sendMessage` flow already handles resuming via `resumeSessionId` — takeover needs similar plumbing but starting from a local session's agent ID rather than a server-managed one

### 2. Launch Session validation feedback
**Effort:** Low
**File:** `packages/mobile/app/new-session.tsx`

The Launch Session button silently does nothing when the prompt is empty (`if (!selectedRepo || !prompt.trim()) return`). No visual indication that something is wrong.

**What needs to happen:**
- Visually disable the button (gray it out) when `!selectedRepo || !prompt.trim()`
- Optionally show a subtle hint text like "Enter a prompt to launch" below the button
- Also show a loading/spinner state while `createSession.isPending` (currently just grays the background but keeps the same text)

### 3. Approval prompt buttons are no-ops
**Effort:** Medium
**Files:** `packages/mobile/app/session/[id].tsx`, `packages/server/src/routers/sessions.router.ts`

When Claude requests tool approval in a session, the mobile UI renders an `ApprovalPrompt` with Approve/Deny buttons. Both `onApprove` and `onDeny` are empty callbacks (`() => {}`).

**What needs to happen:**
- Add `sessions.approve` and `sessions.deny` mutations to the server router
- The Agent SDK supports responding to approval requests — the server needs to capture the pending approval ID from the message stream and expose it
- Wire the mobile buttons to call these mutations with the session ID and approval ID
- After approval/denial, the agent continues or stops — the existing stream subscription should pick up subsequent messages automatically

## Low Priority

### 4. CLI package is empty
**Effort:** Medium
**File:** `packages/cli/`

The `packages/cli` directory exists with a basic `package.json` and entry point but no implementation. The design spec describes a CLI for session handoff (`tricorder resume <session-name>`).

**What needs to happen:**
- Implement `tricorder resume <name-or-id>` that calls `sessions.handoff` and runs `claude --resume <agentSessionId>` in the user's terminal
- Implement `tricorder list` to show active sessions
- Implement `tricorder status <id>` to check a session
- The server already has all the APIs — this is purely a CLI client wrapping tRPC calls

### 5. `pointerEvents` deprecation warning
**Effort:** Low

React Native warns `props.pointerEvents is deprecated. Use style.pointerEvents`. This comes from a dependency (likely react-navigation), not our code. Cosmetic only — will resolve when the dependency updates.

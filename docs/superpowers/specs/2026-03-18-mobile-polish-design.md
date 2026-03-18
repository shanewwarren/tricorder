# Mobile Polish — Design Spec

Post-wiring cleanup: type safety, UX fixes, and local sessions integration.

## 1. Remove `as any` casts in settings screen

**File:** `packages/mobile/app/(tabs)/settings.tsx`

The `config` object returned by `trpc.config.get.useQuery()` should be fully typed via tRPC's inference from the `ServerConfig` zod schema in `packages/shared/src/schemas/config.ts`. The `as any` casts were a shortcut during wiring.

**Fix:** Remove all `(config as any)` casts and access `config.host`, `config.port`, `config.scanDirectory`, `config.defaultMode`, `config.plugins`, `config.mcpServers` directly. If tRPC inference doesn't resolve the types (unlikely but possible with the untyped Awilix container resolution), add an explicit `.output()` call on the config router procedure referencing the `serverConfig` zod schema.

Also fix the `selectedMode` state initialization — `useState` only uses its argument on first render, so the server's `defaultMode` is ignored when it loads async. Add a `useEffect` to sync:

```ts
useEffect(() => {
  if (config?.defaultMode) setSelectedMode(config.defaultMode);
}, [config?.defaultMode]);
```

## 2. MCP servers empty state

**File:** `packages/mobile/app/(tabs)/settings.tsx`

When `isConnected` is true but `Object.entries(config.mcpServers)` is empty, the MCP Servers section currently renders an empty container. Add the same empty-state pattern used by the plugins section:

```tsx
{Object.keys(mcpServers).length === 0 ? (
  <View style={{ backgroundColor: "#F1F1F1", borderRadius: 12, padding: 20, alignItems: "center" }}>
    <Feather name="server" size={20} color="#A8A29E" style={{ marginBottom: 6 }} />
    <Text style={{ fontFamily: "DM Sans", fontSize: 13, color: "#A8A29E" }}>
      No MCP servers configured
    </Text>
  </View>
) : (
  // existing server list
)}
```

## 3. Elapsed time ticker

**File:** `packages/mobile/app/session/[id].tsx`

The elapsed time is currently computed once per render as `Date.now() - createdAt`. It never updates, so the timer appears frozen.

**Behavior:**
- **Active sessions:** tick every second. Elapsed = `now - createdAt`.
- **Non-active sessions (paused, completed, cancelled, error):** show static elapsed = `updatedAt - createdAt`. The server updates `updatedAt` on every status change, so this captures the moment the session stopped being active.

**Implementation:** Add a `now` state variable with a `setInterval(1000)` that only runs when `session?.status === "active"`. Place the hook above the `if (!session)` guard to respect React hook rules. When the session is not active, compute elapsed from the session's own timestamps without the interval.

```ts
const [now, setNow] = useState(Date.now());
const isSessionActive = session?.status === "active";

useEffect(() => {
  if (!isSessionActive) return;
  const interval = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(interval);
}, [isSessionActive]);

// After the if (!session) guard:
const elapsedSeconds = isActive
  ? Math.floor((now - new Date(session.createdAt).getTime()) / 1000)
  : Math.floor((new Date(session.updatedAt).getTime() - new Date(session.createdAt).getTime()) / 1000);
```

## 4. Polling fallback when WebSocket disconnects

**File:** `packages/mobile/app/session/[id].tsx`

When the WebSocket stream is connected, the detail query doesn't need to poll. But if the stream errors or disconnects, the UI gets no updates at all. Add a conditional `refetchInterval`:

```ts
const { data: sessionData } = trpc.sessions.detail.useQuery(
  { id: id! },
  { enabled: !!id, refetchInterval: stream?.connected ? false : 5000 }
);
```

This gives graceful degradation — if WebSocket drops, the UI still updates every 5 seconds via HTTP polling.

## 5. Local sessions integration

**Files:**
- `packages/mobile/app/(tabs)/index.tsx` — merge local sessions into the list
- `packages/mobile/app/session/[id].tsx` — handle local session detail view

### Sessions list screen

Query both `trpc.sessions.list` and `trpc.localSessions.list`. Normalize local sessions to the same UI shape used by server sessions:

```ts
const { data: serverSessions } = trpc.sessions.list.useQuery();
const { data: localSessions } = trpc.localSessions.list.useQuery();

const sessions = useMemo(() => {
  const mapped = (serverSessions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    repoName: s.repoName,
    mode: s.mode as "autonomous" | "interactive",
    status: (s.status === "active" ? "running" : s.status === "cancelled" ? "completed" : s.status) as SessionStatus,
    lastActivity: s.lastActivity || s.lastError || "",
    isLocal: false,
  }));

  const local = (localSessions ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    repoName: s.directory,
    mode: "interactive" as const,
    status: "local" as SessionStatus,
    lastActivity: s.active ? "Active in terminal" : "Idle",
    isLocal: true,
  }));

  return [...mapped, ...local];
}, [serverSessions, localSessions]);
```

The existing `SEGMENT_STATUS_MAP` and filter logic already handles `Local: ["local"]`, so the filter will work.

### Session detail for local sessions

When navigating to a local session (identified by the `isLocal` flag), the session detail screen should use `trpc.localSessions.detail` instead of `trpc.sessions.detail`. Pass an `isLocal` query parameter via the route:

```ts
// In SessionCard, when navigating:
router.push(`/session/${session.id}?local=${session.isLocal}` as any);

// In session/[id].tsx:
const { id, local } = useLocalSearchParams<{ id: string; local?: string }>();
const isLocalSession = local === "true";
```

For local sessions, the detail view is read-only: no pause/cancel/send buttons, no stream subscription. Show the conversation history from `localSessions.detail` and a "Take Over" button that calls `localSessions.takeover`.

The `SessionCard` component needs an `isLocal` prop to pass through to navigation. The existing `"local terminal"` label display is already in `SessionCard` — it shows when `session.status === "local"`.

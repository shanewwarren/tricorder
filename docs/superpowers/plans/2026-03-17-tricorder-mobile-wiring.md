# Tricorder Mobile Wiring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Tricorder mobile app from mock data to real tRPC calls, configure NativeWind, and connect WebSocket streaming for live session views.

**Architecture:** The mobile app already has all screens built with mock data. The tRPC client (`src/lib/trpc.ts`) and Zustand store (`src/lib/store.ts`) exist but aren't connected. We need to: (1) set up the tRPC+QueryClient provider in the root layout, (2) replace mock data with tRPC hooks in each screen, (3) wire mutations for session lifecycle, and (4) connect WebSocket subscriptions for live streaming.

**Tech Stack:** Expo 55, tRPC 11, @trpc/react-query, TanStack React Query, Zustand 5, NativeWind 4, AsyncStorage

---

## Chunk 1: Foundation — NativeWind + tRPC Provider

### Task 1: Configure NativeWind babel and metro plugins

NativeWind 4 requires a babel preset and metro config to process Tailwind classes. The `tailwind.config.js` already exists with the correct content/presets. We need the babel config, metro config, and global CSS file.

**Files:**
- Create: `packages/mobile/babel.config.js`
- Create: `packages/mobile/metro.config.js`
- Create: `packages/mobile/global.css`
- Create: `packages/mobile/nativewind-env.d.ts`
- Modify: `packages/mobile/app/_layout.tsx` (add CSS import)

- [ ] **Step 1: Create babel.config.js**

```js
// packages/mobile/babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

- [ ] **Step 2: Create metro.config.js**

```js
// packages/mobile/metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

- [ ] **Step 3: Create global.css**

```css
/* packages/mobile/global.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Create nativewind-env.d.ts**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 5: Add global CSS import to root layout**

In `packages/mobile/app/_layout.tsx`, add this import at the top of the file (after the existing imports):

```ts
import "../global.css";
```

- [ ] **Step 6: Verify the app starts**

Run: `cd packages/mobile && bun expo start`
Expected: App boots without errors. Existing inline styles continue to work. NativeWind `className` prop now available on components.

- [ ] **Step 7: Commit**

```bash
git add packages/mobile/babel.config.js packages/mobile/metro.config.js packages/mobile/global.css packages/mobile/nativewind-env.d.ts packages/mobile/app/_layout.tsx
git commit -m "feat(mobile): configure NativeWind 4 babel/metro plugins and global CSS"
```

---

### Task 2: Add tRPC + QueryClient provider to root layout

The tRPC client is defined in `src/lib/trpc.ts` but there's no Provider wrapping the app. We need to create a provider component that initializes the tRPC client with the server URL from AsyncStorage, and wrap the root layout.

**Files:**
- Create: `packages/mobile/src/lib/TrpcProvider.tsx`
- Modify: `packages/mobile/app/_layout.tsx`

- [ ] **Step 1: Create TrpcProvider component**

```tsx
// packages/mobile/src/lib/TrpcProvider.tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { trpc, createTrpcClient } from "./trpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
    },
  },
});

const DEFAULT_URL = "http://localhost:3141";

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [trpcClient, setTrpcClient] = useState(() => createTrpcClient(DEFAULT_URL));

  useEffect(() => {
    AsyncStorage.getItem("tricorder-server-url").then((url) => {
      if (url && url !== DEFAULT_URL) {
        setTrpcClient(createTrpcClient(url));
        queryClient.clear();
      }
    });
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}

export { queryClient };
```

- [ ] **Step 2: Wrap root layout with TrpcProvider**

In `packages/mobile/app/_layout.tsx`, import and wrap `RootLayoutNav`:

Add import:
```ts
import { TrpcProvider } from "@/src/lib/TrpcProvider";
```

Change the `RootLayoutNav` component's return to wrap the `ThemeProvider` content:

```tsx
function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <TrpcProvider>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="session/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="new-session" options={{ headerShown: false }} />
          <Stack.Screen name="usage" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </ThemeProvider>
    </TrpcProvider>
  );
}
```

- [ ] **Step 3: Verify the app starts with providers**

Run: `cd packages/mobile && bun expo start`
Expected: App boots. No visible change yet (still mock data), but tRPC and QueryClient are now available throughout the tree.

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/src/lib/TrpcProvider.tsx packages/mobile/app/_layout.tsx
git commit -m "feat(mobile): add tRPC + React Query provider to root layout"
```

---

## Chunk 2: Wire Read Queries — Sessions, Repos, Activity, Usage, Config

### Task 3: Wire Sessions List screen to tRPC

Replace mock session data with `trpc.sessions.list.useQuery()`. The server returns sessions with fields: `id`, `name`, `repoName`, `branch`, `mode`, `status`, `lastActivity`, `lastError`, `createdAt`, `updatedAt`. The status values from the server are `active`, `paused`, `completed`, `cancelled`, `error` — we need to map these to the UI status types (`running`, `waiting`, `paused`, `completed`, `local`, `error`).

**Files:**
- Modify: `packages/mobile/app/(tabs)/index.tsx`

- [ ] **Step 1: Replace mock data with tRPC query**

In `packages/mobile/app/(tabs)/index.tsx`:

Remove the `Session` interface, `MOCK_SESSIONS` array, and the local `SessionStatus` type.

Add import at top:
```ts
import { trpc } from "@/src/lib/trpc";
```

Replace the sessions data inside `SessionsScreen`:

```ts
export default function SessionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeSegment, setActiveSegment] = useState(0);

  const { data: serverSessions, isLoading } = trpc.sessions.list.useQuery();

  // Map server status to UI status
  const sessions = useMemo(() => {
    if (!serverSessions) return [];
    return serverSessions.map((s) => ({
      id: s.id,
      name: s.name,
      repoName: s.repoName,
      mode: s.mode as "autonomous" | "interactive",
      status: (s.status === "active" ? "running" : s.status === "cancelled" ? "completed" : s.status) as
        "running" | "waiting" | "paused" | "completed" | "local" | "error",
      lastActivity: s.lastActivity || s.lastError || "",
    }));
  }, [serverSessions]);

  const filteredSessions = useMemo(() => {
    const allowedStatuses = SEGMENT_STATUS_MAP[SEGMENTS[activeSegment]];
    if (!allowedStatuses) return sessions;
    return sessions.filter((s) => allowedStatuses.includes(s.status));
  }, [sessions, activeSegment]);

  // ... rest of JSX stays the same
```

Keep the `SEGMENTS`, `SEGMENT_STATUS_MAP` constants and all the JSX as-is.

- [ ] **Step 2: Add loading state to the FlatList**

Add a simple loading indicator when data is loading. Replace the `<FlatList>` section to add `ListEmptyComponent`:

```tsx
<FlatList
  data={filteredSessions}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => <SessionCard session={item} />}
  contentContainerStyle={{
    paddingHorizontal: 21,
    paddingBottom: 100,
    gap: 12,
  }}
  showsVerticalScrollIndicator={false}
  ListEmptyComponent={
    <View style={{ paddingTop: 40, alignItems: "center" }}>
      <Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>
        {isLoading ? "Loading sessions..." : "No sessions yet"}
      </Text>
    </View>
  }
/>
```

- [ ] **Step 3: Verify sessions load from server**

Start the server: `cd packages/server && bun run dev`
Start the app: `cd packages/mobile && bun expo start`
Expected: Sessions screen shows real sessions from the server (or empty state if none exist).

- [ ] **Step 4: Commit**

```bash
git add packages/mobile/app/\(tabs\)/index.tsx
git commit -m "feat(mobile): wire sessions list to tRPC query"
```

---

### Task 4: Wire Repos screen to tRPC

Replace mock repos with `trpc.repos.list.useQuery()`. Server returns: `name`, `path`, `defaultBranch`, `lastCommitDate`.

**Files:**
- Modify: `packages/mobile/app/(tabs)/repos.tsx`

- [ ] **Step 1: Replace mock data with tRPC query**

In `packages/mobile/app/(tabs)/repos.tsx`:

Remove the `Repo` interface and `MOCK_REPOS` array.

Add import:
```ts
import { trpc } from "@/src/lib/trpc";
```

Inside `ReposScreen`, replace mock data:

```ts
export default function ReposScreen() {
  const insets = useSafeAreaInsets();
  const { data: repos, isLoading } = trpc.repos.list.useQuery();
```

Update `RepoCard` to accept the server's repo shape (which uses `name`, `path`, `defaultBranch`, `lastCommitDate` — no `id`):

```ts
function RepoCard({ repo }: { repo: { name: string; path: string; defaultBranch: string; lastCommitDate: string | null } }) {
```

Update the FlatList:

```tsx
<FlatList
  data={repos ?? []}
  keyExtractor={(item) => item.path}
  renderItem={({ item }) => <RepoCard repo={item} />}
  contentContainerStyle={{
    paddingHorizontal: 21,
    paddingBottom: 100,
    gap: 12,
  }}
  showsVerticalScrollIndicator={false}
  ListEmptyComponent={
    <View style={{ paddingTop: 40, alignItems: "center" }}>
      <Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>
        {isLoading ? "Loading repos..." : "No repos found"}
      </Text>
    </View>
  }
/>
```

In `RepoCard`, update the lastCommitDate display to handle null:
```ts
{repo.lastCommitDate ?? "No commits"}
```

- [ ] **Step 2: Verify repos load from server**

Expected: Repos screen shows real repos from the server's configured `scanDirectory`.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/app/\(tabs\)/repos.tsx
git commit -m "feat(mobile): wire repos list to tRPC query"
```

---

### Task 5: Wire Activity screen to tRPC

Replace mock activity data with `trpc.activity.list.useQuery()`. Server returns flat array of `ActivityEvent` objects: `{ id, sessionId, sessionName, type, description, timestamp }`. The type values are `created`, `completed`, `errored`, `paused`, `cancelled`, `approval_requested`. We need to group by date client-side and map event types.

**Files:**
- Modify: `packages/mobile/app/(tabs)/activity.tsx`

- [ ] **Step 1: Replace mock data with tRPC query and client-side grouping**

In `packages/mobile/app/(tabs)/activity.tsx`:

Remove the `ActivityEvent` interface (we'll use the server's type), `ActivityGroup` interface, and `MOCK_ACTIVITY` array.

Add imports:
```ts
import { trpc } from "@/src/lib/trpc";
```

Map server event types to UI event types in the `EVENT_CONFIG`:

```ts
type EventType = "completed" | "approval" | "error" | "started" | "paused" | "cancelled";

const EVENT_CONFIG: Record<EventType, { icon: keyof typeof Feather.glyphMap; color: string }> = {
  completed: { icon: "check-circle", color: "#16A34A" },
  approval: { icon: "alert-circle", color: "#D97706" },
  error: { icon: "x-circle", color: "#DC2626" },
  started: { icon: "play-circle", color: "#2563EB" },
  paused: { icon: "pause-circle", color: "#78716C" },
  cancelled: { icon: "minus-circle", color: "#78716C" },
};
```

Add a helper to group events by relative date and map types:

```ts
function mapEventType(serverType: string): EventType {
  switch (serverType) {
    case "created": return "started";
    case "errored": return "error";
    case "approval_requested": return "approval";
    default: return serverType as EventType;
  }
}

function groupByDate(events: Array<{ id: string; sessionName: string; type: string; description: string; timestamp: string }>): (string | { id: string; sessionName: string; type: EventType; description: string; timestamp: string })[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  const groups: Record<string, typeof events> = {};

  for (const event of events) {
    const eventDate = new Date(event.timestamp);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    let label: string;
    if (eventDay >= today) label = "TODAY";
    else if (eventDay >= yesterday) label = "YESTERDAY";
    else label = eventDay.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
  }

  const flat: (string | { id: string; sessionName: string; type: EventType; description: string; timestamp: string })[] = [];
  for (const [label, items] of Object.entries(groups)) {
    flat.push(label);
    for (const item of items) {
      flat.push({ ...item, type: mapEventType(item.type) });
    }
  }
  return flat;
}
```

Update `ActivityScreen`:

```ts
export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { data: events, isLoading } = trpc.activity.list.useQuery();

  const flatData = useMemo(() => {
    if (!events) return [];
    return groupByDate(events);
  }, [events]);

  // ... header JSX stays the same

  // Update FlatList to use flatData and add empty state
```

Update `EventRow` to use `EventType` instead of the old local type. The `timestamp` from the server is an ISO string — display as relative time:

```ts
function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

Use `formatRelativeTime(event.timestamp)` in `EventRow` instead of showing the raw timestamp.

- [ ] **Step 2: Add loading/empty state**

Add `ListEmptyComponent` to FlatList similar to other screens.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/app/\(tabs\)/activity.tsx
git commit -m "feat(mobile): wire activity feed to tRPC query with date grouping"
```

---

### Task 6: Wire Usage screen to tRPC

Replace mock usage data with `trpc.usage.current.useQuery()`. Server returns `{ tiers: Array<{ label, subtitle, percentage, resetIn, dollarAmount, dollarLimit }>, updatedAt, available }`.

**Files:**
- Modify: `packages/mobile/app/usage.tsx`
- Modify: `packages/mobile/src/components/UsageIndicator.tsx`

- [ ] **Step 1: Wire Usage screen**

In `packages/mobile/app/usage.tsx`:

Add import:
```ts
import { trpc } from "@/src/lib/trpc";
```

Replace the hardcoded `UsageCard` components with data from the query:

```tsx
export default function UsageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: usage, isLoading } = trpc.usage.current.useQuery();

  return (
    <View style={{ flex: 1, backgroundColor: "#FAFAF9", paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 21, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header stays the same */}
        <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 16, paddingBottom: 20, gap: 12 }}>
          <Pressable onPress={() => router.back()}>
            <Feather name="arrow-left" size={24} color="#1C1917" />
          </Pressable>
          <Text style={{ fontFamily: "DM Sans", fontSize: 28, fontWeight: "700", color: "#1C1917" }}>
            Usage
          </Text>
        </View>

        {!usage?.available ? (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>
              {isLoading ? "Loading usage..." : "Usage data unavailable"}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {usage.tiers.map((tier) => (
              <UsageCard
                key={tier.label}
                label={tier.label}
                subtitle={tier.subtitle}
                percentage={tier.dollarAmount == null ? tier.percentage : undefined}
                resetIn={tier.resetIn ?? undefined}
                dollarAmount={tier.dollarAmount ?? undefined}
                dollarLimit={tier.dollarLimit ?? undefined}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Wire UsageIndicator in sessions header**

In `packages/mobile/src/components/UsageIndicator.tsx`, the component currently accepts a hardcoded `percentage` prop. We need to fetch usage data and display the first tier's percentage.

Check the current component — if it accepts a `percentage` prop, update the Sessions screen (`app/(tabs)/index.tsx`) to pass real data instead:

Add to Sessions screen:
```ts
const { data: usage } = trpc.usage.current.useQuery();
const usagePercentage = usage?.available ? (usage.tiers[0]?.percentage ?? 0) : 0;
```

Then pass `usagePercentage` to `<UsageIndicator percentage={usagePercentage} />`.

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/app/usage.tsx packages/mobile/app/\(tabs\)/index.tsx packages/mobile/src/components/UsageIndicator.tsx
git commit -m "feat(mobile): wire usage screen and header indicator to tRPC"
```

---

### Task 7: Wire Settings screen to tRPC

Replace mock config with `trpc.config.get.useQuery()`. Server returns the full `ServerConfig` object. Settings also needs a first-run flow where the user enters their server URL.

**Files:**
- Modify: `packages/mobile/app/(tabs)/settings.tsx`

- [ ] **Step 1: Replace mock data with tRPC query and connection state**

In `packages/mobile/app/(tabs)/settings.tsx`:

Remove `MOCK_CONFIG`, `MOCK_PLUGINS`, `MOCK_MCP_SERVERS`.

Add imports:
```ts
import { trpc } from "@/src/lib/trpc";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "@/src/lib/TrpcProvider";
```

Update the component:

```ts
export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { data: config, isError, isLoading } = trpc.config.get.useQuery();
  const isConnected = !!config && !isError;

  const [serverUrl, setServerUrl] = useState("");
  const [editingUrl, setEditingUrl] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("tricorder-server-url").then((url) => {
      if (url) setServerUrl(url);
    });
  }, []);

  // Extract host/port from serverUrl for display
  const displayHost = serverUrl ? new URL(serverUrl).hostname : "";
  const displayPort = serverUrl ? new URL(serverUrl).port || "3141" : "3141";

  const defaultMode = (config as any)?.defaultMode ?? "autonomous";
  const plugins = (config as any)?.plugins ?? [];
  const mcpServers = (config as any)?.mcpServers ?? {};
  const scanDirectory = (config as any)?.scanDirectory ?? "";
```

Update the Server Connection section to show `displayHost`/`displayPort` instead of mock values.

Update the Plugins section to iterate `plugins` (array of strings):
```tsx
{plugins.map((plugin: string, i: number) => (
  <View key={plugin} style={{ /* existing styles */ }}>
    <Feather name="package" size={16} color="#1C1917" />
    <Text style={{ /* existing styles */ }}>{plugin}</Text>
    <View style={{ /* existing enabled badge styles */ }}>
      <Text style={{ /* ... */ }}>Enabled</Text>
    </View>
  </View>
))}
```

Update MCP Servers to iterate `Object.entries(mcpServers)`:
```tsx
{Object.entries(mcpServers).map(([name, server]: [string, any], i: number) => (
  <View key={name} style={{ /* existing styles */ }}>
    <Feather name="server" size={16} color="#1C1917" />
    <View style={{ flex: 1 }}>
      <Text style={{ /* ... */ }}>{name}</Text>
      <Text style={{ /* ... */ }}>{server.command}</Text>
    </View>
  </View>
))}
```

The "Connect Server" button in the first-run banner should open an alert or inline input to set the server URL:

```ts
const handleConnect = async () => {
  // For now, use a simple prompt — can be improved to inline input later
  const url = serverUrl || "http://100.x.x.x:3141";
  await AsyncStorage.setItem("tricorder-server-url", url);
  // Force re-render of TrpcProvider by reloading
};
```

- [ ] **Step 2: Commit**

```bash
git add packages/mobile/app/\(tabs\)/settings.tsx
git commit -m "feat(mobile): wire settings screen to tRPC config query"
```

---

## Chunk 3: Mutations — Create, Pause, Cancel, Send Message

### Task 8: Wire New Session screen with tRPC mutations

Replace mock repo/branch pickers with real data, and wire the Launch button to `trpc.sessions.create.useMutation()`.

**Files:**
- Modify: `packages/mobile/app/new-session.tsx`

- [ ] **Step 1: Replace mock repos with tRPC query**

In `packages/mobile/app/new-session.tsx`:

Remove `MOCK_REPOS` and `MOCK_BRANCHES`.

Add imports:
```ts
import { trpc } from "@/src/lib/trpc";
```

Add queries and mutation:
```ts
const { data: repos } = trpc.repos.list.useQuery();
const [selectedRepo, setSelectedRepo] = useState<{ name: string; path: string } | null>(null);

// Fetch branches when repo is selected
const { data: repoDetail } = trpc.repos.detail.useQuery(
  { path: selectedRepo?.path ?? "" },
  { enabled: !!selectedRepo }
);
const branches = repoDetail?.branches ?? ["main"];
const [selectedBranch, setSelectedBranch] = useState("main");

const [mode, setMode] = useState<Mode>("autonomous");
const [prompt, setPrompt] = useState("");

const utils = trpc.useUtils();
const createSession = trpc.sessions.create.useMutation({
  onSuccess: (data) => {
    utils.sessions.list.invalidate();
    utils.activity.list.invalidate();
    router.replace(`/session/${data.id}` as any);
  },
});
```

- [ ] **Step 2: Update repo picker to show real repos**

The repo picker is currently a `Pressable` that shows `selectedRepo.name`. Add a simple selection mechanism — show a scrollable list when tapped:

```ts
const [showRepoPicker, setShowRepoPicker] = useState(false);
```

Replace the repo `Pressable` `onPress` to toggle `setShowRepoPicker`. Below it, conditionally render:

```tsx
{showRepoPicker && repos && (
  <View style={{ borderWidth: 1, borderColor: "#D6D3D1", borderRadius: 12, marginBottom: 8, maxHeight: 200 }}>
    <ScrollView>
      {repos.map((repo) => (
        <Pressable
          key={repo.path}
          onPress={() => {
            setSelectedRepo(repo);
            setSelectedBranch(repo.defaultBranch);
            setShowRepoPicker(false);
          }}
          style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: "#F1F1F1" }}
        >
          <Text style={{ fontFamily: "DM Sans", fontSize: 15, color: "#1C1917" }}>{repo.name}</Text>
        </Pressable>
      ))}
    </ScrollView>
  </View>
)}
```

Do the same for branch picker using `branches` array.

- [ ] **Step 3: Wire Launch button to create mutation**

Replace the Launch button's `onPress`:

```ts
onPress={() => {
  if (!selectedRepo || !prompt.trim()) return;
  createSession.mutate({
    repoName: selectedRepo.name,
    branch: selectedBranch,
    prompt: prompt.trim(),
    mode,
  });
}}
```

Disable the button while loading:
```ts
style={({ pressed }) => ({
  backgroundColor: createSession.isPending ? "#A8A29E" : "#EA580C",
  // ... rest of existing styles
  opacity: pressed ? 0.9 : 1,
})}
```

- [ ] **Step 4: Auto-select first repo on load**

```ts
useEffect(() => {
  if (repos?.length && !selectedRepo) {
    setSelectedRepo(repos[0]);
    setSelectedBranch(repos[0].defaultBranch);
  }
}, [repos]);
```

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/app/new-session.tsx
git commit -m "feat(mobile): wire new session form to tRPC create mutation"
```

---

### Task 9: Wire Session Detail screen with tRPC queries and mutations

Wire the session detail view to fetch real session data, connect pause/cancel/retry mutations, and send follow-up messages.

**Files:**
- Modify: `packages/mobile/app/session/[id].tsx`

- [ ] **Step 1: Replace mock data with tRPC queries**

In `packages/mobile/app/session/[id].tsx`:

Remove `SessionData`, `MessageItem` types, `MOCK_SESSION`, `MOCK_ERROR_SESSION`.

Add imports:
```ts
import { trpc } from "@/src/lib/trpc";
```

Add queries and mutations:

```ts
export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState("");

  const { data: sessionData } = trpc.sessions.detail.useQuery(
    { id: id! },
    { enabled: !!id, refetchInterval: 3000 }
  );
  const utils = trpc.useUtils();

  const session = sessionData?.session;
  const messages = sessionData?.messages ?? [];

  const pauseMutation = trpc.sessions.pause.useMutation({
    onSuccess: () => utils.sessions.detail.invalidate({ id: id! }),
  });
  const cancelMutation = trpc.sessions.cancel.useMutation({
    onSuccess: () => utils.sessions.detail.invalidate({ id: id! }),
  });
  const sendMessage = trpc.sessions.message.useMutation({
    onSuccess: () => utils.sessions.detail.invalidate({ id: id! }),
  });

  if (!session) {
    return (
      <View style={{ flex: 1, backgroundColor: "#FAFAF9", justifyContent: "center", alignItems: "center" }}>
        <Text style={{ fontFamily: "DM Sans", fontSize: 14, color: "#A8A29E" }}>Loading session...</Text>
      </View>
    );
  }

  const isActive = session.status === "active";
  const isError = session.status === "error";
  const showInput = isActive;
  const showHandoff = !isActive;

  // Calculate elapsed time from createdAt
  const elapsedSeconds = Math.floor((Date.now() - new Date(session.createdAt).getTime()) / 1000);
```

- [ ] **Step 2: Update message rendering**

Messages from the server have shape `{ index, type, content, timestamp }`. The `type` field is one of: `assistant`, `tool_use`, `tool_result`, `result`, `error`, `status`, `approval_request`. The `content` field is a JSON blob whose shape depends on the type.

Update the message stream rendering to handle the server's message format:

```tsx
{messages.map((msg, i) => {
  if (msg.type === "assistant" || msg.type === "result") {
    const text = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
    return <MessageBubble key={i} content={text} />;
  }
  if (msg.type === "tool_use") {
    const content = msg.content as any;
    return (
      <ToolCard
        key={i}
        type={content.tool ?? "Bash"}
        title={content.tool ?? "Tool"}
        detail={content.input?.file_path ?? content.input?.command ?? ""}
      />
    );
  }
  if (msg.type === "approval_request") {
    const content = msg.content as any;
    return (
      <ApprovalPrompt
        key={i}
        action={content.description ?? "Pending approval"}
        onApprove={() => {
          // TODO: approval mutation when server supports it
        }}
        onDeny={() => {
          // TODO: denial mutation when server supports it
        }}
      />
    );
  }
  return null;
})}
```

- [ ] **Step 3: Wire Pause/Cancel/Retry buttons**

Update button onPress handlers:

Pause button:
```ts
onPress={() => pauseMutation.mutate({ id: session.id })}
```

Cancel button:
```ts
onPress={() => cancelMutation.mutate({ id: session.id })}
```

Retry button (for error state — resume with empty message):
```ts
onPress={() => sendMessage.mutate({ id: session.id, message: "Continue from where you left off." })}
```

- [ ] **Step 4: Wire send message**

```ts
const handleSend = () => {
  if (!inputText.trim()) return;
  sendMessage.mutate({ id: session.id, message: inputText.trim() });
  setInputText("");
};
```

- [ ] **Step 5: Wire handoff banner with server's resume command**

Use `trpc.sessions.handoff` to get the real resume command from the server instead of constructing it client-side:

```ts
const { data: handoff } = trpc.sessions.handoff.useQuery(
  { id: session.id },
  { enabled: !isActive }
);
```

Then in the JSX:

```tsx
<HandoffBanner command={handoff?.resumeCommand ?? `tricorder resume ${session.name.toLowerCase().replace(/\s+/g, "-")}`} />
```

- [ ] **Step 6: Update status pill mapping**

Map `"active"` → `"running"` for the StatusPill:

```ts
const uiStatus = session.status === "active" ? "running" :
                  session.status === "cancelled" ? "completed" :
                  session.status;
```

Use `uiStatus` where `StatusPill` is rendered.

- [ ] **Step 7: Commit**

```bash
git add packages/mobile/app/session/\\[id\\].tsx
git commit -m "feat(mobile): wire session detail to tRPC queries and mutations"
```

---

## Chunk 4: Real-Time Streaming

### Task 10: Connect WebSocket subscription for live session messages

Wire `trpc.sessions.stream` subscription in the session detail screen so messages appear in real time instead of polling.

**Files:**
- Modify: `packages/mobile/app/session/[id].tsx`
- Modify: `packages/mobile/src/lib/store.ts`

- [ ] **Step 1: Add subscription to session detail screen**

In `packages/mobile/app/session/[id].tsx`, add the stream store and subscription:

```ts
import { useStreamStore } from "@/src/lib/store";
```

Inside the component, after the query setup:

```ts
const { initStream, addMessage, setConnected, streams } = useStreamStore();
const stream = streams[id!];

// Initialize stream on mount
useEffect(() => {
  if (id) initStream(id);
}, [id]);

// Subscribe to live messages
trpc.sessions.stream.useSubscription(
  { id: id!, lastSeenIndex: stream?.lastSeenIndex ?? 0 },
  {
    enabled: !!id && !!stream,
    onData: (message) => {
      addMessage(id!, message);
    },
    onStarted: () => {
      setConnected(id!, true);
    },
    onError: () => {
      setConnected(id!, false);
    },
  }
);

// Merge: use stream messages if connected, fall back to query messages
const displayMessages = stream?.connected && stream.messages.length > 0
  ? stream.messages
  : messages;
```

Replace `messages.map(...)` with `displayMessages.map(...)` in the JSX.

- [ ] **Step 2: Auto-scroll on new stream messages**

Update the auto-scroll effect:

```ts
useEffect(() => {
  setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
}, [displayMessages.length]);
```

- [ ] **Step 3: Remove polling refetchInterval**

Now that we have real-time streaming, remove `refetchInterval: 3000` from the `trpc.sessions.detail.useQuery` call. Keep the query for initial load only.

- [ ] **Step 4: Clean up stream on unmount**

```ts
const clearStream = useStreamStore((s) => s.clearStream);
useEffect(() => {
  return () => {
    if (id) clearStream(id);
  };
}, [id]);
```

- [ ] **Step 5: Commit**

```bash
git add packages/mobile/app/session/\\[id\\].tsx packages/mobile/src/lib/store.ts
git commit -m "feat(mobile): connect WebSocket subscription for live session streaming"
```

---

## Chunk 5: Settings First-Run + Server URL Configuration

### Task 11: Implement server URL input and connection flow

The settings screen needs to let users enter their Tailscale IP to connect to the server. On first run, show the welcome banner. Store URL in AsyncStorage and reinitialize the tRPC client.

**Files:**
- Modify: `packages/mobile/app/(tabs)/settings.tsx`
- Modify: `packages/mobile/src/lib/TrpcProvider.tsx`

- [ ] **Step 1: Add URL change callback to TrpcProvider**

In `packages/mobile/src/lib/TrpcProvider.tsx`, expose a way for settings to trigger a client reconnect:

```ts
import React, { createContext, useContext, useCallback, useEffect, useState } from "react";

interface TrpcContextValue {
  reconnect: (url: string) => void;
  serverUrl: string;
}

const TrpcContext = createContext<TrpcContextValue>({ reconnect: () => {}, serverUrl: DEFAULT_URL });

export function useTrpcContext() {
  return useContext(TrpcContext);
}

export function TrpcProvider({ children }: { children: React.ReactNode }) {
  const [serverUrl, setServerUrl] = useState(DEFAULT_URL);
  const [trpcClient, setTrpcClient] = useState(() => createTrpcClient(DEFAULT_URL));

  useEffect(() => {
    AsyncStorage.getItem("tricorder-server-url").then((url) => {
      if (url && url !== DEFAULT_URL) {
        setServerUrl(url);
        setTrpcClient(createTrpcClient(url));
        queryClient.clear();
      }
    });
  }, []);

  const reconnect = useCallback((url: string) => {
    setServerUrl(url);
    setTrpcClient(createTrpcClient(url));
    queryClient.clear();
    AsyncStorage.setItem("tricorder-server-url", url);
  }, []);

  return (
    <TrpcContext.Provider value={{ reconnect, serverUrl }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </trpc.Provider>
    </TrpcContext.Provider>
  );
}
```

- [ ] **Step 2: Wire settings screen to use reconnect**

In `packages/mobile/app/(tabs)/settings.tsx`:

```ts
import { useTrpcContext } from "@/src/lib/TrpcProvider";

export default function SettingsScreen() {
  const { reconnect, serverUrl } = useTrpcContext();
  const [ipInput, setIpInput] = useState("");
  const [portInput, setPortInput] = useState("3141");
  const [editingConnection, setEditingConnection] = useState(false);

  const { data: config, isError } = trpc.config.get.useQuery();
  const isConnected = !!config && !isError;
```

Update the "Connect Server" button to show editable inputs:

```tsx
{(!isConnected || editingConnection) && (
  <View style={{ marginTop: 8, gap: 10 }}>
    <TextInput
      value={ipInput}
      onChangeText={setIpInput}
      placeholder="100.x.x.x"
      placeholderTextColor="#A8A29E"
      style={{
        borderWidth: 1, borderColor: "#D6D3D1", borderRadius: 12,
        padding: 14, fontFamily: "JetBrains Mono", fontSize: 14, color: "#1C1917",
      }}
    />
    <TextInput
      value={portInput}
      onChangeText={setPortInput}
      placeholder="3141"
      placeholderTextColor="#A8A29E"
      keyboardType="number-pad"
      style={{
        borderWidth: 1, borderColor: "#D6D3D1", borderRadius: 12,
        padding: 14, fontFamily: "JetBrains Mono", fontSize: 14, color: "#1C1917",
      }}
    />
    <Pressable
      onPress={() => {
        const url = `http://${ipInput}:${portInput}`;
        reconnect(url);
        setEditingConnection(false);
      }}
      style={{
        backgroundColor: "#EA580C", borderRadius: 12, paddingVertical: 12,
        alignItems: "center",
      }}
    >
      <Text style={{ fontFamily: "DM Sans", fontSize: 14, fontWeight: "700", color: "#FFFFFF" }}>
        Connect
      </Text>
    </Pressable>
  </View>
)}
```

Add a "Change Server" button when connected:
```tsx
{isConnected && !editingConnection && (
  <Pressable onPress={() => setEditingConnection(true)} style={{ marginTop: 8 }}>
    <Text style={{ fontFamily: "DM Sans", fontSize: 13, color: "#EA580C" }}>
      Change server
    </Text>
  </Pressable>
)}
```

- [ ] **Step 3: Commit**

```bash
git add packages/mobile/src/lib/TrpcProvider.tsx packages/mobile/app/\(tabs\)/settings.tsx
git commit -m "feat(mobile): implement server URL configuration and reconnect flow"
```

---

### Task 12: Final verification and cleanup

Run the full app end-to-end to verify all screens work with real data.

**Files:**
- No new files

- [ ] **Step 1: Start the server**

Run: `cd packages/server && bun run dev`
Expected: Server starts on configured host:port.

- [ ] **Step 2: Start the mobile app**

Run: `cd packages/mobile && bun expo start`
Expected: App boots without errors.

- [ ] **Step 3: Verify each screen**

1. **Settings** — Enter server URL, see connection status turn green, config loads
2. **Sessions** — Shows real sessions (or empty state), filters work
3. **Repos** — Shows repos from server's scan directory
4. **Activity** — Shows activity events grouped by date
5. **New Session** — Repo/branch pickers populate from server, create mutation works
6. **Session Detail** — Messages load, streaming works, pause/cancel/send work
7. **Usage** — Shows real usage data (or "unavailable" if no OAuth token)

- [ ] **Step 4: Run lint**

Run: `bun run check`
Expected: No new lint errors.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "chore(mobile): cleanup after wiring all screens to tRPC"
```

# Tricorder

A mobile remote interface for Claude Code — manage AI coding sessions from your phone over Tailscale.

## What It Does

- **Server** — runs on your dev machine, orchestrates Claude Agent SDK sessions in isolated git worktrees
- **Mobile app** — Expo-based iOS/Android app to create, monitor, and interact with sessions
- **CLI** — resume sessions in your terminal, check server status, list active work

## Prerequisites

- [Bun](https://bun.sh) (runtime + package manager)
- [Expo Go](https://expo.dev/go) or an Expo dev build on your phone
- [Tailscale](https://tailscale.com) on both your dev machine and phone
- An [Anthropic API key](https://console.anthropic.com) (for Claude Agent SDK)

## Quick Start

```bash
# Install dependencies
bun install

# Start the server
cd packages/server && bun run dev

# In another terminal, start the mobile app
cd packages/mobile && bun expo start

# Check server status from the CLI
bun run packages/cli/src/index.ts status
```

## Configuration

The server reads from `~/.tricorder/config.json` (created on first run with defaults):

```json
{
  "scanDirectory": "~/code",
  "host": "127.0.0.1",
  "port": 3141,
  "maxConcurrentSessions": 5,
  "defaultMode": "autonomous",
  "plugins": [],
  "mcpServers": {}
}
```

| Field | Description |
|-------|-------------|
| `scanDirectory` | Directory to scan for git repos |
| `host` | Server bind address (set to your Tailscale IP for remote access) |
| `port` | Server port |
| `maxConcurrentSessions` | Max concurrent Claude sessions |
| `defaultMode` | `autonomous` or `interactive` |
| `plugins` | Plugin list (future use) |
| `mcpServers` | MCP server definitions (`{ command, args }`) |

The SQLite database is stored at `~/.tricorder/tricorder.db`.

## Project Structure

```
packages/
  server/    — tRPC HTTP/WebSocket server, Claude Agent SDK, Drizzle SQLite
  mobile/    — Expo Router app with tabs (home, activity, repos, settings)
  shared/    — Zod schemas, types, and constants shared across packages
  cli/       — CLI commands: resume, list, status
```

## Next Steps

- [ ] Wire mock data to real tRPC calls in the mobile app
- [ ] Configure NativeWind (babel plugin + global CSS import)
- [ ] Set your Tailscale host IP in `~/.tricorder/config.json`
- [ ] Install on phone via Expo Go or a dev build
- [ ] Link the CLI globally: `cd packages/cli && bun link`

## Tech Stack

| Package | Stack |
|---------|-------|
| Server | Bun, tRPC, Drizzle ORM (SQLite), Awilix DI, Claude Agent SDK, WebSockets |
| Mobile | Expo 55, React Native 0.83, Expo Router, NativeWind, tRPC + React Query, Zustand |
| Shared | Zod schemas + TypeScript types |
| CLI | Bun, tRPC client |

## Development

```bash
# Run server tests
cd packages/server && bun test

# Lint
bun run check

# Format
bun run format
```

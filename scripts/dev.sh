#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

# Clear previous logs
> "$LOGS/server.log"
> "$LOGS/mobile.log"

exec concurrently \
  -n server,mobile \
  -c blue,magenta \
  "cd $ROOT/packages/server && bun --watch src/index.ts 2>&1 | tee $LOGS/server.log" \
  "cd $ROOT/packages/mobile && bun expo start 2>&1 | tee $LOGS/mobile.log"

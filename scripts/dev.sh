#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

# Port pool: 10 pairs of (server, metro)
PAIRS=(
  "3141:8081"
  "3142:8082"
  "3143:8083"
  "3144:8084"
  "3145:8085"
  "3146:8086"
  "3147:8087"
  "3148:8088"
  "3149:8089"
  "3150:8090"
)

# Find first available port pair
SERVER_PORT=""
METRO_PORT=""
for pair in "${PAIRS[@]}"; do
  sp="${pair%%:*}"
  mp="${pair##*:}"
  if ! lsof -i :"$sp" -sTCP:LISTEN >/dev/null 2>&1 && \
     ! lsof -i :"$mp" -sTCP:LISTEN >/dev/null 2>&1; then
    SERVER_PORT="$sp"
    METRO_PORT="$mp"
    break
  fi
done

if [ -z "$SERVER_PORT" ]; then
  echo "Error: No available port pairs in pool (3141-3150 / 8081-8090)"
  echo "Stop an existing instance or extend the pool in scripts/dev.sh"
  exit 1
fi

# Clear previous logs
> "$LOGS/server.log"
> "$LOGS/mobile.log"

echo "Starting Tricorder (server=$SERVER_PORT, mobile=$METRO_PORT)"

export TRICORDER_PORT="$SERVER_PORT"
export EXPO_PUBLIC_SERVER_PORT="$SERVER_PORT"

exec concurrently \
  -n server,mobile \
  -c blue,magenta \
  "cd $ROOT/packages/server && bun --watch src/index.ts 2>&1 | tee $LOGS/server.log" \
  "cd $ROOT/packages/mobile && bun expo start --port $METRO_PORT 2>&1 | tee $LOGS/mobile.log"

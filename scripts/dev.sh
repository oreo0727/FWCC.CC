#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if ! command -v node >/dev/null 2>&1; then
  export PATH="$PWD/.tools/node-v22.23.2-darwin-arm64/bin:$PATH"
fi
if ! command -v node >/dev/null 2>&1; then
  echo 'Install Node.js 22.13 or newer, then run this script again.' >&2
  exit 1
fi
if [ ! -d node_modules ]; then npm ci; fi
if [ ! -d mobile/node_modules ]; then npm --prefix mobile ci; fi
FWCC_LAN_IP=$(node -e 'const os=require("node:os");const list=Object.values(os.networkInterfaces()).flat();console.log(list.find(x=>x&&x.family==="IPv4"&&!x.internal)?.address||"localhost")')
export EXPO_PUBLIC_CONTENT_URL="${EXPO_PUBLIC_CONTENT_URL:-http://$FWCC_LAN_IP:8787/v1/content}"
npm run server &
FWCC_SERVER_PID=$!
trap 'kill "$FWCC_SERVER_PID" 2>/dev/null || true' EXIT INT TERM
npm --prefix mobile start -- --port 8081

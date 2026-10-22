#!/usr/bin/env bash
# Run against repository sources: design/ and _data/ are not published by Jekyll.
set -euo pipefail
cd "$(dirname "$0")/../.."
# Refuse stale listeners instead of probing somebody else's document root.
python3 -c 'import socket; sockets=[socket.socket() for _ in range(2)]; [s.bind(("127.0.0.1",p)) for s,p in zip(sockets,[8813,9233])]'
PROFILE=$(mktemp -d /tmp/morphology-chrome.XXXXXX)
cleanup() {
  for pid in "${CHROME:-}" "${SERVER:-}"; do
    [ -z "$pid" ] || kill -TERM -- "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  rm -rf "$PROFILE"
}
trap cleanup EXIT INT TERM
setsid python3 design/probe/serve.py 8813 "$PWD" >/tmp/morphology-server.log 2>&1 & SERVER=$!
setsid chromium --headless --no-sandbox --enable-unsafe-swiftshader --disable-dev-shm-usage \
  --disable-background-networking --no-first-run --remote-debugging-port=9233 \
  --user-data-dir="$PROFILE" about:blank >/tmp/morphology-chrome.log 2>&1 & CHROME=$!
CDP_PORT=9233 node "design/probe/${PROBE:-morphology.mjs}"

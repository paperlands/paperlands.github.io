#!/usr/bin/env bash
# The fourth turn's runner. One shell lifetime for the server and chromium, its own ports so a
# just-finished run's TIME_WAIT does not block the next one, and a refusal of a real listener.
#
#   PROBE=fourth-turn-act.mjs bash design/probe/fourth-turn.sh    # the act, on a built site
#   PROBE=fourth-turn-gate.mjs bash design/probe/fourth-turn.sh   # the recipes, on the pin
#   node --test design/probe/fourth-turn-model.test.mjs           # the arithmetic, in node
#
# The act probe needs TURN_SITE_BASE: a server already running on that port, rooted at a *built*
# site directory that was rebuilt for this run. Neither the harness nor the probe can tell a fresh
# build from a stale one, so a forgotten rebuild measures an older page and reports it as truth.
# The gate and the model test do not need it.
set -euo pipefail
cd "$(dirname "$0")/../.."
HTTP_PORT="${HTTP_PORT:-8814}"
CDP_PORT="${CDP_PORT:-9234}"
python3 - "$HTTP_PORT" "$CDP_PORT" <<'PY'
import socket, sys
for port in (int(sys.argv[1]), int(sys.argv[2])):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind(("127.0.0.1", port))
    except OSError as exc:
        raise SystemExit(f"port {port} is held by a live listener: {exc}")
    finally:
        s.close()
PY
PROFILE=$(mktemp -d /tmp/fourth-turn-chrome.XXXXXX)
cleanup() {
  for pid in "${CHROME:-}" "${SERVER:-}"; do
    [ -z "$pid" ] || kill -TERM -- "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  rm -rf "$PROFILE"
}
trap cleanup EXIT INT TERM
setsid python3 design/probe/serve.py "$HTTP_PORT" "$PWD" >/tmp/fourth-turn-server.log 2>&1 & SERVER=$!
setsid chromium --headless --no-sandbox --enable-unsafe-swiftshader --disable-dev-shm-usage \
  --disable-background-networking --no-first-run --remote-debugging-port="$CDP_PORT" \
  --user-data-dir="$PROFILE" about:blank >/tmp/fourth-turn-chrome.log 2>&1 & CHROME=$!
export HTTP_PORT CDP_PORT
export PROBE_BASE="${PROBE_BASE:-http://127.0.0.1:$HTTP_PORT/design/probe/fourth-turn.html}"
CDP_PORT="$CDP_PORT" node "design/probe/${PROBE:-fourth-turn-act.mjs}"

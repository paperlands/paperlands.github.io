#!/usr/bin/env bash
# Two immutable builds, one owned browser; no copied /tmp scripts or shared profile.
set -euo pipefail
PROBE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
NEW_SITE="${NEW_SITE:-$PROBE_DIR/../../_site}"
OLD_SITE="${OLD_SITE:?Set OLD_SITE to a frozen baseline build}"
CDP_PORT="${CDP_PORT:-9223}"
CHROMIUM_PATH="${CHROMIUM_PATH:-chromium}"
PROBE="${PROBE:-triage.mjs}"
for dir in "$NEW_SITE" "$OLD_SITE"; do
  [ -d "$dir" ] || { echo "Missing build: $dir" >&2; exit 1; }
done
[ -f "$PROBE_DIR/$PROBE" ] || { echo "Unknown probe: $PROBE" >&2; exit 1; }
WORK="$(mktemp -d "${TMPDIR:-/tmp}/paperland-probe.XXXXXX")"
pids=()
cleanup() {
  # Kill only the process groups this invocation owns, including Chrome children.
  for pid in "${pids[@]}"; do
    kill -TERM -- "-$pid" 2>/dev/null || true
    kill -KILL -- "-$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  rm -rf -- "$WORK"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Refuse occupied endpoints rather than accidentally measuring a stale build.
for port in 8801 8802 "$CDP_PORT"; do
  if curl -s --max-time 1 -o /dev/null "http://127.0.0.1:$port/"; then
    echo "Port $port is occupied; stop its owner or choose another CDP_PORT." >&2
    exit 1
  fi
done
setsid python3 "$PROBE_DIR/media-serve.py" 8801 "$NEW_SITE" >"$WORK/new.log" 2>&1 & pids+=("$!")
setsid python3 "$PROBE_DIR/media-serve.py" 8802 "$OLD_SITE" >"$WORK/old.log" 2>&1 & pids+=("$!")
setsid "$CHROMIUM_PATH" --headless --remote-debugging-port="$CDP_PORT" --no-sandbox --disable-gpu \
  --disable-dev-shm-usage --hide-scrollbars --no-first-run --disable-sync \
  --disable-background-networking --disable-component-update \
  --user-data-dir="$WORK/profile" about:blank >"$WORK/chromium.log" 2>&1 & pids+=("$!")

ready=false
for _ in $(seq 1 60); do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" 2>/dev/null; then
      cat "$WORK/"*.log >&2
      exit 1
    fi
  done
  if curl -fsS --max-time 1 "http://127.0.0.1:$CDP_PORT/json/version" >/dev/null 2>&1 &&
     curl -fsS --max-time 1 http://127.0.0.1:8801/ >/dev/null 2>&1 &&
     curl -fsS --max-time 1 http://127.0.0.1:8802/ >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 0.25
done
if [ "$ready" != true ]; then
  cat "$WORK/"*.log >&2
  echo 'Probe services never became ready.' >&2
  exit 1
fi
CDP_PORT="$CDP_PORT" timeout --signal=TERM --kill-after=5 "${PROBE_TIMEOUT:-180}" node "$PROBE_DIR/$PROBE" "$@"

#!/usr/bin/env bash
# One-shot probe runner: servers + chromium + probe all inside a single shell
# lifetime, because detached background processes are reaped here.
set -u
NEW_SITE="${NEW_SITE:-/home/putra/paperland/paperlands.github.io/_site}"
OLD_SITE="${OLD_SITE:-/tmp/pl-baseline/site}"
CDP_PORT="${CDP_PORT:-9223}"

cleanup() {
  # Kill the whole process GROUP, not just the PIDs we started.
  #
  # Chromium forks utility/renderer children that do not die with the parent.
  # The original version killed only $CHROME_PID, and across one session that
  # leaked 121 headless browsers, drove the load average to 8.7, and roughly
  # doubled every Jekyll phase — which briefly looked like a code regression
  # in the build. Everything here is started with setsid so it forms its own
  # group and can be torn down as a unit.
  for pid in "${CHROME_PID:-}" "${SRV1:-}" "${SRV2:-}"; do
    [ -n "$pid" ] && kill -TERM "-$pid" 2>/dev/null
    [ -n "$pid" ] && kill -KILL "$pid" 2>/dev/null
  done
  # belt and braces: the probe is the only thing here that opens this port
  pkill -9 -f "remote-debugging-port=$CDP_PORT" 2>/dev/null
  wait 2>/dev/null
}
trap cleanup EXIT INT TERM

setsid python3 /tmp/probe/serve.py 8801 "$NEW_SITE" >/dev/null 2>&1 & SRV1=$!
setsid python3 /tmp/probe/serve.py 8802 "$OLD_SITE" >/dev/null 2>&1 & SRV2=$!

rm -rf /tmp/cdp-profile
setsid chromium --headless --remote-debugging-port="$CDP_PORT" --no-sandbox --disable-gpu \
  --disable-dev-shm-usage --hide-scrollbars --no-first-run --disable-sync \
  --disable-background-networking --disable-component-update \
  --user-data-dir=/tmp/cdp-profile about:blank >/tmp/chromium.log 2>&1 & CHROME_PID=$!

for _ in $(seq 1 60); do
  curl -s -m 1 "http://127.0.0.1:$CDP_PORT/json/version" >/dev/null 2>&1 && break
  sleep 0.25
done
for _ in $(seq 1 40); do
  curl -s -m 1 -o /dev/null http://127.0.0.1:8801/ && curl -s -m 1 -o /dev/null http://127.0.0.1:8802/ && break
  sleep 0.25
done

CDP_PORT="$CDP_PORT" node /tmp/probe/"${PROBE:-fingerprint.mjs}" "$@"

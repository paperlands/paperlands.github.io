#!/usr/bin/env bash
# Consume Dojo's release producer, including its actual working source revision.
# Usage: design/hatch-pull.sh [--dojo <dir>] [--no-build] [--no-check] [--keep]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOJO="${DOJO:-$HOME/dojo}"
BUILD_SITE=1
RUN_CHECK=1
KEEP=""
die() { printf 'hatch-pull: %s\n' "$*" >&2; exit 1; }
while [ $# -gt 0 ]; do
    case "$1" in
        --dojo) DOJO="${2:?--dojo needs a directory}"; shift 2 ;;
        --no-build) BUILD_SITE=""; shift ;;
        --no-check) RUN_CHECK=""; shift ;;
        --keep) KEEP=1; shift ;;
        -h|--help) sed -n '2,3p' "$0"; exit 0 ;;
        *) die "unknown argument: $1" ;;
    esac
done
[ -f "$DOJO/scripts/release/host.mjs" ] || die "Dojo has no host release producer: $DOJO"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/hatch-pull.XXXXXX")"
cleanup() { [ -n "$KEEP" ] || rm -rf "$TMP"; }
trap cleanup EXIT
node "$DOJO/scripts/release/host.mjs" "$TMP/release"
node "$ROOT/design/vendor.mjs" --from-release "$TMP/release" --install
if [ -n "$RUN_CHECK" ]; then
    if [ -n "$BUILD_SITE" ]; then
        if ! (cd "$ROOT" && bundle exec jekyll build >"$TMP/jekyll.log" 2>&1); then
            tail -20 "$TMP/jekyll.log" >&2
            die "pin installed, but site build failed"
        fi
    else
        printf 'hatch-pull: --no-build checks the existing _site; stale references will fail\n'
    fi
    node "$ROOT/design/vendor.mjs" --check
    python3 "$ROOT/design/probe/hatch.py"
fi
printf 'hatch-pull: Dojo-produced artifact installed; _data/hatch.yml records the exact source revision\n'
[ -z "$KEEP" ] || printf 'hatch-pull: retained %s\n' "$TMP"

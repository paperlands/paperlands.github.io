#!/usr/bin/env bash
# Consume Dojo's PaperLang release producer into an immutable served generation.
# Usage: toolchain/paperlang-pull.sh [--dojo <dir>] [--latest] [--no-build] [--no-check] [--keep]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOJO="${DOJO:-$HOME/dojo}"
BUILD_SITE=1
RUN_CHECK=1
LATEST=""
KEEP=""
die() { printf 'paperlang-pull: %s\n' "$*" >&2; exit 1; }
while [ $# -gt 0 ]; do
    case "$1" in
        --dojo) DOJO="${2:?--dojo needs a directory}"; shift 2 ;;
        --latest) LATEST=1; shift ;;
        --no-build) BUILD_SITE=""; shift ;;
        --no-check) RUN_CHECK=""; shift ;;
        --keep) KEEP=1; shift ;;
        -h|--help) sed -n '2,3p' "$0"; exit 0 ;;
        *) die "unknown argument: $1" ;;
    esac
done
[ -f "$DOJO/scripts/release/host.mjs" ] || die "Dojo has no host release producer: $DOJO"
TMP="$(mktemp -d "${TMPDIR:-/tmp}/paperlang-pull.XXXXXX")"
cleanup() { [ -n "$KEEP" ] || rm -rf "$TMP"; }
trap cleanup EXIT
cd "$ROOT"
node "$DOJO/scripts/release/host.mjs" "$TMP/release"
if [ -n "$LATEST" ]; then
    node "$ROOT/toolchain/vendor.mjs" --from-release "$TMP/release" --install --latest
else
    node "$ROOT/toolchain/vendor.mjs" --from-release "$TMP/release" --install
fi
if [ -n "$RUN_CHECK" ]; then
    if [ -n "$BUILD_SITE" ]; then
        if ! (cd "$ROOT" && bundle exec jekyll build >"$TMP/jekyll.log" 2>&1); then
            tail -20 "$TMP/jekyll.log" >&2
            die "generation installed, but the strict site build failed. If baked ink is stale, follow 'Release operations' in toolchain/README.md: PL_COMPILE_INK=1 bootstrap, run compile-ink through the public alias, then rebuild."
        fi
    else
        printf 'paperlang-pull: --no-build checks the existing _site; stale aliases will fail\n'
    fi
    node "$ROOT/toolchain/vendor.mjs" --check
    bundle exec ruby "$ROOT/toolchain/test/paperlang_aliases_test.rb"
    python3 "$ROOT/design/probe/paperlang.py"
fi
printf 'paperlang-pull: generation installed; _data/paperlang.json records its exact evidence\n'
[ -z "$KEEP" ] || printf 'paperlang-pull: retained %s\n' "$TMP"

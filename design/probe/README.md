# Maintained checks and opt-in browser tools

Keep checks for shipped code, not every experiment ever run. Retired Fourth Turn,
interval, open-garden and morphology studies, ignored-runtime tests, duplicate
visual probes and one-off knockout diagnostics have been removed. Git history
retains their sources; old design documents describe historical experiments,
not the current runnable suite. Measured decision summaries remain in `evidence/`
and `design/performance-knockouts.md`.

## Fast regression suite

From a clean checkout (Ruby/Bundler, Node 22+, Python 3):

```sh
bundle install
npm ci --no-audit --no-fund
JEKYLL_ENV=production bundle exec jekyll build
node design/mint-media.mjs verify
node --test design/probe/*.test.mjs
for test in design/probe/*_test.rb; do bundle exec ruby "$test" || exit; done
python3 design/probe/media_serve_test.py
npx --no-install workbox generateSW workbox-config.js
```

The tests cover compiled ink and its bounded decoder cache, image generation,
markup and its template text steps, notes, the media player and experiences
motion/lifecycle, release intake, trace arithmetic, scroll scheduling and the
local media server. They do not need Chromium, Dojo, ignored prototype modules,
private masters, or a mutable dependency download.

Two contracts render templates rather than read `_site/`: the experiences page
(mutating its data to prove the templates follow it) and the bracket resolver.
Both ask `contract_site.rb`, which is the only file in this directory that names
the generator — an engine swap means writing a second backend there, not the
assertions.

CI keeps each contract in a named step. Every PR builds once; the automatic
Lighthouse job downloads that same Pages artifact instead of installing Ruby,
installing the encoder and rebuilding it. Production analytics are blocked by
`.lighthouserc.json` so the budget measures first-party assets. The existing
three-run median budgets remain unchanged. The Performance budget workflow can
also be dispatched manually, building once before invoking the shared audit.
Only the release workflow's guarded deploy job publishes to Pages.

## Browser tools (local, opt-in)

These are not extra deployment gates. Use them for a relevant UI change, not
for every edit. CDP tools require Chromium and Node 22+; no npm browser library.

| Tool | Purpose |
| --- | --- |
| `triage.mjs`, `rules.mjs`, `eval.mjs`, `console.mjs` | Compare two frozen builds: rendered styles/geometry, winning declarations, arbitrary expressions, console/network errors |
| `contact.mjs`, `identity.mjs`, `nav-lantern.mjs`, `scroll.mjs` | Contact, navigation hit areas, keyboard interaction and native scroll |
| `experiences.mjs` | Current experiences page: responsive layout, readable content, accessibility states and media |
| `front-page-performance.mjs`, `experiences-performance.mjs` | Bounded, opt-in cold-load/scroll attribution; environment and arm controls are documented in each file |
| `static-grain.mjs` | Grain visibility lifecycle and paired snapshots (`TRACE=1` for paint attribution; pixel comparison needs Pillow) |
| `render-window.mjs` | Shared trace-window arithmetic, covered by a unit test |

Compare builds with the repo-local runner (Linux `setsid`, `timeout`, curl):

```sh
OLD_SITE=/tmp/baseline/site NEW_SITE=./_site \
  bash design/probe/run.sh / /experiences /about
PROBE=rules.mjs OLD_SITE=/tmp/baseline/site \
  bash design/probe/run.sh /beginnings 'article > div > h1' margin-top
```

The runner serves the builds on 8801/8802, uses an isolated Chromium profile,
fails on occupied endpoints or failed startup, bounds execution to 180 seconds
(`PROBE_TIMEOUT` overrides), and removes its own process groups/profile on exit.
It reads scripts directly from this checkout: no stale `/tmp/probe` copies and
no port-wide `pkill`. Set `CHROMIUM_PATH` or `CDP_PORT` if needed.

For single-build diagnostics, serve a frozen snapshot with either:

```sh
python3 design/probe/media-serve.py 4001 /tmp/snapshot/site
# Production-like text compression, used by Lighthouse:
node design/probe/perf-serve.mjs /tmp/snapshot/site 8090
```

Both resolve pretty permalinks and support media byte ranges. Start a dedicated
Chromium debugger for CDP tools and tear it down afterward. Read the selected
tool's environment options first (`BASE`, `BASE_URL` and `PROBE_BASE` differ).
Use an immutable build, bypass the service worker and distinguish software
headless attribution from actual device/field performance.

## Occasional static audits

`assets.py`, `catalog.py`, `coverage.py`, `looks.py`, `surfaces.py` inspect built
assets and surface declarations. `webfonts.py` is the self-hosted-font intake
tool. `hatch.py` is called by `design/hatch-pull.sh` for release intake; full
source verification requires the producer's uncommitted source snapshot. These
are opt-in maintenance tools, not additional per-PR jobs.

## Trust boundaries

Compare rendered elements by path, not class; exclude non-rendering nodes and
freeze animations before comparing geometry. Equivalent colour syntax and
individual transforms can look different in raw computed styles. Count matches
before trusting a selector: a hidden mobile navigation copy often matches first.
Native smooth scrolling is asynchronous; wait for it or request instant scroll.
The harness reports differences, not their acceptability, and frozen snapshots
do not test interaction, accessibility, or every viewport.

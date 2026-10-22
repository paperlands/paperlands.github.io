# probe — render-level differential testing

Dependency-free Chromium DevTools Protocol harness. It loads two builds of the
site side by side and compares what the browser actually renders, per element.

Render-level evidence, not stylesheet text. Comparing built CSS, grepping for
declarations and auditing rule counts all passed while a cull had in fact
repainted every heading on the site and three defects had been introduced by the
migration itself. Use this when a change must be shown not to move pixels.

## Requirements

Chromium, Python 3, Node >= 22 (needs global `fetch` and `WebSocket`).
No npm install, no Playwright, no Puppeteer.

The separate `hatch-parity.mjs` gate uses Dojo's locked Playwright tooling and
launches its own Chromium. It needs a served current build, not an old/new pair:

```sh
node --test design/probe/*.test.mjs
bundle exec jekyll build
python3 design/probe/hatch.py
BASE=http://localhost:4002 node design/probe/hatch-parity.mjs
```

`DOJO`, `PLAYWRIGHT_MODULE`, and `CHROMIUM_PATH` select non-default local tooling.
This is the current native-control/runtime gate. The older Fourth Turn act,
figure, and morphology probes below describe the pre-native study; do not
restore a JavaScript geometry model merely to satisfy their old expectations.

## Media and hero hotpath probes

These need a frozen build served with `media-serve.py` (byte ranges; `serve.py`
does not support them) and an isolated Chromium debugger:

- `hero-hotpaths.mjs` — same-video bare/shipped control, then single-factor arms.
  Copy `bare-lab.html` to the frozen site root first.
- `static-grain.mjs` — visibility-gated hero + landscape grain gate and grain-time-0
  pixel pairs; `TRACE=1` asserts zero Paint events for the offscreen landscape
  pseudos. The observer lives in `assets/js/home/grain-motion.mjs`.
- `hero-crossfade-cost.mjs` — fade-in over an opaque outgoing cell; all infinite
  clocks paused; synthetic opacity driver, not the production writer path.
- `render-window.mjs` — trace-window arithmetic, with `render-window.test.mjs`.
- `media-serve.py` — bounded single-range server, with `media_serve_test.py`.

`design/performance-knockouts.md` records the measured decisions; durable
summaries are under `design/probe/evidence/`.

## Usage

```sh
# Build both revisions first. `_site` is the new build; snapshot the old one
# somewhere and point OLD_SITE at it.
bundle exec jekyll build
NEW_SITE=./_site OLD_SITE=/tmp/baseline/site \
  PROBE=triage.mjs bash design/probe/run.sh / /about /tjc /turtle
```

`PROBE` selects the analysis; routes follow as arguments.

| probe          | question it answers                                                  |
|----------------|----------------------------------------------------------------------|
| `triage.mjs`   | per-route summary: layout drift and style drift, grouped by property  |
| `rules.mjs`    | which CSS rules actually win for one element + property, and the layer |
| `eval.mjs`     | run an arbitrary expression against both builds and diff the output   |
| `console.mjs`  | console errors and failed requests, per route, per build             |
| `helios.mjs`  | one page's own claims: slots bound to the look, marks, decoder cap, no overflow, reduced motion |
| `contact.mjs` | contact dialog: opens in place from a link on ANY page (checked on a note, not only on `/`), sharp form/no card, lazy captcha, native keyboard/focus, responsive scroll, reduced motion; screenshots + JSON in `/tmp/contact-evidence` |
| `identity.mjs` | the identity's hit area is the identity: every point over the drawn mark is the nav's brand link, in both looks that draw it, and no plate loses its own clicks |
| `scroll.mjs`   | the page scrolls under a *stationary* pointer: no band swallows the wheel, nothing pulls the reader back |
| `looks.py`    | every look binds published slots, never another component's classes |
| `assets.py`   | every `url()` in every built stylesheet resolves — the shared sheet and each mode (`assets/css/mode-*.css`) |
| `catalog.py`  | Helios names only real H.264 spines with posters |
| `hatch.py`    | independent pin, artifact, license, closure, source snapshot and revision checks; built page/frame import the pin |
| `hatch-parity.mjs` | real pinned runtime: accepted proposals AND canvas-local pixels, native touch, coherent subscriptions, run completion, replacement/disposal, overlays, DPR, consent, retries and readable no-JS baseline |
| `fourth-turn-backend.test.mjs`, `host-release.test.mjs` | deterministic consumer scheduling, ownership, obsolete completions, availability, release integrity and failed-update preservation |
| `fourth-turn-act.mjs` | the fourth turn as a visitor meets it, on the built homepage and the study: the four descriptions, the milestones the loop play keeps as snapshots, the series collapsing into `def polygon do`, the generalisation with `360/side` shown equating to the angle the hand holds, the act's own pace and the visitor's cooldown, the held press, direction-preserving queues, the executed/composed inspector, an unavailable or delayed viewport with its retry, reduced motion, Save-Data, no JavaScript, native scrolling and the 320/390px compositions; evidence in `/tmp/fourth-turn-act` |
| `fourth-turn-gate.mjs` | the recipes the page actually runs, measured on the pinned runtime: the vocabulary the act uses, the loop and the name drawing the identical square, side 4 of the generalisation corner for corner, `tan(pi/side)` differing from `tan(180/side)`, every milestone inside the fixed stage, and the page's own arithmetic (`figure.mjs`) against the runtime's ink; programs come from `programs.mjs` so the gate and the page cannot drift; evidence in `/tmp/fourth-turn-gate` |
| `fourth-turn-model.test.mjs` | `node --test`, in node alone: source-line maps, every chosen argument, the milestones and their exact counts, the descriptions as data (a complete descriptor each, the registry as the chain, no two stops advancing alike), the recipes checked line for line against the snapshot taken before the descriptions became data, and the one arithmetic of `figure.mjs` — the walk closing at each milestone, the placement the recipe performs, the dial riding the sweep, and a snapshot chip being the walk itself |
| `retired/` | the probes of the earlier shapes of the study (Phase 0's vocabulary and pursuit, the `square`/length/count instruments, the five-stop refinement, one-off diagnostics). They assert designs that no longer exist and fail on purpose; see `retired/README.md` |
| `interval.mjs` | the interval page's own contract: only the pinned hatch is fetched, every verse line is read, exactly one line claims to be current, the rests are struck on the beat, a body is paired with its `end`, the last `end` keeps the afterglow, reduced motion never fetches the runtime, a blocked hatch leaves the still |
| `passage.mjs` | the crossing between documents: the view transition actually runs, the animation that runs is the authored one, the departing page holds as the ground (so the dissolve never dips toward the canvas), the frame is in the same place on both documents, and reduced motion crosses at once; screencast frames + `report.json` in `/tmp/passage-evidence` |
| `18-bleed.mjs` | the frame study (`design/iterations/18-bleed.html`): per frame, the plate's left/right inset, the document's horizontal overflow, whether the hairline is drawn, whether the control reflects the frame, and whether the shipped ink reached each thought plane; three viewport widths; viewport screenshots + console in `/tmp/18-bleed-<width>-*.png`. Asserts nothing about *transitioning* properties — headless samples a CSS transition only on captured frames, so a value read mid-flight reports the previous state |
| `possibilities-spill.mjs` | the shipped possibilities plate's own edges, on the real page: the reading edge at the ground and the light edge at 0, the header still in its ground on both sides, the drawn hairline gone and the vignette kept, the shipped ink on the current scene, and no horizontal overflow — desktop scene by scene, at 390 and 320, and in the reduced-motion reading; screenshots in `/tmp/poss-spill-*.png`. Companion to `helios-possibilities.mjs`, which owns the fold behaviour |
| `helios-hall.mjs` | the close's rehearsal (`/helios-hall`): the three states it can be seen in (`alive`, `at rest`, and `today` — the shipped close, which must give the room's height back and lose the scene) at 1440 and 390, no horizontal overflow anywhere (the floor is deliberately wider than the frame and must be clipped, not laid out), the room one viewport with the colophon at its foot, the two CSS motions present when alive and absent at rest, and the embers actually painted by the runtime — sampled off the canvas, because that is the one thing the CSS cannot do; screenshots in `/tmp/hall-*.png`, including the *seam*, where the black the reader is already in has to open into the room rather than switch climate |

```sh
PROBE=rules.mjs  bash design/probe/run.sh /beginnings 'article > div > h1' margin-top
PROBE=eval.mjs   bash design/probe/run.sh /turtle 'getComputedStyle(document.querySelector(".CodeMirror")).fontSize'
PROBE=console.mjs bash design/probe/run.sh / /turtle /tjc
```

## How it works

`run.sh` starts two static servers and one Chromium **inside a single shell
lifetime**. That is not tidiness: in this environment detached background
processes are reaped between invocations, so `nohup`/`&` across calls fails
silently with an empty log.

`serve.py` resolves Jekyll's pretty permalinks (`/about` → `about.html`).
`python3 -m http.server` returns 404 for those, which silently measured an error
page for six of eight routes before it was noticed — 5 elements per route,
reporting "0 drift" because both builds 404'd identically.

`triage.mjs` fingerprints every rendered element: ~50 computed properties plus
the bounding box, keyed by **element path** (`body/2/0/1`), not by class.

## Known failure modes — read before trusting a diff

Every one of these produced a confident wrong answer at least once.

1. **Class-keyed comparison lies.** Deduping differences by class name reported
   `font-size: 19.2px → 16px` on the contact inputs. Direct interrogation showed
   all three compute 16px in both builds; the reported value belonged to a
   different element sharing the class. Compare by path.

2. **Colour spaces differ without differing.** v4 emits `oklab()` where v3
   emitted `rgba()`. Resolved through a 1×1 canvas so equivalent colours compare
   equal. Without this, every colour read as drift.

3. **v4 split `transform`.** `transform: matrix(1,0,0,1,0,32)` in v3 is
   `translate: 0 32px` in v4. Comparing only `transform` reports a difference for
   every translated element. `translate`, `scale` and `rotate` must be compared
   too.

4. **Non-rendering elements shift indices.** The old build carried one extra
   `<script>` (a dead theme toggle), so element counts differed by one and the
   comparison aborted. `SCRIPT`, `STYLE`, `LINK`, `META`, `NOSCRIPT`, `TEMPLATE`,
   `TITLE` and `HEAD` are excluded from the fingerprint.

5. **CDP does not always expand shorthands.** `CSS.getMatchedStylesForNode` with
   `cssProperties` filtered on `name === 'margin-top'` missed the rule that was
   actually winning with `margin: 0`. When a cascade question matters, use
   `rules.mjs` and read the raw declaration, or scan `document.styleSheets`.

6. **Selector ambiguity across tools.** `article > div > h1` returned 21.44px in
   one probe and 25.728px in another for the same route — different elements
   matched in different runs. When a number surprises you, count the matches
   before theorising about the cause.

7. **Animation and transitions make geometry unstable.** `triage.mjs` injects a
   freeze stylesheet before measuring.

8. **A stale server serves a deleted docroot, and everything reads as drift.**
   `run.sh` starts `serve.py` on :8801 and then probes. If an earlier server is
   still holding that port, the new one never binds, and if `_site` was rebuilt
   (`rm -rf _site`) in between, the old process is serving a directory that no
   longer exists. Every request returns `net::ERR_EMPTY_RESPONSE`, every
   selector returns null, and the probe reports a page that failed to load as
   dozens of confident failures — `data-look=null`, `thesis=null`, `mark
   unborn, pieces=0`. Measured twice in one session. Before believing a sudden
   wall of failures, check the server: `pgrep -f 'prob[e]/serve'`, and curl a
   route. One server is expected; two means one of them is lying.

9. **`design/probe/*` is executed from `/tmp/probe/`.** `run.sh` runs
   `node /tmp/probe/$PROBE`, so editing a probe in the repository has no effect
   until it is copied: `cp design/probe/*.mjs design/probe/*.py /tmp/probe/`.
   A probe that ignores your fix is usually a probe that never loaded it.
10. **The first match for a nav link is the mobile panel's copy of it.**
   `a[href="/our-approach"]` matches the link inside `[data-nav-panel]`, which
   is `display: none` above 1024px — a zero-sized box, so `run.sh`-style hit
   testing clicks at (0,0) and the leg measures nothing while reporting `ok`:
   true. Select the visible one (`.find(e => e.getClientRects().length)`), or
   name the surface it is on (`.folio-nav__plates a[href=…]`). The same trap
   with SVG anchors, which have no `HTMLElement.click` at all.

11. **Scroll is asynchronous on the notes.** `<html class="scroll-smooth">`
   makes `window.scrollTo` and `scrollIntoView` animate, so a rect measured
   immediately after is the rect before: the departing snapshot is captured
   at a scroll position nobody asked for. Set `scroll-behavior: auto` in the
   page, or wait for the scroll to settle, before measuring or clicking.

## What this harness cannot tell you

- Whether a change is *acceptable* — only that it happened, and where.
- Anything about a viewport other than the one set in `triage.mjs` (1280×900).
  Responsive behaviour is untested.
- Anything about interaction: hover, focus, keyboard, scroll-driven states, or
  the video carousels. The freeze stylesheet deliberately removes motion.
- Anything about accessibility semantics. Contrast, focus order and the
  accessibility tree are not measured.
- Whether a reported difference is *real drift*. `triage.mjs` canonicalises
  exactly three things — huge `borderRadius` values, `backgroundImage`
  colour-space syntax, and fully-transparent `boxShadow` layers. Everything
  else it reports as a difference and leaves to a human.

  `space-x/y` gaps, `transform` vs `translate`/`scale`, and the
  `#374151`/`#364153` prose colour are NOT encoded — they are reported as
  differences and adjudicated by hand. Do not add them to the canon as
  "equivalents": the `space-x/y` case is genuinely not equivalent (see
  `../architecture.org` T2), and treating it as one is what hid a lost heading
  margin.

  **The harness reports. A human adjudicates.** A judgement written in prose is
  not a test.

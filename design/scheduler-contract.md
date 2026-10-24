# Front-page clock: observed behavior, bounded contract

## Scope and decision

`assets/js/home/scroll-clock.mjs` is the existing shared abstraction for focus
words and compiled ink. Harden that seam, rather than introduce another scheduler,
move decoding into it, or migrate unrelated navigation/hero behavior speculatively.
The existing `subscribe`, `schedule`, and `invalidate` API is retained.

This contract concerns **subscribers only**. Navigation, the hero/wordmark and the
media controller still have independent event handlers and clocks. Neither this
module nor its tests promise page-wide read-before-write discipline or 60 FPS.

## Caller contract

```js
import { subscribe, schedule, invalidate } from './scroll-clock.mjs';
const dispose = subscribe({
  measure(y, viewportHeight, viewportWidth) { /* geometry reads, no DOM writes */ },
  paint(y, viewportHeight, viewportWidth) { /* cached geometry, changed writes only */ },
}, [journey, stage]);
// Decoded resource ready: schedule(). Geometry changed: invalidate().
// Component removed: dispose(). No component-owned rAF for this work.
```

- Either callback may be omitted. `elements` defaults to an empty array; pass an
  iterable of elements, not `null`. Null elements inside that iterable are ignored.
- One pending rAF at most, with no self-renewing timer. No subscribers, a hidden
  document, or a page suspended by `pagehide` means no scheduled callback.
- Ordinary scroll captures native y in the event handler and requests paint only.
  Resize, load, pageshow, font readiness/loadingdone, ResizeObserver, subscription,
  and explicit invalidation request a measured frame. Invalidations coalesce.
- A frame captures one viewport snapshot. All measures in current insertion order
  precede all paints in that order; both phases receive the same captured input.
- Frame membership is snapshotted. A subscription added during either phase waits
  for the next measured frame. **Removal wins immediately**: an already-measured
  subscription removed before its paint is not painted.
- Invalidation during either phase survives for the next measured frame. A plain
  `schedule()` during paint requests one extra paint-only frame. Callers must not
  unconditionally request more work: the clock does not suppress deliberate loops.
- Each subscription has an independent, idempotent disposer, even when the same
  client object is subscribed twice. Element observations are deduplicated within
  an owner and refcounted between owners. The main/body geometry root participates
  in those same lifetimes. The last owner cancels work and disconnects observation.
- A failed measure suppresses that owner's paint until a later **invalidation**
  measures successfully. Ordinary scroll does not retry geometry: previously
  painted output is held. Other owners continue in both phases.
- A failing phase is reported once per subscription lifetime, through native
  `reportError`, or an asynchronous throw where unavailable. Errors do not schedule
  retries. Paint errors can retry on external paint demand without flooding reports.
- `pagehide` cancels and suspends even asynchronous completion demands. `pageshow`
  resumes with remeasurement; visibility restoration also invalidates geometry.

## Iteration 1: reproduce before repairing

A fake event loop exercises the real import-free browser module, including its
listeners and observation ownership; no separate factory implementation is needed.
The harness verifies its three exports rather than silently rewriting any module.

```sh
node --test toolchain/test/scroll-clock.test.mjs
```

17 deterministic tests pass. Against the saved original 43-line module, the same
suite passes 5 and fails 12. These failures include lost reentrant invalidation,
unmeasured mid-frame additions, retained targets, empty-clock work, pagehide
rescheduling, exception starvation, and inconsistent captured input.
Some failures pin newly explicit API semantics, such as independent duplicate
subscriptions and optional callbacks, rather than a fault in an existing caller.

Local red-state reproduction (the archive is temporary, not a repository fixture):

```sh
SCROLL_CLOCK_SOURCE=/tmp/helios-scheduler-baseline/assets/js/home/scroll-clock.mjs \
  node --test toolchain/test/scroll-clock.test.mjs
```

Original module SHA-256:
`1e84f998069eb50ab230a0cf20823bb20a8548c175c16071203d42f99eb31249`.
Red/green logs: `/tmp/helios-clock-red.log`, `/tmp/helios-clock-green.log`.
Durable result counts, module hashes, browser provenance and rendering summaries
are in `design/probe/evidence/front-page-scheduler.json`. The old implementation
and large raw traces are deliberately not duplicated into the shipped source tree.

## Iteration 2: attribute rendering separately

`design/probe/front-page-performance.mjs` records warmed native gestures at
1440×900 and 390×844 / 4× CPU. It verifies actual displacement, visible documents,
compiled-page markup, no overflow and no runtime exceptions. It bypasses service
workers and disables network cache in an isolated debugger profile.

Ablations retain the authored fallbacks:

- Hero / posters: suppress the media controller and clear video sources before
  recording. This is not a deliberately broken video/error-path experiment.
- Hero / static banner: suppress `helios.js`, leaving the authored banner. This
  removes its choreography, copy restarts and play fill, not just its rAF overhead.
- Create / static ink: suppress the scrubber, retaining settled picture markup and
  the independent focus clock. Its catalogue decode count must be zero.

The probe records layout/style getters without a filename filter. Inline-style
assignments and attribute writes mark the write boundary. Reads inside wrapped rAF
callbacks are distinguished from reads in other tasks. These are **diagnostics**,
not proof that every read forced layout: not every DOM write API is instrumented,
and an outside-rAF read may occur after the browser already flushed styles.
Instrumentation itself also has cost. Distributions include gesture waits and
must not be presented as production FPS or input-latency benchmarks.

Two before/after matrices and four traces were inspected. Representative findings:

- Warmed Create: no intercepted geometry/style reads, no visitor interpreter,
  at most two concurrent image decodes. Removing the scrubber lowers scripting,
  but does not reliably remove the desktop frame-time tail.
- Desktop hero: normal median around 50 ms both before and after. Posters improve
  the distribution, while suppressing hero choreography alone does not reliably
  improve it. On the throttled phone, the static banner improves the median from
  about 33.3 to 16.7 ms; posters improve the tail. Those are attribution experiments,
  not approved replacements for the visual treatment.
  Gestures use equal absolute distances, not equal fractions of each hero's height.
  Cross-device choreography coverage therefore differs: the phone-only sunrise
  read reflects crossing its progress threshold, not a separate device code path.
- Phone hero still shows the intentional animation-restart computed-style read
  inside rAF, plus separate media/copy reads outside rAF. The scheduler cannot
  claim those independently owned callbacks conform to its phase contract.
- Before/after Create traces: software-compositor draw spans total about
  1.62/1.66 seconds versus main-thread lifecycle spans of about 75/67 ms.
  Hero software-compositor draw spans total about 3.66/3.73 seconds. These are
  exact-name inclusive event totals; nested events and parallel threads MUST NOT
  be summed into elapsed page time. Both traces indicate substantial rendering
  cost outside the clock's tiny callbacks.
- Tails vary between runs, including phone hero long tasks after the repair.
  **No frame-rate improvement is claimed for the clock repair.** Its gains are
  deterministic scheduling/lifetime/failure guarantees. Real-device GPU/media
  profiling is the next step before altering filters, video or choreography.

The baseline build used the same captured JS except the repaired clock; its local
static root is `/tmp/helios-scheduler-baseline/site`. Revised raw matrices/traces:
`/tmp/helios-front-v2-before/` and `/tmp/helios-front-v2-after/`.

## Reproduce the gates

Build first; use an isolated Chromium debugger, not a personal browser profile.
Keep browser/server processes within the shell lifetime and clean them up afterward.

```sh
node --test toolchain/test/*.test.mjs           # 89 pass at this milestone
ruby toolchain/test/compiled_ink_test.rb
bundle exec jekyll build

# With Chromium's isolated debugger running at 9247 and the site at 4001:
CDP_PORT=9247 node design/probe/scroll-budget.mjs
CDP_PORT=9247 PROBE_BASE=http://127.0.0.1:4001/ node design/probe/helios-focus.mjs
CDP_PORT=9247 TRACE=1 PROBE_OUTPUT=/tmp/front-page \
  node design/probe/front-page-performance.mjs
node design/probe/trace-summary.mjs /tmp/front-page/trace-hero.json \
  /tmp/front-page/trace-create.json > /tmp/front-page/trace-summary.json
```

Use `BASE` and distinct `PROBE_OUTPUT` directories for revision comparisons. Save
the original build **before** editing; never compare two servers sharing a mutable
`_site`. The normal scroll-budget and focus gates pass after this repair, including
reverse scroll, native touch/wheel, reduced motion, Save-Data, forced colors,
asset failure, no-JS fallback and responsive readability.

The subsequent rendering experiments and retained progress-fill layout improvement
are recorded in [`performance-knockouts.md`](performance-knockouts.md). They do
not enlarge the scheduler's scope or establish an FPS guarantee.

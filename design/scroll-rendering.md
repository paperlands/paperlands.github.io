# Rich ink, cheap passage

## The decision

The landing is a static publication, not a Paperlang editor. Its author has
already declared a finite range: 20 quantised scroll intervals, five distinct
Sierpinski depths and 21 torus counts. We should not ask every visitor to
interpret those programmes, initialise an interactive 3D host, synchronously
read its framebuffer, and blur millions of pixels on every gesture.

Compile the finite range through **the exact content-addressed host the site
pins**, not a second JavaScript implementation of either figure. Pay for the
pigment, glow and vignette at authoring time. The visitor selects a completely
decoded transparent image, then moves it and its light with transform/opacity.
This is not a timed movie: depth is still the clock and reversing selects the
shallower authored programme. The source stays in the page's inert template.
Other genuinely interactive surfaces keep their native Paperlang host.

A scene may also declare a small `twist`: the runtime rotates the decoded still
on the same depth. It is a compositor transform, not another render, and it needs
no new ink.

Both drawings start progressing when the section's top reaches 40% of viewport
height on mobile (width <=850px), or 55% on desktop. Resizing updates this timing
with the ink layout.

Priors informing the implementation:

- [MDN: Optimizing canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas): pre-render repeated work; separate static and changing layers; avoid repeated blur.
- [web.dev: High-performance animations](https://web.dev/articles/animations-guide): favour compositor-only properties, batch reads before writes, and measure actual rendering rather than assume a small callback means a cheap frame.
- [Workbox build](https://developer.chrome.com/docs/workbox/modules/workbox-build): audit the worker as well as image tags. Lazy markup is not lazy delivery if an origin-wide worker precaches every picture.
- Local native-gesture ablations: the expensive canvas filter/mask stack was the
  dominant sustained stall. Disabling analytics or the host's hidden overlay
  listener alone did not cure it. Caching raw pixels did not cache their final
  filtered rendering.

## Data flow

```
_data/helios_possibilities.yml       author: programme, numeric range, vignette, twist
_data/hatch.yml                     exact interpreter pin
            |
node toolchain/compile-ink.mjs         authoring machine; bounded browser renders
            |
assets/lib/helios/ink/*.webp         content-addressed transparent ink
_data/helios_ink.json               source/pin/compiler/model signatures + layouts
            |
Jekyll                             validates freshness and every asset digest
            |
<picture>                          useful settled art even without JavaScript
scroll-clock.mjs                   all geometry reads, then all pose writes
scroll-scrub.mjs + ink-cache.mjs    latest demand, decoded commit, bounded ownership
```

No visitor-side compiler, WebGL context, auxiliary turtle overlay, framebuffer
copy, timer pump, scroll write, wheel prevention or per-scroll geometry query.
Focus words and ink share one read-before-write clock. The navigation/wordmark
also capture native y before their animation callbacks write styles.

The subscriber-scoped lifecycle and phase guarantees, their deterministic tests,
and the later full-page rendering attribution are specified in
[`scheduler-contract.md`](scheduler-contract.md). That clock contract does not
extend to independently scheduled hero/navigation/media callbacks.

## Bounds

- Application-owned decoded/reserved image cache: **16 MiB across both plates**.
  This is not a claim about the browser's own resource cache or GPU memory.
- At most **two concurrent decodes**. Superseded intermediate demands never form
  a work queue. Current requests outrank adjacent-frame speculation.
- Each published image: at most **1.1 million pixels**. Two canonical aspect
  layouts: desktop at 1x, phone at 2x. Display resizing never reinterprets a programme.
  Between those aspects, image height follows the host camera's vertical field
  of view; horizontal centring/clipping preserves circles rather than stretching them.
- The catalogue deduplicates identical source (including the settled programme).
  Both layouts together are about **2.8 MB**, not an initial eager download.
  Only visible demands and a bounded adjacent state are requested by JavaScript;
  ordinary lazy pictures provide the settled fallback.
  The root-scoped /turtle service worker explicitly excludes the catalogue from
  precaching too; visiting the app cannot silently turn it into an eager download.
  Its image/media eviction limits use Workbox's supported expiration options.
- A compiler render has a **20-second wall-time budget** and the host's existing
  500,000-command / 60-recursion caps. Failed passes do not publish a new manifest.
- Six-bit alpha precision bounds quantisation error to 2/255 and substantially
  reduces the cost of otherwise imperceptible blur-tail precision.

The existing app worker's broad raster precache was also culled: a real Workbox
build fell from about 27.8 MB to 1.76 MB, with no compiled ink in the precache.
Visited raster art remains demand-cached (48 images; three media files).

The baked light is peak pigment/glow; runtime opacity supplies its ebb. This
preserves the atmosphere without independently recomputing brightness and two
blur kernels every frame. It is not claimed to be a byte-identical reproduction
of every old intermediate CSS filter value. Reference viewport comparisons
showed roughly 1–2 RGB levels of mean absolute difference, including grain phase.

## Authoring / regeneration

With the existing site served on port 4001:

```sh
BASE=http://127.0.0.1:4001 node toolchain/compile-ink.mjs
bundle exec jekyll build
```

Requires Node >=22, Chromium, Ruby, and a served build. No npm install or extra
browser library. The compiler starts and cleans up an isolated Chromium; an
optional `CDP_PORT` reuses an existing debugger. `CHROMIUM_PATH` selects its binary.

A change to programme/range, vignette, host pin, compiler or shared arithmetic
requires regeneration. A normal build **fails closed** with the regeneration
instruction instead of shipping misleading old ink. Commit the catalogue,
manifest and source changes together. No browser is needed in CI or deployment.

The freshness check hashes all of `assets/js/home/ink-state.mjs`, including
runtime-only scroll timing and comments. Editing those still requires running
the compiler to refresh the manifest, even when the drawing pixels are unchanged.

One distinct prior catalogue is retained for cached HTML during normal rolling
updates; older unreferenced generations are culled. Unchanged recompiles preserve
that prior catalogue. For rapid multi-generation deployments, extend retention
to cover the hosting/CDN HTML cache lifetime.

For first-time bootstrap, an unavailable/new host pin, or a composition change
that cannot be served while the freshness gate is failing:

```sh
PL_COMPILE_INK=1 bundle exec jekyll serve --port 4001
# In another terminal:
BASE=http://127.0.0.1:4001 node toolchain/compile-ink.mjs
# Stop the bootstrap server; then validate normally:
bundle exec jekyll build
```

The bypass is explicitly refused in production. Regenerate after changing the
canonical plate proportions as well: those determine the interpreter's camera
aspect. Neither a browser worker nor an alternative geometry model is a drop-in
replacement for this DOM-coupled pinned host.

## Gates and evidence

```sh
node --test toolchain/test/*.test.mjs
ruby toolchain/test/compiled_ink_test.rb
bundle exec jekyll build

# Start an isolated Chromium debugger, then:
CDP_PORT=9241 BASE=http://127.0.0.1:4001 node design/probe/scroll-budget.mjs
CDP_PORT=9241 PROBE_BASE=http://127.0.0.1:4001/ node design/probe/helios-focus.mjs
```

`BEFORE=http://127.0.0.1:4003` adds a baseline comparison to the scroll probe;
serve a saved pre-change build there. The probe warms the figure BEFORE issuing
native compositor gestures. An uninterrupted cold-page sweep misses the old
failure because the expensive figure often appears only after the gesture.

Measured warmed native gestures on the same machine:

| | Before | After |
|---|---:|---:|
| Desktop median frame interval | 1583 ms | 33.4 ms |
| Phone, 4x CPU, median frame interval | 400 ms | 16.7 ms |
| Phone, 4x CPU, p95 frame interval | 583 ms | 33.4 ms |
| Phone paint callback p95 | 9.5 ms | 1.4 ms |
| Scroll-time ink/focus geometry reads | 46 | 0 |
| Phone long tasks during gesture | 101, 167 ms | none |
| Visitor-side host module requests | yes | none |

These are **headless Chromium / software WebGL** measurements, not a promise of
those frame rates on every device. In particular the old desktop GPU timings
are extreme. Validate on real hardware too. The structural guarantees—no live
host, no readback, no scroll-time geometry queries, bounded decode/cache work—do
not depend on a favourable GPU.

The browser gates also cover reverse scroll, overflow, no-JS and reduced motion.
The focus gate covers 1440/390/320/landscape, live preference changes, forced
colours, Save-Data, idle stability, readability and unchanged hero treatment.
Asset or decode failure leaves the last complete picture; stale completions
cannot overwrite a newer requested depth. Application-owned cache limits and
coalescing/error behaviour are tested without a browser; Jekyll/CI verify source,
range, mask, pin and pixel digests.

# Performance knockouts: retain the measured, reject the speculative

This iteration was paired with `01a15bd1` as a read-only adversarial navigator.
Runtime edits stayed in the driver. Another session's carousel correctness fix
was completed first and included in the frozen baseline: compare neither layer
counts nor timings against the earlier three-cell cross-fade.

## Retained: fixed-box progress ink

`assets/js/home/helios.js` now writes a finite, clamped, unitless
`--helios-play` only when progress changes. `assets/css/components/helios.css`
keeps the decorative strip's box at 100% width, with left-origin
`translateZ(0) scaleX(var(--helios-play, 0))`. Promotion intent and the solid ink
are retained; there is no new timer, transition or scheduling abstraction.

The paired `design/probe/play-fill.mjs` gate uses the real hero node:

| Two alternating runs, 120 synthetic updates each | Layout count | Layout time |
|---|---:|---:|
| Width | 120 / 120 | 17.2 / 17.7 ms |
| Transform | 0 / 0 | 0 / 0 ms |
| No-write control | 0 / 0 | 0 / 0 ms |

An earlier run measured 33.9/32.2 ms for width, demonstrating why the stable
claim is the eliminated layouts, not a particular millisecond total. Transform
updates still need style calculation. **This is a small layout win, not an FPS
result**: real `timeupdate` frequency is much lower than synthetic rAF writes.
We do not claim zero whole-page paint or zero whole-page layout during playback.

Paired 3px-strip screenshots at p = 0, .001, .5, .999 and 1 have exactly zero RGB
difference in the measured browser. The p=0 versus p=1 image delta exceeds 73 RGB
levels, so parity is not two invisible controls. The shipped-handler gate also
checks native playback advances the fill, fixed box/left origin, invalid durations
and times, clamping, duplicate notifications without style writes, and clearing
the active clip. The legacy hero probe now reads the transform, not inline width.

Accepted platform boundaries: transforms are supported by the site's target
browsers; a no-transform engine would show the full strip rather than an empty
one. The physical-left origin assumes the current LTR page. RTL localization
would need a direction-aware origin. The decorative fixed-width box has no layout
dependents or interactive controls.

## Second iteration: hero hotpath, negative result and one retained repair

The follow-up hunt paired the driver with `01a15bd1` as a read-only adversarial
navigator. The decisive control was the same encoded clip at the same displayed
box and scroll position, with production JS on both sides: a bare fixture with no
hero CSS, grade, grain or carousel versus the shipped stationary hero. Four
alternating trials put the bare arm at 16.7 ms p50 (60 fps) and the shipped arm at
33.3 ms (30 fps); the traced pair put `Display::DrawAndSwap` p50 at 4.0 ms / 75
quads versus 30.5 ms / 2182 quads. That isolates the software compositor, not
JavaScript or decode.

Single-factor arms on a common static-grain base then showed that removing the
hero's static grain overlay or the live grade alone was enough to reach a 16.7 ms
median; removing the landscape, wordmark or scrim was not. Per draw, the control
cost about 22.9 ms, no-grain about 12.5 ms and no-grade about 8.4 ms, so the two
passes are roughly additive rather than an interaction. Both removals change
pixels and neither ships. **The hero cost is diagnosed, not repaired**: no
frame-time or FPS claim is made, and the remaining steady cost is the filtered
video under the static grain overlay on this headless software compositor.

### Retained: visibility-gated hero and landscape grain

The hero film grain and the three landscape surfaces keep the authored
background-position animation. The generic grain rule covers all four; the
landscape focus rule adds only the 24/76 join mask; the hero's
higher-specificity rule names `helios-grain` explicitly.
`assets/js/home/grain-motion.mjs` observes the hero fill and the three landscape
surfaces with an `IntersectionObserver`. Offscreen surfaces get
`data-grain-idle`, which pauses the pseudo; a visible surface removes it and the
surface's own step resumes: 2.5 Hz on the hero, 5 Hz on the landscape.

At scroll 0 the gate observes total Paint 109: the visible hero film grain emits
7 paints, the offscreen landscape surfaces 0 (the pre-fix build emitted 45
landscape paints there). The eight time-zero pairs are byte-identical at 1440
and 390 after hiding the stateful layers (carousel copy, hero video/play fill,
scroll art and the scroll-driven nav/wordmark); they compare the grain surface,
not the art pose. The hero pauses when scrolled away and resumes on return.

The hero clock runs at 2.4 s (2.5 Hz) with larger offsets: at the small landscape
step the film grain disappeared against the moving picture. It measures rAF
33.3 / 33.3 / 50 ms, `Display::DrawAndSwap` p50 39.4 ms / 2,637 ms,
`RasterTask` 343 / 946 ms and 116 paints. The small-step 2.5 Hz was 30.1 /
2,538 ms and 324 / 730 ms; the 5 Hz version was 49.7 / 2,697 ms and 577 /
1,427 ms; the hero-static gate was 26.2 / 2,282 ms and 122 / 503 ms. The larger
steps buy noticeability for roughly 9 ms of DrawAndSwap and ~200 ms of raster
over the small-step clock, still cheaper than 5 Hz. The next move is to bake
grain into the rendition and delete the hero clock.

The transform experiment is rejected. A compositor `translate3d` tile removed the
45 paints but moved the work into raster: `RasterTask` 122 → 222 and ~1,002 ms,
`Display::DrawAndSwap` p50 30.5 → 37.6 ms, and one trial at 66.6 ms. A separate
`[data-grain]` frame with `background-position` was also worse (rAF p50 50 ms,
`DrawAndSwap` p50 50.3 ms, `RasterTask` 520). The pseudo plus visibility gate is
the measured optimum for the landscape: exact pixels and no offscreen paints.

The generic `:is()` list still carries the specificity trap. The hero rule is
`(0,4,1)`; the landscape mask rule is `(0,3,1)` and only sets the mask, so the
generic animation applies. The `.helios-see` arm in the list is dead markup on
this page (the see section is `.helios-plate`), so it is not an unfixed surface.

### Media fallback: reveal only a presented frame

`assets/js/media-video.js` now sets `data-ready` only from
`requestVideoFrameCallback`, so the authored poster remains visible until a frame
has actually been presented. `captureStill()` refuses to replace that poster with
a near-black capture. On a scroll away/return at 6× CPU the poster is visible at
120 ms and the video is ready at 920 ms; the black video box no longer appears.
This is the fallback fix, not a grain claim.

### Crossfade is a separate, synthetic bound

Two distinct decoded films (2 s and 1 s) were held paused, graded, with the grain
stack, and the incoming cell was driven from opacity 0 to 1 over an opaque
outgoing cell with the authored 1.2 s transition. This is a **fade-in over an
opaque outgoing cell, not a two-layer crossfade**; every infinite CSS clock was
paused, and the writer, decoder and readback paths were not exercised. With the
window bracketed by marks and no style/layout read inside it: the held 0.5 blend
made one 51 ms draw and then reused its output; the 1.2 s fade made 22 draws and
1145 ms of `Display::DrawAndSwap` (726 quads, 1119 ms). rAF was 16.7 ms for the
held/single arms and 50 ms for the fade. The trace sums are n=1; the rAF split is
the replicated result. This does not price the production writer or decode path
and is not a reason to change the 1.2 s timing.

## Third iteration: the front page's LCP was a file choice

The first audit of the current build was not a compositor experiment. Lighthouse
12.8.2 against the current build (brotli server, cold cache; no production
analytics) put mobile
at 81–85 with LCP 4.0–4.2 s; desktop was 99, CLS 0.02, TBT 0–70 ms, and
accessibility/best-practices/SEO were 100. The page was not janky. It was
carrying a 1920×1080 hero clip in a 412×777 box: 257 KB for 5 s, plus 480 KB
for the neighbour that warmed 31 ms after the first frame, plus 240 KB of fonts
and ~400 KB of images. The LCP element was the video, not text; blocking it
alone moved the score to 87–98 depending on the throttling model.

The retained work is the pipeline, not four hand-encoded files:

- `design/mint-media.mjs` mints desktop H.264 + AV1 + poster and a compact
  572×1080 cover crop, names every file by the first eight hex of its SHA-256,
  and writes the catalog fields. `--compact-only` adds the phone pair to an
  existing desktop pair; `verify` fails a missing path or a duplicate font.
- The four hero clips now carry compact AV1 at 63/152/188/170 KB (H.264
  153/232/391/252 KB). The include emits them as media-query sources below
  640 px; `media-video.js` chooses the same pair when it attaches a
  non-priority clip.
- A 4G estimate can be a 1.5 Mbps phone. `navigator.connection.downlink < 2`
  sets `lean`: the active clip attaches, the neighbour does not. The first clip
  is also played in the same task as its attach instead of waiting for the
  writer's first mark.
- Images use `_data/image_sources.yml` (the build emits the rungs) and `_includes/media/img.html`; the
  banner is an 8 KB 384w WebP instead of a 44 KB PNG, the wordmark a lossless
  10 KB WebP. The below-fold planes are `fetchpriority=low`.
- The font generator now aliases byte-identical weights to one URL and removes
  the stale copies. The hero slate uses the Cormorant italic already loaded, so
  EB Garamond italic (48 KB) is no longer fetched by this page. Four faces,
  ~148 KB, remain.

Median of three LHCI runs (simulate mobile, `design/probe/perf-serve.mjs`):
performance **92** (92/92/93), FCP 2.1 s, LCP 3.0 s (3.01/3.02/3.05), TBT 0–11 ms,
CLS 0.021, **674 KB**. Desktop **100**, LCP 0.6 s, 926 KB. The same page
under DevTools throttling (1.6 Mbps/150 ms/4× CPU) is 74–75 with LCP 5.5–6.4 s:
the first compact clip is still the LCP and the pipe is the pipe. That number is
kept as the pessimistic view, not as a field claim.

Rejected: subsetting the display fonts (would save ~48 KB but drops accented
glyphs), lossy grain WebP (26 KB → 15.6 KB, changes the authored texture), and a
`<head>` video preload (neutral in three runs and it competes with the
render-blocking CSS on HTTP/1.1). The first two are reversible if the content or
the texture tolerance changes.

The gate is `.github/workflows/perf.yml` + `.lighthouserc.json`: three runs,
median assertions on LCP ≤ 3600, TBT ≤ 300, CLS ≤ 0.1, total bytes ≤ 800 KB,
responsive images = 1, plus `mint-media.mjs verify` in the deploy build.

The LCP ceiling moved from 3200 to 3600 after the first GitHub-runner run put
this commit at 3.29–3.36 s (3292/3362/3328, median 3328) against 3.02 s here.
The page's LCP phase split on that run was TTFB 456 ms + **render delay
2567 ms**, with load delay and load time both 0 ms: the element is not waiting
on a request, it is waiting on 2.2 s of main-thread style and layout for the
mode sheet, and Lantern scales observed work by the host CPU. A shared runner
therefore reads ~10 % high. 3200 sat inside the spread between two machines
nobody chose for the measurement, so the gate was a coin flip; 3600 still fails
an 8 % regression over the runner's own baseline. Score, TBT, CLS, bytes,
responsive and unsized images stay where they were.

`modern-image-formats` is off in the gate: the one remaining PNG is the
authored grain, and its lossless WebP is the same bytes, so an audit warning
there would be noise rather than a regression.
Durable summary: `design/probe/evidence/front-page-media.json`.

## Knockout ledger

These are local **headless/software-compositor** diagnostics, not real-device FPS
promises. Native paths are fixed within each comparison. The hero path is normalized
from .12 to .78 of its own `hero.clientHeight * .8` clock. Treatment order reverses
between trials. No experimental CSS or graded video is loaded by the shipped page.

| Candidate | Experiment | Decision |
|---|---|---|
| Flatten static planes / body isolation | Warm Create; paired pixels essentially unchanged | No convincing timing gain in initial screen; retain original composition |
| Pool gradient+mask precomposed as SVG image | Warm Create; mean RGB < .001, max 2 | No timing gain; reject added asset/representation |
| Promote atmosphere / stage; paint containment | Warm Create | No convincing gain; atmosphere promotion also changed pixels; reject |
| Remove live hero grade | Playing/paused factorial, three alternating trials | Stronger diagnostic signal than layer promotion; ungraded appearance is NOT shipped |
| Single SVG color matrix | Same paused clip, sRGB, tight filter region | Median remained ~66.7 ms, like the live chain; no retained-rendering win; reject |
| Move grade to the clip parent | Same paused clip | No improvement; reject |
| Prefer H.264 over AV1 | Two factorial repeats at original dimensions | No reliable cadence improvement; retain codec policy |
| Bake grade into a video | Browser-generated 65-cube LUT; three alternating playing comparisons | Some lower slow-frame fractions, but medians/tails variable; not enough to justify source-policy complexity and added bytes |
| Remove echo image filter | Three paired warmed Create trials at desktop and phone | No repeatable gain; no new baked photo assets. Cold-entry-only cost remains untested |

The echo's responsive mask was deliberately not baked into the photo: its box
letterboxes the image and the mask follows that box. Its original images are also
used by the experiences page and must not be overwritten by a landing optimization.

### Video prototype, not shipped

The grade is `contrast(1.12) saturate(.85) sepia(.28) hue-rotate(-12deg)`.
A lookup cube was generated through Chromium's actual Canvas filter pipeline,
including its clamping, rather than approximating CSS with FFmpeg's `eq`/`hue`.
The prototype explicitly decoded/encoded BT.709 around RGB LUT application.

With actual seeks to 1/2/3 seconds, the AV1 prototype versus original H.264 + CSS
had mean full-frame RGB error around .69–.70 and maximum channel errors 37–38
(lossy encoding/chroma edges). At 2 seconds SSIM was .99486 for the viewport and
.98928 for a 700×500 exposed-video crop. It is not byte-identical rendering.

The prototype AV1 is about 466 KiB versus 251 KiB for the existing AV1. Controls
also differ by one encode generation. Playing medians across three trials were
66.7/83.3/66.6 ms for raw + CSS versus 66.6/66.7/50 ms for the baked prototype;
tails varied. This does **not** establish a production gain that outweighs doubling
renditions, preserving mobile treatment, coordinating still capture/fallbacks,
and maintaining source/grade freshness. The video remains a prototype under `/tmp`.

If revisited, first validate on real GPU/device hardware, then compare matched
codec/quality/source generations with more balanced trials. A source marker would
have to identify a baked treatment from the selected URL; never remove a filter
from raw fallback pixels or apply a grade twice to a captured still.

## Measurement defect found and corrected

`design/probe/serve.py` lacks byte-range support. Chromium reported `buffered [0,5]`
but `seekable [0,0]`, and silently returned to frame zero after seeks to 1/2/3.
Identical screenshot hashes exposed the flaw. Initial paused factorial/matrix
samples were therefore frame-zero diagnostics, **not** valid t=1/2/3 comparisons.
They must not be cited as multi-frame parity evidence.

`design/probe/media-serve.py` adds bounded single-range HTTP responses, 206 and
Content-Range, while retaining pretty permalink resolution. Three standard-library
HTTP tests cover ranges/suffixes, unsatisfiable requests, HEAD and pretty routes.
The hero video probe now asserts actual seeking beyond .9 s. Final video parity
and baked comparisons were repeated with Range support and distinct frame hashes.
When using Fetch interception to substitute video bytes, Range requests must also
be answered correctly; an HTTP cache or fully buffered file does not fix this.

## Evidence and reproduction

Durable summaries, baseline hashes and browser version:
`design/probe/evidence/performance-knockouts.json` (first iteration) and
`design/probe/evidence/hero-hotpaths.json` (second iteration: decisive bare/shipped
control, per-node Paint counts, the visibility-gated grain gate, the rejected
transform/frame arms, and the crossfade bound).
Raw first-iteration artifacts: `/tmp/helios-knockout-screen`, `/tmp/helios-echo-screen`,
`/tmp/helios-hero-factorial`, `/tmp/helios-hero-grade-arms`,
`/tmp/helios-grade-parity`, `/tmp/helios-hero-baked`, `/tmp/helios-fill-after`.
Second-iteration raw artifacts:
`/tmp/helios-hotpaths/{site,after,phase1,phase2-grade,phase3-static,phase4-residual,crossfade,after-compiled,static-gate,static-gate-retrace}`.
These temporary trees are not durable; the JSON summaries are.
The frozen post-carousel baseline is `/tmp/helios-knockout-baseline`; its prototype
video files were added only to that temporary serving root, never to the site.
The isolated same-video fixture is `design/probe/bare-lab.html`; copy it to the
frozen serving root before running the bare arm.

Requires Node with global WebSocket, Chromium, Python 3 and Pillow for pixel gates.
Prototype transcoding/SSIM used FFmpeg; no new visitor dependency was added.

```sh
node --test design/probe/*.test.mjs          # 93 pass
python3 design/probe/media_serve_test.py     # 3 pass
ruby design/probe/compiled_ink_test.rb
bundle exec jekyll build

# Separate process within the same shell lifetime as the isolated browser:
python3 design/probe/media-serve.py 4005 _site
# With an isolated Chromium debugger on 9247:
CDP_PORT=9247 BASE=http://127.0.0.1:4005 CHECK_RUNTIME=1 node design/probe/play-fill.mjs
CDP_PORT=9247 BASE=http://127.0.0.1:4005 node design/probe/scroll-budget.mjs
CDP_PORT=9247 PROBE_BASE=http://127.0.0.1:4005/ node design/probe/helios-focus.mjs

# Experimental CSS only, against a FROZEN baseline:
CDP_PORT=9247 BASE=http://127.0.0.1:4004 VARIANTS=baseline,echo-no-filter REPEATS=3 \
  node design/probe/render-knockout.mjs
CDP_PORT=9247 BASE=http://127.0.0.1:4004 REPEATS=3 \
  node design/probe/hero-video-knockout.mjs

# Second iteration: frozen pre-fix (4004) and fixed (4005) builds.
cp design/probe/bare-lab.html /tmp/helios-hotpaths/site/
python3 design/probe/media-serve.py 4004 /tmp/helios-hotpaths/site
python3 design/probe/media-serve.py 4005 /tmp/helios-hotpaths/after
CDP_PORT=9247 BASE=http://127.0.0.1:4004 REPEATS=4 node design/probe/hero-hotpaths.mjs
CDP_PORT=9247 BASE=http://127.0.0.1:4005 BEFORE=http://127.0.0.1:4004 TRACE=1 \
  node design/probe/static-grain.mjs
CDP_PORT=9247 BASE=http://127.0.0.1:4004 \
  WRITER_SHA=150d86454d0df5c33cd3a145daebe98403dc673b468fd3a7154f8824a4b04218 TRACE=1 \
  node design/probe/hero-crossfade-cost.mjs
# Single-factor arms: ARMS=static-landscape,static-no-grain,static-no-landscape,static-no-wordmark,static-no-scrim
```

Keep browser/server ownership and cleanup explicit; never use a personal browser
profile or compare two servers sharing a mutable `_site`. Build, all 93 Node tests,
three HTTP tests, ink freshness, progress, scroll budget and focus/progressive-
enhancement gates pass after the retained change. Existing stale identity assertions
in the broader `helios.mjs` probe were not rewritten to hide unrelated failures.

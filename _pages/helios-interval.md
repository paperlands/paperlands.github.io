---
layout: folio
title: The Interval, Rehearsed
permalink: /helios-interval
nav_tone: dark
look: helios
description: The interval's wager tried before the landing moves — the morphology of code, walked by the dojo's own runtime.

# The page's copy surface: what this REHEARSAL says around the program. The
# writeup below the stage — "What is real here", the honest list — is the page's
# document, not a component's words, and stays where it is written. The verse
# and the lede are the landing's own interval said again, which is the point of
# the rehearsal; they are this page's copy all the same, so they are here and
# not read from _pages/helios.md.
#
# The status line's words go to the runtime as data attributes (see the section
# below and assets/js/home/helios-interval.js): the score is written by the
# script as the walk moves, so the vocabulary travels with the page instead of
# living in a second copy inside the script.
copy:
  label: Anyone can see math differently, performed as a program
  verse: Anyone can
  line: see math
  line_em: differently.
  lede: We designed an intuitive language so a mathematical idea becomes something you can see, play with, and breathe to life.
  program_label: the program
  status: waiting
  performing: performing
  finished: the finished figure
  fallback: fell back to the finished figure —
  missing_pin: the pin is missing — no runtime was vendored
---

<div class="helios-twilight">
<div class="helios-act">
<section class="helios-see helios-interval" data-helios-interval
  data-helios-interval-hatch="{{ site.data.hatch.artifact_path }}"
  data-interval-performing="{{ page.copy.performing }}"
  data-interval-finished="{{ page.copy.finished }}"
  data-interval-fallback="{{ page.copy.fallback }}"
  data-interval-missing-pin="{{ page.copy.missing_pin }}"
  aria-label="{{ page.copy.label }}">
  <div class="helios-see__field helios-interval__field" aria-hidden="true">
    <canvas class="helios-interval__stroke" data-helios-interval-stroke aria-hidden="true"></canvas>
    <img class="helios-interval__still" data-helios-interval-still hidden alt=""
      data-src="{{ '/assets/lib/helios/morphology-418f99.webp' | relative_url }}" width="900" height="900">
  </div>
  <div class="helios-see__copy">
    <h2 class="helios-see__head">
      <span class="helios-verse">{{ page.copy.verse }}</span>
      <span class="helios-see__line">{{ page.copy.line }}</span>
      <span class="helios-see__line"><em>{{ page.copy.line_em }}</em></span>
    </h2>
    <div class="helios-see__invite">
      <span class="helios-see__star" aria-hidden="true">✳</span>
      <p class="helios-see__lede">{{ page.copy.lede }}</p>
    </div>
  </div>
  <div class="helios-interval__program" aria-hidden="true">
    <p class="helios-interval__label">{{ page.copy.program_label }}</p>
<pre class="helios-interval__verse" data-helios-interval-verse># the morphology: square, exhaustion, pursuit

def polygon sides r do
  jmpto r 0
  faceto r*cos[360/sides] r*sin[360/sides]
  loop sides do
    fw 2*r*sin[180/sides]
    lt 360/sides
  end
end

def exhaust sides r do
  beColour d45a14
  when sides==12 do
    beColour ff9933
  end
  polygon sides r
  wait 0.35
  when sides&lt;12 do
    exhaust sides+1 r
  end
end

def ring sides r do
  jmpto r 0
  faceto r*cos[360/sides] r*sin[360/sides]
  loop sides do
    fw 2*r*sin[180/sides]
    lt 360/sides
    as 'mouse[count]' do
      fn next [[count+1]//12]
      beColour f2d2b0
      wait 1/60
      loop 34 do
        faceto "mouse[next]".x "mouse[next]".y
        fw 27
        wait 1/60
      end
    end
  end
end

# movement one -- see
hd
beColour ff9933
polygon 4 240
wait 0.6

# movement two -- play with
exhaust 5 240

# movement three -- breathe
ring 12 240</pre>
  </div>
  <p class="helios-interval__status" data-helios-interval-status>{{ page.copy.status }}</p>
</section>
</div>
</div>

<section class="helios-interval__notes">
<h2>The interval, rehearsed</h2>
<p>This page no longer rehearses the interval on a dialect. It hands a canvas and a program to the dojo's own runtime — the real PaperLang, ambients and all — and the program is the verse you are reading. Three movements, one source: a square, an exhaustion, a pursuit.</p>

<h3>What is real here</h3>
<ul>
  <li><strong>The runtime is the dojo's.</strong> <code>createHatch(canvas)</code> from a single self-contained ESM bundle; <code>play(program)</code>; <code>onLine</code> for the beat; <code>dispose</code>. No LiveView, no editor, no server, no network. The mode it borrows is the site's own: one canvas, started on entry, disposed on leave.</li>
  <li><strong>Movement three is twelve live mice.</strong> <code>as 'mouse[count]' do</code> spawns one ambient per vertex of the final polygon, and each faces its neighbour by address: <code>faceto "mouse[next]".x "mouse[next]".y</code>, where <code>[[count+1]//12]</code> names the next mouse and wraps the last to the first. They are concurrent, they inherit the parent's frame at birth, and they read each other every step. This is the thing the old 2D rehearsal could not do at all.</li>
  <li><strong>The clock is the program's.</strong> <code>wait</code> is the only clock: the current score is 4.0 s of logical time — 0.6 s for the square, 8 × 0.35 s for the exhaustion, and 34 × 1/60 s for the pursuit, which runs once because the twelve walk together, not in turn.</li>
  <li><strong>The score runs on the program's own clock.</strong> The runtime hands the page <code>{ time, line, lines }</code> from its playback clock: the page kindles <code>line</code>, warms <code>lines</code>, and lights the rest each beat closes. No AST tagging, no wrapper around the interpreter, no page-side model of how the program runs. The two things it does read from the verse's text — its tokens, and its <code>do</code>/<code>end</code> pairs — are readings of the page's own words, not claims about the walk. The page is ~350 lines, a third of them comment.</li>
  <li><strong>The score shows when and what — on two axes that never cross.</strong> Hue says what a thing <em>is</em>: gestures amber, block words and the names walks are given cream, addresses warm, names mist, numbers dimmer, punctuation dimmest, comments italic. Light says where the walk is: dim, warm once walked, lit on the one line being walked (with a caret in the margin because hue was already spoken for), struck on the line a rest is being taken on, ticked at a body's far <code>end</code>, and kept as an afterglow by the program's own close. A token's ink therefore never changes with the walk — the probe asserts that a gesture is the same amber lit and unread — and the current line is never repainted. The kinds come from <code>assets/js/home/helios-plang-tokens.js</code>: a tokenizer with no DOM and no parser, one file, removable. Its word list is a copy of a language fact (the runtime's command table, the parser's block words) and it had drifted: <code>for</code>, <code>draw</code>, <code>do</code> and <code>func</code> were missing or misplaced against the pinned runtime, so <code>do</code> and <code>end</code> were inked as names and the language's own joints could not be shown. This pass corrected it word for word against the pin; it will drift again the day the language grows — and the day the dojo publishes a tokenizer, that file becomes an import of it.</li>
</ul>

<h3>What was checked, and how</h3>
<p>The runtime door was run headless against the dojo's own harness first (<code>scripts/verify/host_play.sh</code>): a bad program is refused with a line number, <code>play</code> resolves, <code>finished</code> resolves, <code>dispose</code> rejects the held promise, and beats carry the expected lines and times. Then this program was rendered in a real browser and looked at three times by eye. What the eyes found, and what was changed:</p>
<ul>
  <li>the figure was clipped by all four edges at radius 300 → radius 240, nothing clipped, ~87 % of the frame;</li>
  <li>a stray turtle head protruded at the right edge (the root ambient's, which <code>hd</code> inside the mice does not cover) → <code>hd</code> moved to the root;</li>
  <li>the exhaustion read as mush in one colour → 5…11 in ember <code>d45a14</code>, the square and the final 12-gon in brand <code>ff9933</code>.</li>
</ul>

<h3>What is still wrong (the honest list)</h3>
<ul>
  <li><strong>The chase does not read as a chase.</strong> Twelve congruent arms at 30° apart tile the annulus, so the eye sees evenly spaced concentric rings and a scalloped hole rather than twelve mice. The four-mouse whirlpool in the dojo's own codex reads because four arms leave gaps. This is a content decision, not a bug: fewer mice, or a shorter pursuit, would show arms.</li>
  <li><strong>The rim is half a family.</strong> The outer three or four polygons read as distinct nested outlines; the rest collapse into cross-chords across the disc. Nine polygons on one circumcircle is a dust of chords by construction.</li>
  <li><strong>Colour seam, needle spikes.</strong> The ember family against the brand square reads as two glued systems, and the square's corners look like accidental needles where they poke through the rim.</li>
  <li><strong>The figure pays for the score's legibility.</strong> Where the column sits, the art fades out — a mask on the canvas, which costs the compositor nothing, unlike the backdrop blur that was measured and rejected (p95 16.8→33.3 ms cold, 33.4→50.1 ms warm, for a panel nobody wanted). The price is that the disc's right closure is spent: the figure recedes into the night at the edge instead of landing. Shifting the canvas left, or shrinking the radius, would buy the closure back at the cost of crowding the copy.</li>
  <li><strong>Stills judge badly.</strong> Every one of these verdicts comes from still frames. In motion the rings turn and tighten, and the still cannot say whether that reads as a vortex. The next check is the page playing, not a frame of it.</li>
</ul>

<h3>What this is not</h3>
<ul>
  <li><strong>Not a vendored release.</strong> The pin is <code>_data/hatch.yml</code> and it says <code>release: false</code>: these bytes were built by hand from the dojo's own tree, and the pin names the commit they were built from, because the dojo has published no release to vendor — no <code>host-v1</code> entry, no manifest, no conformance fixture, no <code>v0.5</code> tag. What <em>is</em> built is the machinery around it: <code>node design/vendor.mjs</code> writes the pin and refuses a release that fails its seven checks (exercised against a fixture), and <code>python3 design/probe/hatch.py</code> checks the installed pin independently — artifact hash and size, licence and notices, one executable artifact, and that this built page imports that exact file.</li>
  <li><strong>What the licence turn found.</strong> The bundle is the dojo's own runtime (AGPL-3.0-only) and nine MIT dependencies: three.js r185 core and module, five fat-line addons, OrbitControls, and troika/Typr through <code>threetext.js</code>. It shipped the first time with no licence and no notices at all — over a megabyte of other people's terms, unstated. The vendor command now derives <code>THIRD_PARTY_NOTICES.txt</code> from the build's own metafile, refuses any input it cannot classify by licence, and the pin records the hashes of both files.</li>
  <li><strong>Where the rests still lean on the page.</strong> A <code>wait</code> never appears in a beat's <code>lines</code> — a beat is "the lines walked since the last joint", and the joint itself is not on the wire — so the runtime never says which rest it just passed through. The score now reads that from the verse it already renders: a depth scan pairs each <code>do</code> with its <code>end</code>, and on a beat it strikes the first <code>wait</code> line after the last statement the beat walked, inside the body that contains it. No clock is consulted, and this is not the arithmetic that was removed (a <code>time</code> gap matched against a duration literal, silent wherever two waits shared a duration). But it is still the page standing in for a language fact: a branch that skips its rest would be misnamed, and the fix remains one span on the wait effect, added to the beat it closes. Until then the score shows the rests by reading them, not by knowing them.</li>
  <li><strong>Not a second dialect.</strong> Sequential <code>when</code>s are first-match-wins — if/elif by accident — which is why the colour switch above reads as one. <code>//</code> is modulo, not integer division. Neither is documented; both are load-bearing here.</li>
  <li><strong>Not the landing.</strong> The landing's interval is still three films. Moving it is the step after the pin exists.</li>
</ul>
</section>

<script type="module" src="{{ '/assets/js/home/helios-interval.js' | relative_url }}"></script>

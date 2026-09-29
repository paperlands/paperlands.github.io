---
layout: folio
title: [draft] The Interval, Handled
permalink: /helios-interval-handle
nav_tone: dark
look: helios
description: The interval's wager tried before the landing moves — the morphology of code, walked by the dojo's own runtime.
---

<div class="helios-twilight">
<div class="helios-act">
<section class="helios-see helios-interval" data-helios-interval
  data-helios-interval-hatch="{{ site.data.hatch.artifact_path }}"
  aria-label="Anyone can see math differently, performed as a program">
  <div class="helios-see__field helios-interval__field" aria-hidden="true">
    <canvas class="helios-interval__stroke" data-helios-interval-stroke aria-hidden="true"></canvas>
    <img class="helios-interval__still" data-helios-interval-still hidden alt=""
      data-src="{{ '/assets/lib/helios/morphology-418f99.webp' | relative_url }}" width="900" height="900">
  </div>
  <div class="helios-see__copy">
    <h2 class="helios-see__head">
      <span class="helios-verse">Anyone can</span>
      <span class="helios-see__line">see math</span>
      <span class="helios-see__line"><em>differently.</em></span>
    </h2>
    <div class="helios-see__invite">
      <span class="helios-see__star" aria-hidden="true">✳</span>
      <p class="helios-see__lede">We designed an intuitive language so a mathematical idea becomes something you can see, play with, and breathe to life.</p>
    </div>
  </div>
  <div class="helios-interval__program" aria-hidden="true">
    <p class="helios-interval__label">the program</p>
<pre class="helios-interval__verse" data-helios-interval-verse>
let H
fn round(no) [no - (no // 1)]
as polygon do
  loop 1000 do
    let side=round(H.x/20)
    home
    label side 10
    loop side do
      fw H.x
      rt 360/side
    end
    wait 1/12
    erase
  end
end
</pre>
  </div>
  <p class="helios-interval__status" data-helios-interval-status>waiting</p>
</section>
</div>
</div>

<section class="helios-interval__notes">
<h2>The interval, rehearsed</h2>
<p>This page no longer rehearses the interval on a dialect. It hands a canvas and a program to the dojo's own runtime — the real PaperLang, ambients and all — and the program is the verse you are reading. One movement, and it is Archimedes': a handle you drag sets how many sides the polygon has, and the polygon is drawn from that handle twelve times a second — a figure that walks from too few corners to enough of them.</p>

<h3>What is real here</h3>
<ul>
  <li><strong>The runtime is the dojo's.</strong> <code>createHatch(canvas)</code> from a single self-contained ESM bundle; <code>play(program)</code>; <code>onLine</code> for the beat; <code>dispose</code>. No LiveView, no editor, no server, no network. The mode it borrows is the site's own: one canvas, started on entry, disposed on leave.</li>
  <li><strong>The handle is a declared place, and it is yours to move.</strong> <code>let H</code> declares a free point and <code>H.x</code> reads where it is. The gesture is the runtime's, not the page's: it decides what was hit, freezes the drag plane at pointer-down, and admits the motion. <code>let side=round(H.x/20)</code> is a source-owned derived value that recomputes from the accepted position, and the loop reads it again every turn — so the number of sides is not an animation the page chose, it is a reading of where you put the handle.</li>
  <li><strong>The clock is the program's.</strong> <code>wait</code> is the only clock. One turn is 1/12 s and <code>loop 1000</code> is the whole performance: 83 s of logical time, decided by the verse rather than by the page.</li>
  <li><strong>The score runs on the program's own clock.</strong> The runtime hands the page <code>{ time, line, lines }</code> from its playback clock: the page kindles <code>line</code>, warms <code>lines</code>, and lights the rest each beat closes. No AST tagging, no wrapper around the interpreter, no page-side model of how the program runs. The two things it does read from the verse's text — its tokens, and its <code>do</code>/<code>end</code> pairs — are readings of the page's own words, not claims about the walk. The page is ~350 lines, a third of them comment.</li>
  <li><strong>The score shows when and what — on two axes that never cross.</strong> Hue says what a thing <em>is</em>: gestures amber, block words and the names walks are given cream, addresses warm, names mist, numbers dimmer, punctuation dimmest, comments italic. Light says where the walk is: dim, warm once walked, lit on the one line being walked (with a caret in the margin because hue was already spoken for), struck on the line a rest is being taken on, ticked at a body's far <code>end</code>, and kept as an afterglow by the program's own close. A token's ink therefore never changes with the walk — the probe asserts that a gesture is the same amber lit and unread — and the current line is never repainted. The kinds come from <code>assets/js/home/helios-plang-tokens.js</code>: a tokenizer with no DOM and no parser, one file, removable. Its word list is a copy of a language fact (the runtime's command table, the parser's block words) and it had drifted: <code>for</code>, <code>draw</code>, <code>do</code> and <code>func</code> were missing or misplaced against the pinned runtime, so <code>do</code> and <code>end</code> were inked as names and the language's own joints could not be shown. This pass corrected it word for word against the pin; it will drift again the day the language grows — and the day the dojo publishes a tokenizer, that file becomes an import of it.</li>
</ul>

<h3>What was checked, and how</h3>
<p>The runtime door was run headless against the dojo's own harness (<code>scripts/verify/host_play.sh</code>) and then again in a bare canvas with this program. What those runs settled, and nothing more:</p>
<ul>
  <li>the program is accepted by the pinned artifact — no parse refusal, no wound — and the walk comes back as beats on the program's own clock;</li>
  <li>the handle is claimable: a pointer-down on its projected point is taken by the runtime's own gesture, so <code>let H</code> is a target a reader can actually grab;</li>
  <li>with no pointer at all, <code>H.x</code> is 0, so <code>side</code> is 0 and the loop body never runs — no side is drawn, which is what makes the handle the figure's whole source.</li>
</ul>

<h3>What is still wrong (the honest list)</h3>
<ul>
  <li><strong>It draws nothing until you touch it.</strong> The handle starts at its frame's origin, so <code>H.x</code> is 0 and <code>side</code> is 0; the first thing this page asks a reader for is a hand, and a reader who will not drag it is shown the verse and no figure.</li>
  <li><strong>The poster is a figure this program no longer draws.</strong> <code>morphology-418f99.webp</code> is the old three-movement rehearsal — nested polygons and twelve mice. Reduced motion and Save-Data show it and never fetch the runtime, so those readers are shown a picture the pinned host cannot produce.</li>
  <li><strong>One drag moves two things at once.</strong> The <code>H.x</code> that sets the side count is also the side length (<code>fw H.x</code>), so pulling the handle right makes the polygon rounder and larger together: the exhaustion arrives with a scale change riding on it. A fixed <code>fw</code>, or a second handle, would separate the argument from the size.</li>
  <li><strong>None of this has been looked at yet.</strong> Every verdict above comes from beats and a pointer probe, not from watching the page run. Whether a growing polygon reads as exhaustion is a question for an eye, and that is the next check.</li>
</ul>

<h3>What this is not</h3>
<ul>
  <li><strong>Not a vendored release.</strong> The pin is <code>_data/hatch.yml</code> and it says <code>release: false</code>: these bytes were built by hand from the dojo's own tree, and the pin names the commit they were built from, because the dojo has published no release to vendor — no <code>host-v1</code> entry, no manifest, no conformance fixture, no <code>v0.5</code> tag. What <em>is</em> built is the machinery around it: <code>node design/vendor.mjs</code> writes the pin and refuses a release that fails its seven checks (exercised against a fixture), and <code>python3 design/probe/hatch.py</code> checks the installed pin independently — artifact hash and size, licence and notices, one executable artifact, and that this built page imports that exact file.</li>
  <li><strong>What the licence turn found.</strong> The bundle is the dojo's own runtime (AGPL-3.0-only) and nine MIT dependencies: three.js r185 core and module, five fat-line addons, OrbitControls, and troika/Typr through <code>threetext.js</code>. It shipped the first time with no licence and no notices at all — over a megabyte of other people's terms, unstated. The vendor command now derives <code>THIRD_PARTY_NOTICES.txt</code> from the build's own metafile, refuses any input it cannot classify by licence, and the pin records the hashes of both files.</li>
  <li><strong>Where the rests still lean on the page.</strong> A <code>wait</code> never appears in a beat's <code>lines</code> — a beat is "the lines walked since the last joint", and the joint itself is not on the wire — so the runtime never says which rest it just passed through. The score now reads that from the verse it already renders: a depth scan pairs each <code>do</code> with its <code>end</code>, and on a beat it strikes the first <code>wait</code> line after the last statement the beat walked, inside the body that contains it. No clock is consulted, and this is not the arithmetic that was removed (a <code>time</code> gap matched against a duration literal, silent wherever two waits shared a duration). But it is still the page standing in for a language fact: a branch that skips its rest would be misnamed, and the fix remains one span on the wait effect, added to the beat it closes. Until then the score shows the rests by reading them, not by knowing them.</li>
  <li><strong>Not a second dialect.</strong> <code>//</code> is modulo, not integer division, which is why the verse spells a floor as <code>[no - (no // 1)]</code> — the language has no <code>floor</code> of its own. Sequential <code>when</code>s are first-match-wins, if/elif by accident. Neither is documented; both are load-bearing here.</li>
  <li><strong>Not the landing.</strong> The landing's interval is still three films. Moving it is the step after the pin exists.</li>
</ul>
</section>

<script type="module" src="{{ '/assets/js/home/helios-interval.js' | relative_url }}"></script>

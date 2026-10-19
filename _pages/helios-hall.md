---
layout: folio
title: The Hall, Rehearsed
permalink: /helios-hall
nav_tone: dark
look: helios
description: The landing's close, tried with a room in it — the same black ground, a vault above it, and the decision standing on the dark.
excerpt: The landing's close, tried with a room in it.

# The close's words, said again here on purpose. They are the LANDING's words and
# _pages/helios.md is where they are authored; this page exists to judge the
# picture under them, so the rehearsal carries its own copy of the block the way
# /helios-interval carries the interval's (see that page's note). When the
# colophon takes the hall, this file is deleted and these words go with it.
possibilities:
  close:
    title: What do you see?
    verse: A festival in your school hall, a chapter in your university or in every classroom in your state
    possibility: Perhaps you see differently.  <br> It could be a possibility we have yet to imagine.
    community: Your own stage for mathematics in your mathematics.
    action: Let's design it together.

colophon:
  title: See Math
  title_em: Differently
  action: Enter PaperLand
  href: https://dojo.paperland.sg/welcome
---

{%- comment -%}
  The rehearsal's own document. The close below is the landing's two beats, in
  order and on their own words; the only new thing in the frame is the hall
  (assets/css/components/helios.css, "the hall", and
  assets/js/home/helios-hall.js).

  The switch lives INSIDE the close's wrapper because the wrapper is what :has()
  reads to change state — one element owns the state, and nothing has to be
  written on <body> to try a candidate. It is the only part of this page that
  does not ship.
{%- endcomment -%}
<section class="helios-hall__notes helios-hall__notes--head">
  <h2>The close, in rehearsal</h2>
  <p>The landing's last viewport, tried with a room in it. The ground is the
  <code>#050009</code> it already had — what changes is that the black becomes a
  place: a vault above, arch beyond arch, a horizon of light, and embers rising
  off the floor. Every layer is drawn; there is no photograph, no new file, and
  no word here that is not the landing's.</p>

  <h3>What to look at</h3>
  <ul>
    <li><strong>today</strong> is the shipped close, unchanged. Switch to it and
    back: the ground does not move, so the change is not a new climate, it is
    that there is somewhere to go.</li>
    <li>Light goes up. The vault, the beacon and the stars are above the horizon
    at 64%; the words and the seal stand on the dark floor below it.</li>
    <li>The seal keeps the contrast it has today. An ember on this ground is
    9.6:1; a photograph under it would need a scrim to hold that — which is the
    black again, painted over a picture.</li>
    <li><strong>at rest</strong> is the hall with every motion stopped,
    <strong>alive</strong> adds the embers. With no JavaScript and with reduced
    motion the hall is still a hall — the embers are the only runtime.</li>
  </ul>

  <h3>What is not here</h3>
  <ul>
    <li>No image and no video. The composition is the one
    <code>assets/lib/hq.png</code> is a still of and
    <code>assets/js/twilight-sky.js</code> draws live for <a href="/tjc">/tjc</a>
    — pillars, arch beyond arch, a horizon of light, a starry vault.</li>
    <li>The two decisions are still two. <em>Let's design it together</em> is the
    relational one and goes to the letter; <em>Enter PaperLand</em> is the
    threshold and goes to the dojo. This page lights the threshold and leaves the
    relational beat on the flat ground, so the pair can be judged as two.</li>
  </ul>
</section>

{%- comment -%} Beat one: the relational close, exactly as the landing ships it. {%- endcomment -%}
<section class="helios-possibilities" aria-labelledby="hall-beat-title">
  <div class="helios-possibilities__opening">
    <span class="helios-possibilities__thread" aria-hidden="true"></span>
    <h2 id="hall-beat-title">{{ page.possibilities.close.title }}</h2>
    <p class="helios-possibilities__verse">{{ page.possibilities.close.verse }}</p>
    <p>{{ page.possibilities.close.possibility }}<br>{{ page.possibilities.close.community }}</p>
    <a class="helios-possibilities__call" href="{{ site.data.contact.route | relative_url }}">{{ page.possibilities.close.action }} <span aria-hidden="true">↗</span></a>
  </div>
</section>

{%- comment -%} Beat two: the threshold, with the hall behind it. {%- endcomment -%}
<div class="helios-hall" data-helios-hall>
  <div class="helios-hall__scene" aria-hidden="true">
    <div class="helios-hall__vault"></div>
    <div class="helios-hall__stars"></div>
    <div class="helios-hall__stars helios-hall__stars--near"></div>
    <div class="helios-hall__nave"></div>
    <div class="helios-hall__floor"></div>
    <div class="helios-hall__air"></div>
    <div class="helios-hall__beacon"></div>
    <canvas class="helios-hall__embers" data-helios-hall-embers></canvas>
  </div>

  {% include home/colophon.html %}

  <fieldset class="helios-hall__switch">
    <legend class="sr-only">What the close is showing</legend>
    <input type="radio" id="hall-mode-today" name="hall-mode" value="today">
    <label for="hall-mode-today">today</label>
    <input type="radio" id="hall-mode-rest" name="hall-mode" value="rest">
    <label for="hall-mode-rest">at rest</label>
    <input type="radio" id="hall-mode-alive" name="hall-mode" value="alive" checked>
    <label for="hall-mode-alive">alive</label>
  </fieldset>
</div>

<script src="{{ '/assets/js/home/helios-hall.js' | relative_url }}" defer></script>

---
layout: twilight
title: National Day Challenge · Model a Change
permalink: /tjc/nationaldaychallenge
excerpt: Model something that changes in the world around you and how.
image: /assets/lib/hq.png
challenge:
  number: "01"
  opens: "2026-08-09T00:00:00+08:00"
  closes: "2026-08-11T23:59:59+08:00"
  opens_label: "09 AUG"
  closes_label: "11 AUG"
  # Leave blank to keep the gate sealed. Fill it with the dojo submission link
  # and the gate opens on its own at `opens` and shuts itself at `closes`.
  submit_url: "https://dojo.paperland.sg/shell?fork=cd8cc9b085e76dcfe0df8a110de3af32af839339f07bcebaff29ab4e26811327&action=share&clan=TJC"
---

{% assign ch = page.challenge %}

<!-- ====================== HERO ====================== -->
<section class="flex min-h-[88vh] flex-col justify-center pt-[10vh]">
  <p class="tw-kicker">// TJC math leaders &middot; challenge {{ ch.number }}</p>

  <h1 class="mb-7 mt-5 max-w-[15ch] font-paperlang text-[clamp(2.7rem,7.6vw,6.2rem)] leading-[0.98] tracking-[0.01em] text-gold [text-shadow:0_0_18px_rgb(240_168_61/0.28),0_0_60px_rgb(217_111_55/0.18)]">
    National Day <em class="italic text-phosphor">Challenge</em>
  </h1>

  <p class="max-w-[52ch] text-[clamp(0.94rem,1.4vw,1.12rem)] leading-[1.75] text-mute">
    Our nation turns <i class="italic text-gold">sixty-one</i> this week. Sixty-one steps from a beginning that could have gone any number of ways. <br><br>
    Nothing around us holds still. <i class="italic text-gold">Find one thing that changes.</i> <br> <i class="italic text-gold">Then question and model it.</i> <span aria-hidden="true">🇸🇬🔥</span>
  </p>

  <!-- window + live gate state -->
  <div class="mt-[clamp(2.4rem,7vh,4rem)] flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-phosphor/15 pt-6 font-mono text-[0.62rem] uppercase tracking-[0.26em] text-dim">
    <span>opens <b class="font-medium text-phosphor">{{ ch.opens_label }}</b></span>
    <span aria-hidden="true" class="text-phosphor/35">———</span>
    <span>closes <b class="font-medium text-phosphor">{{ ch.closes_label }}</b></span>
    <span class="tw-chip" data-gate-chip>· · ·</span>
  </div>

  <div class="mt-[clamp(2rem,6vh,3.4rem)]"><a href="#gate" onclick="event.preventDefault();window.scrollTo({top:document.getElementById('gate').getBoundingClientRect().top+window.scrollY,behavior:'smooth'})" class="inline-flex items-center gap-3.5 font-mono text-[0.58rem] uppercase tracking-[0.3em] text-dim after:h-px after:w-[72px] after:bg-gradient-to-r after:from-phosphor after:to-transparent after:content-['']">jmpto gate</a></div>
</section>

<div class="tw-rule" role="separator"></div>

<!-- ====================== WHERE WE'VE BEEN ====================== -->
<section aria-labelledby="road-h">
  <div class="mb-10">
    <p class="tw-kicker">// the road so far</p>
    <h2 id="road-h" class="mt-3.5 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-normal tracking-[0.015em] text-gold">We began by <em class="italic text-phosphor">looking</em></h2>
  </div>

  <div class="grid gap-8 md:grid-cols-2">
    <p class="text-[0.95rem] leading-[1.75] text-mute">
      We started this journey by observing the world around us more closely. Its <i class="italic text-gold">objects</i>. The <i class="italic text-gold">processes</i> that shape it. We identified <i class="italic text-gold">properties</i> that defined <i>what they are</i>, and <i>what they are not</i>.
    </p>
    <p class="text-[0.95rem] leading-[1.75] text-mute">
      This week we turned to something deeper. Not what something <i>is</i>, but what it <i class="italic text-gold">becomes</i>. We began with the spiral, one of the oldest symbols of change there is — <i class="italic text-gold">involution</i>, <i class="italic text-gold">evolution</i>, continuous transformation.
    </p>
  </div>

  <figure class="p-0 tw-frame group mt-11">
    <span class="tw-chip absolute right-3 top-3 z-[2]">WEEK 03</span>
    <div class="relative aspect-[1000/380] overflow-hidden border-b border-phosphor/20 bg-[radial-gradient(120%_130%_at_50%_115%,rgb(217_111_55/0.38),rgb(240_168_61/0.09)_34%,transparent_66%)]">
      <canvas data-world="3" class="absolute inset-0 block w-full h-full" role="img" aria-label="A spiral drawing itself outward, each turn a little longer than the last, then folding back in on itself."></canvas>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-twilight/85 via-twilight/35 to-transparent px-5 pb-[1.1rem] pt-16 text-center">
        <p class="font-display text-[clamp(0.85rem,2vw,1.18rem)] italic tracking-[0.04em] text-phosphor [text-shadow:0_0_16px_rgb(240_168_61/0.55),0_0_44px_rgb(217_111_55/0.3)]">“ The same step, taken again, on what the last step left behind. ”</p>
      </div>
    </div>
    <figcaption class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-dim">
      <span>living number sequences</span>
      <span class="text-phosphor/70">Our path is a spiral; we have already climbed many steps</span>
    </figcaption>
  </figure>
</section>

<div class="tw-rule" role="separator"></div>


<!-- ====================== WHAT YOU HAND IN ====================== -->
<section aria-labelledby="hand-h">
  <div class="mb-10">
    <p class="tw-kicker">// your group's why? &amp; how?</p>
    <h2 id="hand-h" class="mt-3.5 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-normal tracking-[0.015em] text-gold">Your <em class="italic text-phosphor">Challenge</em></h2>
    <p class="mt-3 text-[0.95rem] leading-[1.7] text-mute">Two parts. <i class="italic text-gold">Identify your question.</i> Then <i class="italic text-gold">model how they change or behave with code.</i></p>
  </div>

  <ol class="grid gap-6 p-0 m-0 list-none sm:grid-cols-2">
    <li class="flex flex-col h-full tw-frame p-7 sm:p-8">
      <span class="font-mono text-[0.58rem] uppercase tracking-[0.26em] text-dim">01 · why?</span>
      <h3 class="mt-4 font-display text-[1.45rem] font-medium italic leading-snug text-gold">Identify your Question</h3>
      <p class="mt-3 flex-1 text-[0.9rem] leading-[1.7] text-mute">Find one thing that changes. Identify a key question about it which your group has been chasing. State it in one clear sentence — e.g. <i class="italic text-gold">Why do shells often follow spiral patterns?</i></p>
    </li>
    <li class="flex flex-col h-full tw-frame p-7 sm:p-8">
      <span class="font-mono text-[0.58rem] uppercase tracking-[0.26em] text-dim">02 · how?</span>
      <h3 class="mt-4 font-display text-[1.45rem] font-medium italic leading-snug text-gold">Model with Code</h3>
      <p class="mt-3 flex-1 text-[0.9rem] leading-[1.7] text-mute">Is it possible to express and represent how it changes or behaves with code? It doesn't have to be a perfect model, just make <i class="italic text-gold"> your best guess on how it begins and changes. </i> </p>
    </li>
  </ol>

  <!-- gate: the single place intention resolves into action -->
  <div id="gate" class="scroll-mt-24 mt-[clamp(2.75rem,7vh,4.25rem)]">
    <div class="mb-6 text-center">
      <p class="tw-kicker">// then share it</p>
    </div>

    <div id="gate-panel"
         class="tw-frame mx-auto flex max-w-[34rem] flex-col items-center px-8 py-10 text-center hover:translate-y-0 sm:px-12 sm:py-12"
         role="status"
         aria-live="polite"
         data-opens="{{ ch.opens }}"
         data-closes="{{ ch.closes }}"
         data-url="{{ ch.submit_url }}">

      <div class="font-mono text-[0.58rem] uppercase tracking-[0.28em] text-dim">
        {{ ch.opens_label }} <span class="mx-2 text-phosphor/35" aria-hidden="true">———</span> {{ ch.closes_label }}
      </div>

      <div class="mt-8 select-none font-display text-[2.75rem] leading-none text-phosphor/45 sm:text-[3rem]" data-gate-glyph aria-hidden="true">⌾</div>

      <p class="mt-6 font-display text-[clamp(1.2rem,2.4vw,1.45rem)] italic leading-snug text-gold" data-gate-title>The gate is sealed</p>
      <p class="mx-auto mt-3 max-w-[32ch] text-[0.9rem] leading-[1.7] text-mute" data-gate-note>Come back when the window opens. Until then, there is a world out there to watch.</p>

      <div class="mt-9 flex min-h-[3.25rem] items-center justify-center">
        <!-- open state -->
        <a data-gate-link hidden href="#"
           target="_blank" rel="noopener"
           class="inline-block bg-phosphor px-10 pl-11 py-4 pb-[0.95rem] font-mono text-[0.72rem] font-medium uppercase tracking-[0.34em] text-twilight no-underline shadow-[0_0_22px_rgb(240_168_61/0.4),0_0_70px_rgb(217_111_55/0.22)] transition-all duration-[350ms] hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgb(240_168_61/0.65),0_0_110px_rgb(217_111_55/0.35)] focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold motion-reduce:transition-none">Share it here</a>

        <!-- sealed / closed state -->
        <div data-gate-locked class="inline-block cursor-not-allowed border border-phosphor/20 px-10 pl-11 py-4 pb-[0.95rem] font-mono text-[0.72rem] uppercase tracking-[0.34em] text-dim">Sealed</div>
      </div>

      <p class="mt-6 min-h-[1.25rem] font-mono text-[0.62rem] uppercase tracking-[0.26em] text-phosphor" data-gate-count></p>
    </div>

  </div>
</section>

<script>
(function () {
  var panel = document.getElementById("gate-panel");
  if (!panel) return;

  var opens = Date.parse(panel.getAttribute("data-opens"));
  var closes = Date.parse(panel.getAttribute("data-closes"));
  var url = (panel.getAttribute("data-url") || "").trim();

  var link = panel.querySelector("[data-gate-link]");
  var locked = panel.querySelector("[data-gate-locked]");
  var glyph = panel.querySelector("[data-gate-glyph]");
  var title = panel.querySelector("[data-gate-title]");
  var note = panel.querySelector("[data-gate-note]");
  var count = panel.querySelector("[data-gate-count]");
  var chips = document.querySelectorAll("[data-gate-chip]");

  var STATES = {
    sealed: {
      chip: "SEALED",
      glyph: "⌾",
      title: "The gate is sealed",
      note: "Come back on {{ ch.opens_label }}. Until then, there is a world out there to watch.",
      locked: "Sealed"
    },
    open: {
      chip: "OPEN",
      glyph: "✦",
      title: "The gate is open",
      note: "Submit your question and code for review.",
      locked: "Sealed"
    },
    closed: {
      chip: "CLOSED",
      glyph: "✕",
      title: "The gate has closed",
      note: "This one has run its course. The next window opens soon enough.",
      locked: "Closed"
    }
  };

  function span(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d > 0) return d + "d " + h + "h";
    if (h > 0) return h + "h " + m + "m";
    return m + "m " + sec + "s";
  }

  function tick() {
    var now = Date.now();
    var key = now < opens ? "sealed" : (now > closes ? "closed" : "open");
    // no submission link wired up yet — the gate stays shut whatever the date says
    if (key === "open" && !url) key = "sealed";
    var s = STATES[key];

    for (var i = 0; i < chips.length; i++) chips[i].textContent = s.chip;
    glyph.textContent = s.glyph;
    title.textContent = s.title;
    note.textContent = s.note;
    panel.setAttribute("data-state", key);

    if (key === "open") {
      link.href = url;
      link.hidden = false;
      locked.hidden = true;
      count.textContent = "closes in " + span(closes - now);
    } else {
      link.hidden = true;
      locked.hidden = false;
      locked.textContent = s.locked;
      count.textContent = key === "sealed" && now < opens ? "opens in " + span(opens - now) : "";
    }
  }

  tick();
  setInterval(tick, 1000);
})();
</script>

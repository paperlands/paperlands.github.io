---
layout: twilight
title: TJC Math Leaders HQ 
permalink: /tjc
excerpt: Kindling the TJ spirit of discovery and wonder
image: /assets/lib/hq.png
classes:
  capstone: the_academy
  worlds:
    - lesson: regular_gemstone
      date: 20/07
    - lesson: circular_arc
      date: 27/07
    - lesson: moving_patterns
      date: 03/08
    - lesson: oscillating_heartbeat
      date: 17/08
    - lesson: leaderless_flock
      date: 🔒
---

<section class="flex min-h-[92vh] flex-col justify-center pt-[10vh]">
  <div class="mb-[clamp(2.5rem,7vh,4.5rem)] flex items-center gap-[clamp(1rem,3vw,2.2rem)]">
    <div class="relative grid h-[76px] w-[76px] place-items-center   before:absolute before:-left-px before:-top-px before:h-[9px] before:w-[9px] before:border-l before:border-t before:border-phosphor before:content-[''] after:absolute after:-bottom-px after:-right-px after:h-[9px] after:w-[9px] after:border-b after:border-r after:border-phosphor after:content-['']">
      <img src="/assets/lib/school_logos/TJC_logo_1x1.png" alt="Temasek Junior College" class="h-full w-full object-fill p-1.5">
    </div>
    <span class="font-display text-[1.7rem] text-mute">×</span>
    <div class="relative grid h-[76px] w-[76px] place-items-center   before:absolute before:-left-px before:-top-px before:h-[9px] before:w-[9px] before:border-l before:border-t before:border-phosphor before:content-[''] after:absolute after:-bottom-px after:-right-px after:h-[9px] after:w-[9px] after:border-b after:border-r after:border-phosphor after:content-['']">
      <img src="/assets/nomarginlogo.svg" alt="PaperLands" class="h-full w-full object-fill p-1.5">
    </div>
  </div>

  <p class="tw-kicker"></p>

  <h1 class="mb-6 mt-5 max-w-[16ch] font-paperlang text-[clamp(3rem,8vw,6.6rem)]  leading-[0.98] tracking-[0.01em] text-gold [text-shadow:0_0_18px_rgb(240_168_61/0.28),0_0_60px_rgb(217_111_55/0.18)]">
    TJC  Math <em class="italic text-phosphor"> Leaders</em> Program
  </h1>

  <p class="max-w-[50ch] text-[clamp(0.94rem,1.4vw,1.12rem)] leading-[1.75] text-mute">
  The world around us is written in the language of <i class="italic text-gold">mathematics</i>. We've spent 5,000 years unscrambling its puzzle pieces. <br> <br>  We're not nearly done. <i class="italic text-gold">Look closely.</i> <br> <i class="italic text-gold">Wander down unmarked paths.</i> <br> <i class="italic text-gold">Open doors to new worlds together.</i> 
  </p>

  <div class="mt-[clamp(2.5rem,8vh,5rem)]"><a href="#worlds" onclick="event.preventDefault();window.scrollTo({top:document.getElementById('worlds').getBoundingClientRect().top+window.scrollY,behavior:'smooth'})" class="inline-flex items-center gap-3.5 font-mono text-[0.58rem] uppercase tracking-[0.3em] text-dim after:h-px after:w-[72px] after:bg-gradient-to-r after:from-phosphor after:to-transparent after:content-['']">jmpto worlds</a></div>
</section>

<div class="tw-rule" role="separator"></div>

<!-- ====================== ARCHETYPES ====================== -->
<section aria-labelledby="arch-h">
  <div class="mb-10">
    <p class="tw-kicker">// SEEK. BUILD. WRESTLE. STEWARD</p>
    <h2 id="arch-h" class="mt-3.5 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-normal tracking-[0.015em] text-gold"><span class="text-[2em]">4</span> <em class="italic text-phosphor">Paths</em></h2>
    <p class="mt-3 max-w-[56ch] text-[0.95rem] leading-[1.7] text-mute">Many doors to open. Some will <i class="italic text-gold">call out to you. </i>
    <br>
    Pass through any one and it will <i class="italic text-gold"> lead you to others. </i></p>
  </div>
  
  <div class="grid gap-6 md:grid-cols-2">
  {% include archetypes/card.html icon="seek"    name="SEEK"    constant="&pi; &middot; 3.14159&hellip;" body="Every map has holes and edges. Question it. Follow the unnoticed path until the world gives up a secret." %}
  {% include archetypes/card.html icon="build"   name="BUILD"   constant="&phi; &middot; 1.61803..."     body="The world lays unfinished. Forge your own hammer. Design well-crafted steps where imagination takes form." %}
  {% include archetypes/card.html icon="wrestle" name="WRESTLE" constant="&radic;2 &middot; 1.41421..."   body="Some problems won't be easy. Grapple with them and find hidden leverage. Fortune favours the bold." %}
  {% include archetypes/card.html icon="steward" name="STEWARD" constant="e &middot; 2.71828..."          body="Care and tend to our spirit of wonder. It's the seed that flowers into harmony larger than ourselves." %}
</div>

<div class="tw-rule" role="separator"></div>

<!-- ====================== FIVE WORLDS ====================== -->
<section id="worlds" aria-labelledby="worlds-h">
  <div class="mb-10">
    <p class="tw-kicker">// scaffolds for learning</p>
    <h2 id="worlds-h" class="mt-3.5 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-normal tracking-[0.015em] text-gold"><span class="text-[2em]">5</span> <em class="italic text-phosphor">Worlds</em></h2>
    <p class="mt-3 max-w-[56ch] text-[0.95rem] leading-[1.7] text-mute">These are windows into 5 mathematical worlds. <i class="italic text-gold"> Make them your own. </i>
    Embark on your own journey or <i class="italic text-gold">pull your friends along!</i></p>
  </div>

  <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6 lg:[&>*:nth-child(4)]:col-start-2 lg:[&>*:nth-child(5)]:col-start-4">
    {% for item in page.classes.worlds %}
    {% include twilight/world_card.html item=item index=forloop.index %}
    {% endfor %}
  </div>
</section>

<div class="tw-rule" role="separator"></div>

<!-- ====================== THE SIXTH WORLD · THE ACADEMY ====================== -->
<section aria-labelledby="academy-h" class="scroll-mt-24">
  {% assign cap = site.data.lessons[page.classes.capstone] %}
  <div class="mb-10">
    <p class="tw-kicker">// the sixth world · Yours to build</p>
    <h2 id="academy-h" class="mt-3.5 font-display text-[clamp(1.7rem,3.4vw,2.5rem)] font-normal tracking-[0.015em] text-gold"><span class="text-[2em]">6</span> <em class="italic text-phosphor">{{ cap.title }}</em></h2>
    <p class="mt-3 max-w-[60ch] text-[0.95rem] leading-[1.7] text-mute">The five worlds are windows you step <i class="italic text-gold">through</i>. <br> The sixth is <i class="italic text-gold">yours to build.</i> <br> Each block a question for us to lay bare. <br>  A  <i class="italic text-gold"> path you found true.</i> <br> Bring your friends and <i class="italic text-gold">  share under one roof </i></p>
  </div>

  <figure class="tw-frame group p-0">
    <span class="tw-chip absolute right-3 top-3 z-[2]">TERM 4</span>
    <div class="relative aspect-[1000/420] overflow-hidden border-b border-phosphor/20 bg-[radial-gradient(125%_135%_at_50%_118%,rgb(217_111_55/0.42),rgb(240_168_61/0.10)_32%,transparent_64%)]">
      <canvas data-world="{{ cap.world }}" class="absolute inset-0 block h-full w-full" role="img" aria-label="Looking up into a colossal hall from its mouth — towering pillars in deep perspective, arch beyond arch, the vaulted ceiling sweeping overhead toward a great horizon of light, in the manner of Raphael's School of Athens. The hall is forged one hammer blow at a time, from the outside in: on a slow beat each bay is struck into being with a flash of light and a shower of sparks that settle as stardust, until the vault fills with a starry heaven and the whole interior floats in celestial space like a Cathedral of the Resurrection, then it begins again."></canvas>
      <div class="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-twilight/85 via-twilight/35 to-transparent px-5 pb-[1.1rem] pt-16 text-center">
        <p class="font-display text-[clamp(0.85rem,2vw,1.18rem)] italic tracking-[0.04em] text-phosphor [text-shadow:0_0_16px_rgb(240_168_61/0.55),0_0_44px_rgb(217_111_55/0.3)]">“ After me cometh a Builder. Tell him, I too have known. ”</p>
      </div>
    </div>
    <figcaption class="flex flex-wrap items-center justify-between gap-3 px-5 py-3 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-dim">
    <span/>
      <span class="text-phosphor/70">your world.</span>
    </figcaption>
  </figure>

  <p class="mt-9 max-w-[58ch] text-[0.95rem] leading-[1.7] text-mute">The last world lays unfinished by design and that is the <i class="italic text-gold">invitation</i>.</p>
</section>

<div class="tw-rule" role="separator"></div>

<!-- ====================== CTA ====================== -->
<section class="my-[clamp(3rem,8vh,5rem)] text-center" aria-labelledby="cta-h">
  <p id="cta-h" class="tw-kicker">don't <i class="italic text-gold">wait.</i></p>
  <a href="https://dojo.paperland.sg/welcome" target="_blank" rel="noopener"
     class="mt-7 inline-block bg-phosphor px-10 pl-11 py-4 pb-[0.95rem] font-mono text-[0.72rem] font-medium uppercase tracking-[0.34em] text-twilight no-underline shadow-[0_0_22px_rgb(240_168_61/0.4),0_0_70px_rgb(217_111_55/0.22)] transition-all duration-[350ms] hover:-translate-y-0.5 hover:shadow-[0_0_34px_rgb(240_168_61/0.65),0_0_110px_rgb(217_111_55/0.35)]
      focus-visible:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold motion-reduce:transition-none">Enter the Dojo</a>
</section>

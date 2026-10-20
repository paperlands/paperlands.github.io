---
layout: folio
title: We See Math Differently
permalink: /
nav_tone: dark
look: helios
description: PaperLand — we see math differently.
excerpt: We designed an intuitive language so a mathematical idea becomes something you can see, play with, and breathe to life.
image: /assets/lib/helios/see-helix-ccddfd.webp

# Copy lives here. Change words in this block; the body only places acts, and an
# include invents no word of its own — no filter default, no status line, and a
# plate's figcaption as much as a thesis. The To Create scene's art and program
# live in _data/helios_possibilities.yml; its words live here.

hero:
  thesis: We See Math
  thesis_em: Differently
  kicker: In how we
  label: In how we
  items:
    - id: tree_fractal
      title: Observe
      slate: the hidden geometry of stars
    - id: polygon_fill
      title: Experiment
      slate: on the play of randomness
    - id: fibonacci_spiral
      title: Explore
      slate: the fibonacci sequence of old
    - id: prime_sequence
      title: Question
      slate: the tangled webs of nature


see:
  verse: Where we
  thesis: Bring Math to Life
  focus: Life
  focus_gesture: grow
  body: |
    Learn to create beautiful math animations and discover how to creatively experiment with mathematics.
  action: Explore <u>our approach</u>
  href: /our-approach

create:
  verse: Where your
  title: Math takes the Stage
  focus: Stage
  focus_gesture: gather
  body: |
    It may be a curious question you've asked, ideas you wrestled with, a surprising discovery you stumbled.

    We design avenues for students to share their own stories through their mathematical creations for their community.
  action: Explore our <u>experiences</u>
  caption: students presenting their torus

possibilities:
  verse: Perhaps you
  title: See math differently?
  focus: differently?
  body: |
    A festival in your school hall, a chapter in your university, or a peer led movement in every classroom across your state...
    
    If you believe in bringing your stage 
    for mathematics to life.
    
  action: Don't hesitate to <u>contact us</u>

ticker:
  - In PaperLand
  - We See Math Differently
  - In How We
  - Experiment
  - Explore
  - Observe
  - Question
  - Anyone can
  - See
  - Mathematics
  - Differently
  - Become
  - Explorers
  - Seekers
  - Leaders
  - Reflect

colophon:
  title: See Math
  title_em: Differently
  action: Enter PaperLand
  href: https://dojo.paperland.sg/welcome

# The letter's words are NOT here. The contact modal is the site's, not this
# page's: one component (markup in _includes/contact_modal.html, skin in
# components/contact.css, behaviour in assets/js/contact.js) and one source for
# its copy and its route, _data/contact.yml. Every page says the same thing.
---

{%- comment -%}
  Helios, declaratively.

  Copy is the front matter above. This body names placements, not words: it
  contains no <video>, no src, no preload, no play(), and no look. Everything
  below is one call per idea:

    home/wordmark.html   the identity — the mark assembles on scroll distance
    home/hero.html       thesis + stack carousel (fill) + flash + play fill
    home/ticker.html     the crawl
    home/see.html        the Sierpinski — the same plate as To Create, a different figure
    home/create.html     To Create — one full-width life
    home/possibilities.html   the closing invitation — Are you ready to…
    home/colophon.html   the close
    home/boot.html       page-local decoration

  The page declares `look: helios`. That puts data-look="helios" on <body>
  (see _layouts/folio.html) and components/helios.css binds the shared media
  slots to the Helios look. Change the look, not this page, to re-theme it.

  Permalink is `/`. The look was proved at /helios first and then the swap was
  taken; the old homepage is parked at _drafts/index.md.
{%- endcomment -%}

{% include home/wordmark.html %}

<div class="helios-act">
{% include home/hero.html %}
{% include home/ticker.html %}
</div>

<div class="helios-landscape">
{% include home/see.html %}

{% include home/create.html %}

{% include home/possibilities.html %}
</div>

{% include home/colophon.html %}

{% include home/boot.html %}

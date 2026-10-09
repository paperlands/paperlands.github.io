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
  thesis: Mathematical
  thesis_em: Storytellers
  kicker: Learn to animate
  label: Learn to animate
  items:
    - id: tree_fractal
      title: stars
      slate: the hidden geometry of stars
    - id: polygon_fill
      title: random distributions
      slate: on the play of randomness
    - id: fibonacci_spiral
      title: golden spirals
      slate: the fibonacci sequence of old
    - id: prime_sequence
      title: spiderwebs
      slate: the tangled webs of nature


see:
  verse: A platform to bring
  thesis: math to life
  lede: Learn how YOU can create beautiful math animations and experiment on them. 
  action_prefix: Explore
  action: our approach
  label: Anyone can see math differently
  program_label: the program
  status: waiting
  performing: performing
  finished: the finished figure
  fallback: fell back to the finished figure —
  missing_pin: the pin is missing — no runtime was vendored

create:
  title: Math takes the stage
  points:
    - A student with a story to tell
    - A question they followed
    - A discovery or connection that made an idea click
  action_prefix: Explore the
  action: experiences
  caption: a torus found in architecture

possibilities:
  title: What do you see?
  verse: A festival in your school hall, a chapter in your university or in every classroom in your state
  possibility: Perhaps you see differently.  <br> It could be a possibility we have yet to imagine.
  community: Your own stage for mathematics in your mathematics.
  action: Let's design it together.

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
    home/see.html        the interval — the language drawing its own figure
    home/create.html     To Create — one full-width life
    home/possibilities.html   the closing invitation — What do you see?
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

<div class="helios-twilight">
<div class="helios-act">
{% include home/see.html %}
</div>

</div>

{% include home/create.html %}

{% include home/possibilities.html %}

{% include home/colophon.html %}

{% include home/boot.html %}

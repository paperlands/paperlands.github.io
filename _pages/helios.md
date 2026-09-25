---
layout: folio
title: We See Math Differently
permalink: /helios
nav: folio
nav_tone: dark
look: helios
description: PaperLand — we see math differently.

# Copy lives here. Change words in this block; the body only places acts.
# Clip files stay in _data/media.yml (name the id, not the src).

hero:
  thesis: We See Math
  thesis_em: Differently
  kicker: In how we
  label: In how we
  items:
    - id: sine_curve_with_code
      title: Tinker
      slate: the orbits of a circle
    - id: polygon_fill
      title: Experiment
      slate: the play of randomness
    - id: fibonacci_spiral
      title: Explore
      slate: the fibonacci sequence of old
    - id: tree_fractal
      title: Observe
      slate: the hidden geometry of stars
    - id: prime_sequence
      title: Question
      slate: the tangled webs of nature


see:
  verse: Anyone can
  thesis: see math
  thesis_em: differently.
  lede: We designed an intuitive language so a mathematical idea becomes something you can see, play with, and breathe to life.
  label: Anyone can see math differently
  items:
    - id: see_helix
      role: ribbon
    - id: see_spiral
      role: mass
    - id: see_tree
      role: echo

who:
  verse: In who we
  stress: become
  label: In who we become
  items:
    - id: waves
      title: explorers
      slate: Number patterns, shared over a shoulder
    - id: spring
      title: educators
      slate: The room turns; someone begins to teach
    - id: star
      title: orators
      slate: A voice, a tree of code on the wall
    - id: shell
      title: leaders
      slate: Leaning in until the table is a council
    - id: benz
      title: seekers
      slate: Looking up into a figure they just made
    - id: creators
      title: creators
      slate: A face on the screen, claimed in public

ticker:
  - In PaperLand
  - We See Math Differently
  - In how we
  - Tinker
  - Experiment
  - Explore
  - Observe
  - Question
  - Anyone can
  - In who we become
  - Explorers
  - Educators
  - Orators
  - Leaders
  - Seekers
  - Creators

colophon:
  title: See Math
  title_em: Differently
  action: Enter PaperLand
  href: https://dojo.paperland.sg/welcome
---

{%- comment -%}
  Helios, declaratively.

  Copy is the front matter above. This body names placements, not words: it
  contains no <video>, no src, no preload, no play(), and no look. An act is
  one viewport; a wrapper is the scroll unit, not a new idea. Everything
  below is one call per idea:

    home/air.html        grain + silk veil
    home/wordmark.html   the identity — the mark assembles on scroll distance
    home/hero.html       thesis + stack carousel (fill) + flash + play fill
    home/ticker.html     the crawl
    home/see.html        the interval — anyone can, and the math the language leaves in the air
    home/who.html        strip carousel
    home/colophon.html   the close
    home/boot.html       page-local decoration

  The page declares `look: helios`. That puts data-look="helios" on <body>
  (see _layouts/folio.html) and components/helios.css binds the shared media
  slots to the Helios look. Change the look, not this page, to re-theme it.

  Author ergonomics, stated as a rule: if a new act needs a new *clip*, add it to
  _data/media.yml and name its id; if it needs a new *placement*, pass a surface
  to media/carousel.html; if it needs a new *look*, add a binding under a
  [data-look] scope. None of those three is a change to the copy block above.

  Permalink is /helios while the look is proved. Making it the homepage is a
  one-line permalink swap with _pages/index.md, and that is the point.
{%- endcomment -%}

{% include home/air.html %}

{% include home/wordmark.html %}

<div class="helios-act">
{% include home/hero.html %}
{% include home/ticker.html %}
</div>

<div class="helios-twilight">
<div class="helios-act">
{% include home/see.html %}
</div>

<div class="helios-act">
{% include home/who.html %}
</div>
</div>

{% include home/colophon.html %}

{% include home/boot.html %}

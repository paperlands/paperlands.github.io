---
layout: folio
title: We See Math Differently
permalink: /helios2
# A comparison copy of /, not a second front door: kept out of the sitemap so a
# duplicate title and description never compete with the page it is judged against.
sitemap: false
nav_tone: dark
look: helios2
description: PaperLand — we see math differently.
excerpt: We designed an intuitive language so a mathematical idea becomes something you can see, play with, and breathe to life.
image: /assets/lib/helios/see-helix-ccddfd.webp

# Copy lives here. Change words in this block; the body only places acts, and an
# include invents no word of its own — no filter default, no status line, and a
# plate's figcaption as much as a thesis. The To Create scene's art and program
# live in _data/helios2_possibilities.yml; its words live here.
#
# PARALLEL COPY. This page is reskin/fallforwards-v2's landing, taken whole and
# namespaced so it can stand next to the site's own landing (_pages/helios.md)
# without either one editing the other:
#
#   _includes/helios2/*      that branch's acts (see, create, possibilities)
#   assets/css/components/helios2.css   its composition, re-scoped to helios2
#   assets/js/home/helios2-*.js         its interval and create runtimes
#   _data/helios2_possibilities.yml     its To Create scene
#   _config.yml css_modes.helios2       the sheet is linked on this page only
#
# `/` stays with _pages/helios.md. Nothing here is wired into the site's nav;
# the two landings are compared by visiting / and /helios2. When one wins, the
# loser's files are deleted rather than left dormant.

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
  verse: A platform to
  thesis: Bring Math to Life
  body: |
    Learn to create beautiful math animations and discover how to creatively experiment with mathematics.
  action: Explore <u>our approach</u>
  label: Anyone can see math differently
  program_label: the program
  status: waiting
  performing: performing
  finished: the finished figure
  fallback: fell back to the finished figure —
  missing_pin: the pin is missing — no runtime was vendored

create:
  verse: A platform to
  title: Share Math on Stage
  body: |
    It may be a curious question you've followed, a surprising discovery, a connection that made an idea click.

    We design avenues for students to share the stories behind their mathematical creations with their community.
  action: Explore our <u>experiences</u>
  caption: students presenting their torus

possibilities:
  verse: Are you ready to
  title: See math differently too?
  body: |
    Perhaps a festival in your school hall, a chapter in your university, or a math playground in every classroom in your state...
    
    If you believe that mathematics education can be so much more human...
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

{% include helios2/wordmark.html %}

<div class="helios-act">
{% include helios2/hero.html %}
{% include helios2/ticker.html %}
</div>

<div class="helios-twilight">
<div class="helios-act helios-act--content">
{% include helios2/see.html %}
</div>

</div>

{% include helios2/create.html %}

{% include helios2/possibilities.html %}

{% include helios2/colophon.html %}

{% include helios2/boot.html %}

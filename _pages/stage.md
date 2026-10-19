---
layout: folio
title: Math takes the Stage
permalink: /stage
nav_tone: dark
look: helios
description: Bring math to life for others to see
excerpt: 
image: /assets/lib/helios/see-helix-ccddfd.webp

# Copy lives here. Change words in this block; the body only places acts, and an
# include invents no word of its own — no filter default, no status line, and a
# plate's figcaption as much as a thesis. The To Create scene's art and program
# live in _data/helios_possibilities.yml; its words live here.

hero:
  thesis: Math takes
  thesis_em: the Stage
  kicker: Bring math to life for others to see
  label: In how we
create:
  title: Why math needs a stage?
  body: A stage for your questions and stories

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

{% include home/wordmark.html %}

<div class="helios-act">
{% include home/hero.html %}
{% include home/ticker.html %}
</div>
{% include home/create.html %}

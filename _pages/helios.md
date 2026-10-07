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
# plate's figcaption as much as a thesis. A scene's art and its program are
# _data/helios_possibilities.yml's, indexed by the same id, and its SPINE and
# CAPTION are here with the rest of the words (see `possibilities.items`).
# Clip files stay in _data/media.yml (name the id, not the src).

hero:
  thesis: We See Math
  thesis_em: Differently
  kicker: In how we
  label: In how we
  items:
    - id: sine_curve_with_code
      title: Tinker
      slate: with orbits of a circle
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
    - title: explorers
      slate: Question hidden patterns, shared over a shoulder.
      possibility: inquiry
      entry: Explore becoming explorers
      clips: [waves, spring]
    - title: creatives
      slate: Design and create worlds to invite others into.
      possibility: creators
      entry: Explore becoming creatives
      clips: [star, benz]
    - title: leaders
      slate: Care and tend to the spirit of wonder in others.
      possibility: leaders
      entry: Explore becoming leaders
      clips: [shell]

possibilities:
  transition:
    lead: Math is to be
    experience: experienced.
    fellowship: Shared
    shared: in common.
  items:
    - id: creators
      identity: To Create
      invitation: Connections through Arts & Stories
      event: Math Festivals & Carnivals
      title: What I cannot create I do not understand
      description: Bridge art and nature through mathematics. Turn a pattern into a story, an idea into a movie. Build something for yourself and suddenly, others can see it too.
      outcome: Mathematics made to be felt.
      href: /experiences#math-festival
      more: 
      spine: World for others to see.
      caption: a torus found in architecture
    - id: inquiry
      identity: To Explore
      invitation: Through Inquiry & Discovery
      event: Math Symposiums & Hackathons
      title: Find your own Why.
      description: Seek patterns and questions that leads you down your own conjectures. Share it with others and start a conversation, few would have thought to have.
      outcome: Mathematics for you to question.
      href: /experiences#math-symposium
      more: What goes behind a spirit of inquiry 
      spine: it begins with a question
      caption: good questions are rarer than great answers
    - id: leaders
      identity: To Lead
      invitation: In Service of your Community
      event: Peer-led Workshops & Labs
      title: By students for students
      description: Lean in. Bring people together. Tend to their curiosity,  make room for their questions, the next idea might be theirs.
      outcome: Nurture our spirit of wonder.
      href: /experiences#student-led-workshops
      more: Spearhead the change in your community
      spine: larger than ourselves
      caption: a group huddle / a seed for something larger
  close:
    title: What do you see?
    verse: A festival in your school hall, a chapter in your university or in every classroom in your state
    possibility: Perhaps you see differently.  <br> It could be a possibility we have yet to imagine.
    community: Your own stage for mathematics in your mathematics.
    action: Let's design it together.

ticker:
  - In PaperLand
  - We See Math Differently
  - In How We
  - Tinker
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
  contains no <video>, no src, no preload, no play(), and no look. An act is
  one viewport; the possibilities below open into scroll passages. Everything
  below is one call per idea:

    home/air.html        grain + silk veil
    home/wordmark.html   the identity — the mark assembles on scroll distance
    home/hero.html       thesis + stack carousel (fill) + flash + play fill
    home/ticker.html     the crawl
    home/see.html        the interval — anyone can, and the math the language leaves in the air
    home/who.html        three identities, paired footage in their own reels — the row loops on narrow screens
    home/possibilities.html   parallel lives — becoming, expressed and shared
    home/colophon.html   the close
    home/boot.html       page-local decoration

  The page declares `look: helios`. That puts data-look="helios" on <body>
  (see _layouts/folio.html) and components/helios.css binds the shared media
  slots to the Helios look. Change the look, not this page, to re-theme it.

  Author ergonomics, stated as a rule: if a new act needs a new *clip*, add it to
  _data/media.yml and name its id; if it needs a new *placement*, pass a surface
  to media/carousel.html; if it needs a new *look*, add a binding under a
  [data-look] scope. None of those three is a change to the copy block above.

  Permalink is `/`. The look was proved at /helios first and then the swap was
  taken; the old homepage is parked at _drafts/index.md.
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

{% include home/possibilities.html %}

{% include home/colophon.html %}

{% include home/boot.html %}

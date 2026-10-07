---
layout: folio
look: helios
nav_tone: dark
title: About
permalink: /about
excerpt: Two brothers on a mission to build a school of new patterns of learning.

# Copy lives here, and the body below only places it — the same rule the
# homepage states at the top of _pages/helios.md. A word in a template is a word
# no page can change.
copy:
  title: 2 Brothers.
  mission: On a mission to build a school of new patterns of learning.
  verse: >-
    In the elder days of Art,<br>
    Builders wrought with greatest care<br>
    Each minute and unseen part;<br>
    For the Gods see everywhere.
  sign: ~ Vivekbala && Princeton
---

{% include home/air.html %}
{% include home/wordmark.html %}

<article class="helios-about">
  <h3 class="italic">{{ page.copy.title }}</h3>
  <p class="helios-about-mission">{{ page.copy.mission }}</p>
  <p>
  
  </p>
  <blockquote>
    <p>
      {{ page.copy.verse }}
    </p>
  </blockquote>
  <p class="helios-about-sign">{{ page.copy.sign }}</p>
</article>

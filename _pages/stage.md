---
layout: folio
look: experiences
permalink: /stage
# The short address: it SERVES the document, it does not redirect to it. The
# words live in _pages/experiences.md (that page owns them); this one reads
# them back out of `site.pages` and renders the same include
# (_includes/experiences/document.html), so /stage is the page rather than a
# hand-off that paints a spinner on the way.
#
# `canonical` and `sitemap: false` are the alias declaration: search engines
# keep one Experiences. Flip `canonical` if the short address should ever be
# the one that is indexed.
#
# The four metadata lines below are the only copy written twice, and they have
# to be: the head reads them before any Liquid in the body can. They mirror
# _pages/experiences.md, so change them together.
canonical: /experiences
nav_url: /experiences
title: Math Takes the Stage
nav_tone: dark
heroimgurl: /assets/lib/helios/parallel/creators-smiling.webp
excerpt: Give students a stage to share their mathematical creations, discoveries and stories. Explore symposia, festivals and student-led workshops with PaperLand.
sitemap: false
---

{%- assign experiences = site.pages | where: 'path', '_pages/experiences.md' | first -%}
{% include experiences/document.html doc=experiences %}

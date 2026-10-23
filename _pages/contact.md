---
layout: redirect
permalink: /contact
# NO redirect_link: this page IS the letter's route, and where a cold arrival
# lands is the letter's own business — _data/contact.yml declares it and
# _layouts/redirect.html resolves it. One address, one file.
title: Contact Us
excerpt: Email us at info@paperland.sg or send us a message about sharing your love for math with your community.
sitemap: false
---

{%- comment -%}
  The cold arrival, and only that.

  The letter itself is four files — markup (_includes/contact_modal.html), skin
  (components/contact.css), behaviour (assets/js/contact.js) and words and
  addresses (_data/contact.yml) — placed by every layout that carries the nav
  and opened in place from whichever page the reader is on. This route is for
  the reader with NO relation to a page: an external link, a bookmark, a share,
  no JavaScript. It funnels them to the letter's `arrival`, where the dialog is
  waiting, without knowing that address itself.

  So the route must keep working and must keep being cheap: it is the fallback
  for a reader who has nothing else, the target the nav can link without a
  second form to keep in step, and the address the proxy can be handed.
{%- endcomment -%}

---
layout: page
title: Contact Us
excerpt: Email us at info@paperland.sg — or send us a message about sharing your love for math with your community.
permalink: /contact
---

{%- comment -%}
  Let's Work Together. Lifted out of the old homepage when Helios took `/`.

  This page exists so the site keeps one addressable contact surface: both navs
  linked `/#contact`, and the folio nav's "Join Us" is the primary action on the
  homepage. Both now point here instead of at a fragment of a drafted page.
{%- endcomment -%}

<section id="contact" class="mt-16">
  <h2 class="my-8 text-4xl font-bold text-center lg:text-5xl text-secondary">Let's Work<span class="text-primary font-paperlang"> Together!</span></h2>

  <div class="my-8 sm:flex sm:justify-center">
    <div class="m-8 sm:w-5/12">
      <p>Wish to share your <span class="text-primary font-paperlang"> love</span> for math with your community?</p><br>
      <p>Have a burning question, a wild idea, or a creation you're unreasonably proud of?</p><br>
      <p>Or maybe you just want to say hello!</p><br>

      Email us at <a class="underline" href="mailto:info@paperland.sg">info@paperland.sg</a> or send us a message!
    </div>

    {% include contact_form.html
      message_placeholder="Ask us anything!"
      button_text="Send!"
      %}
  </div>
</section>

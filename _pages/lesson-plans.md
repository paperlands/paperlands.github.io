---
layout: page
title: Lesson Plans
excerpt: A curated collection of PaperLand lesson plans for teachers.
id: lesson-plans
permalink: /lesson-plans
programme:
  foundation:
    - lesson: regular_gemstone
    - lesson: circular_arc
    - lesson: moving_patterns
    - lesson: oscillating_heartbeat
    - lesson: seemingly_random
  additional:
    - lesson: monster_face
    - lesson: similar_triangles
    - lesson: endless_chain_of_squares

# Copy lives here — the page's own surface. The body below names placements and
# loops, never words: each block below is one thing the page says, and the two
# forms of the same form (/lesson-plans' paper one and the letter's night one)
# say different things, which is why every word the form draws is passed in
# rather than defaulted in the include.
copy:
  intro:
    title: Getting Started
    lede: If you're a new teacher, start with these 5 foundational lesson plans to learn the basic computational skills needed to explore math further on the platform. Each lesson builds on the previous one, introducing key concepts through hands-on activities.
  additional:
    title: Additional Lessons
    lede: Specialized lessons for advanced topics and creative projects.
  soon:
    title: Coming Soon
    lede: More specialized lessons are in development. Check back soon!
  cta:
    title: Have an Idea for a Lesson?
    lede: We're always looking to grow our library with topics that matter to teachers.
  form:
    name_label: Name*
    name_placeholder: Alan Kay
    email_label: Email*
    email_placeholder: alan@paperland.sg
    message_label: Your lesson idea*
    message_placeholder: Describe the concept or topic you'd like us to turn into a lesson
    button_text: Share your idea
    receipt_sent: 'Sent! To the desks <a class="text-blue-600 underline" href="/about"><b>@paperland</b></a>'
    receipt_bad: If you are human, please try again.
    close_label: Close
---

<div class="mb-10 text-center">
  <h2 class="mt-16 mb-4 text-5xl font-bold">{{ page.copy.intro.title }}</h2>
  <p class="max-w-2xl mx-auto text-base leading-relaxed text-gray-600">{{ page.copy.intro.lede }}</p>
</div>

<div class="grid grid-cols-1 gap-5 mb-4 sm:grid-cols-2 lg:grid-cols-3">
  {% for item in page.programme.foundation %}
  {% include lesson_card.html item=item number=forloop.index %}
  {% endfor %}
</div>

<div class="pt-6 mt-12 mb-6 text-center border-t border-gray-200">
  <h2 class="mt-16 mb-4 text-5xl font-bold">{{ page.copy.additional.title }}</h2>
  <p class="m-0 text-base text-gray-600">{{ page.copy.additional.lede }}</p>
</div>

<div class="grid grid-cols-1 gap-5 mb-4 sm:grid-cols-2">
  {% for item in page.programme.additional %}
  {% include lesson_card.html item=item %}
  {% endfor %}

  <div class="flex flex-col overflow-hidden bg-white border border-gray-200 rounded-lg opacity-50 cursor-not-allowed pointer-events-none">
    <div class="h-36 bg-gradient-to-br from-gray-200 to-gray-100"></div>
    <div class="flex flex-col flex-1 p-4">
      <h3 class="mt-0 mb-1 text-base font-semibold leading-snug">{{ page.copy.soon.title }}</h3>
      <p class="m-0 text-sm leading-relaxed text-gray-600">{{ page.copy.soon.lede }}</p>
    </div>
  </div>
</div>

<section class="pt-8 mt-16 border-t border-gray-200">
  <h2 class="mt-16 mb-4 text-5xl font-bold text-center">{{ page.copy.cta.title }}</h2>
  <p class="mb-8 text-center text-gray-600">{{ page.copy.cta.lede }}</p>
  <div class="max-w-lg mx-auto">
    {% include contact_form.html
        name_label=page.copy.form.name_label
        name_placeholder=page.copy.form.name_placeholder
        email_label=page.copy.form.email_label
        email_placeholder=page.copy.form.email_placeholder
        message_label=page.copy.form.message_label
        message_placeholder=page.copy.form.message_placeholder
        button_text=page.copy.form.button_text
        receipt_sent=page.copy.form.receipt_sent
        receipt_bad=page.copy.form.receipt_bad
        close_label=page.copy.form.close_label %}
  </div>
</section>

---
layout: page
title: Lesson Plans
excerpt: A curated collection of PaperLand lesson plans for teachers.
id: lesson-plans
permalink: /lesson-plans
nav: false
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
---

<div class="mb-10 text-center">
  <h2 class="mt-16 mb-4 text-5xl font-bold">Getting Started</h2>
  <p class="max-w-2xl mx-auto text-base leading-relaxed text-gray-600">If you're a new teacher, start with these 5 foundational lesson plans to learn the basic computational skills needed to explore math further on the platform. Each lesson builds on the previous one, introducing key concepts through hands-on activities.</p>
</div>

<div class="grid grid-cols-1 gap-5 mb-4 sm:grid-cols-2 lg:grid-cols-3">
  {% for item in page.programme.foundation %}
  {% include lesson_card.html item=item number=forloop.index %}
  {% endfor %}
</div>

<div class="pt-6 mt-12 mb-6 text-center border-t border-gray-200">
  <h2 class="mt-16 mb-4 text-5xl font-bold">Additional Lessons</h2>
  <p class="m-0 text-base text-gray-600">Specialized lessons for advanced topics and creative projects.</p>
</div>

<div class="grid grid-cols-1 gap-5 mb-4 sm:grid-cols-2">
  {% for item in page.programme.additional %}
  {% include lesson_card.html item=item %}
  {% endfor %}

  <div class="flex flex-col overflow-hidden bg-white border border-gray-200 rounded-lg opacity-50 cursor-not-allowed pointer-events-none">
    <div class="h-36 bg-gradient-to-br from-gray-200 to-gray-100"></div>
    <div class="flex flex-col flex-1 p-4">
      <h3 class="mt-0 mb-1 text-base font-semibold leading-snug">Coming Soon</h3>
      <p class="m-0 text-sm leading-relaxed text-gray-600">More specialized lessons are in development. Check back soon!</p>
    </div>
  </div>
</div>

<section class="pt-8 mt-16 border-t border-gray-200">
  <h2 class="mt-16 mb-4 text-5xl font-bold text-center">Have an Idea for a Lesson?</h2>
  <p class="mb-8 text-center text-gray-600">We're always looking to grow our library with topics that matter to teachers.</p>
  <div class="max-w-lg mx-auto">
    {% include contact_form.html
        message_label="Your lesson idea*"
        message_placeholder="Describe the concept or topic you'd like us to turn into a lesson"
        button_text="Share your idea" %}
  </div>
</section>

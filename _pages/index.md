---
layout: page
title: Paperland - Designing new patterns of learning
excerpt: We believe that the world would be a better place if the processes we shape illuminates and uplifts the spirit of fellowship and belonging. 
image: /assets/lib/beauty_first.png
id: home
permalink: /
---
<div class="my-24 text-center sm:my-36">
  <h1 class="mb-8 font-paperlang text-6xl tracking-tighter sm:text-9xl">paperLand.</h1>
  <div class="text-2xl font-paperlang">Designing new patterns of learning!</div>
</div>


<section class="max-w-6xl px-4 py-8 mx-auto sm:px-6 lg:px-4" id="projects">
  <h2 class="my-8 text-4xl text-center">Our Work</h2><hr>
  <div class="grid grid-cols-1 gap-6 my-12 sm:grid-cols-2">
    <div class="flex flex-col items-center justify-center w-full overflow-hidden rounded-lg bg-secondary-light">
      <a href="/dojo" target="_self" class="card-link">
        <div>
            <img class="object-cover object-center w-full h-auto" src="/assets/lib/landing/wan_workshop_16x9.jpg" alt="Project Dojo students interacting with collaborative learning medium">
        </div>
        <div class="py-8 text-center sm:py-6">
            <p class="mb-2 text-xl font-bold text-text">Dojo</p>
            <p class="px-8 text-base sm:px-16 text-text ">We design workshops to help students discover the JOY of computation</p>
        </div>
      </a>
    </div>
    <div class="flex flex-col items-center justify-center w-full overflow-hidden rounded-lg bg-secondary-light">
    <a href="/workshop" target="_self" class="card-link">
        <div>
            <img class="object-cover object-center w-full h-auto" src="/assets/lib/landing/ivansutherland.jpeg" alt="Sutherland on Sketchpad">
        </div>
        <div class="py-8 text-center sm:py-6">
            <p class="mb-2 text-xl font-bold text-text">Mathland</p>
            <p class="px-8 text-base sm:px-16 text-text ">We discover the BEAUTY of math through code together</p>
        </div>
    </a>
    </div>
  </div>
</section>


<section>
  <h2 class="my-8 text-4xl text-center">Why Paperland?</h2><hr>
  <div class="sm:flex sm:justify-center">
    <div class="m-8 sm:w-5/12 sm:h-5/12">
      <p>We believe that the world would be a better place if the processes we shape and weave illuminates and uplifts the spirit of fellowship and belonging.</p>
      <br>
      <p>We want to build the tools, the environment, the incentives that will lead to better patterns of teaching for the builders of tomorrow.</p>
    </div>
    <div class="m-8 sm:w-1/4 sm:h-1/4">
      <img class="rounded-md" src="/assets/lib/landing/castle_sun_1x1.png" />
    </div>
  </div>
</section>



<section id="blog" class="my-32">
  <h2 class="my-8 text-4xl text-center">Blog</h2><hr>
  <div class="grid grid-cols-1 gap-4 my-8 sm:grid-cols-2">
    {% assign recent_notes = site.notes | sort: "last_modified_at_timestamp" | reverse %}
      {% for note in recent_notes limit: 5 %}
          <div class="p-4 border rounded-lg bg-secondary-light">
            <!-- <img src="assets/lib/conquer.png" alt="Placeholder Image" class="object-cover rounded-md"> -->
            <div class="px-1 py-4">
              <a class="internal-link" href="{{ site.baseurl }}{{ note.url }}" data-tooltip="true">{{ note.title }}</a>
              <p class="text-base text-gray-700">
                {{ note.last_date | date: "%Y-%m-%d" }}
              </p>
            </div>
          </div>
      {% endfor %}
  </div>
</section>



<section id="contact">
  <h2 class="my-8 text-4xl text-center">Contact Us</h2><hr>

  <div class="my-8 sm:flex sm:justify-center">
    <div class="m-8 sm:w-5/12">
      <p>Looking for innovative learning workshops?</p><br>
      <p>Let's discuss further!</p>
      Drop us an email <a class="underline" href="mailto:info@paperland.in">info@paperland.in</a>
    </div>
    
    {% include contact_form.html
      href="/dojo" %}
  </div>
</section>

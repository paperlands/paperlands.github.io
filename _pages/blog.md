---
layout: page
title: Blog
excerpt: Notes, essays and films from the desks at PaperLand — learning mathematics by building things you can see.
permalink: /blog
yt_gallery:
  - type: youtube
    video_id: aJ8Me8VZU8c
    thumbnail: https://img.youtube.com/vi/NgbSnVDSu1w/mqdefault.jpg
    title: The National Young Gambian Math Leaders
  - type: youtube
    video_id: 7WFR32Q6ZE0
    thumbnail: https://img.youtube.com/vi/7WFR32Q6ZE0/mqdefault.jpg
    title: What if we forget sine?
  - type: youtube
    video_id: PokC0uLCz2o
    thumbnail: https://img.youtube.com/vi/PokC0uLCz2o/mqdefault.jpg
    title: The Ten Thousand Names of Triangles 
  - type: youtube
    video_id: fw6q_C-tWuQ
    thumbnail: https://img.youtube.com/vi/fw6q_C-tWuQ/mqdefault.jpg
    title:  This Is Irrational. 
  - type: youtube
    video_id: cFJKHatepQo
    thumbnail: https://img.youtube.com/vi/cFJKHatepQo/mqdefault.jpg
    title: What if Pythagoras Theorem was forgotten? 
---

{%- comment -%}
  The Library. Lifted out of the old homepage when Helios took `/` — it was the
  only surface that listed the notes collection, so drafting the homepage
  without it would have orphaned `_notes/` from the nav entirely.

  Standing document treatment for now (layout: page), not Helios. Retheming
  this is phase-4 work, not a consequence of the permalink swap.
{%- endcomment -%}

<section id="blog" class="mt-16">
  <h2 class="my-8 text-4xl font-bold tracking-tight text-center lg:text-5xl text-secondary">Our <span class="text-primary font-paperlang">Library.</span></h2>

  <div class="grid grid-cols-1 gap-8 my-12 sm:grid-cols-2">
    {% assign recent_notes = site.notes | sort: "last_date" %}
    {% for note in recent_notes limit: 5 %}
      <div class="relative overflow-hidden transition-all duration-300 rounded-lg group hover:shadow-md">
      <a href="{{ site.baseurl }}{{ note.url }}" data-tooltip="true" >
        <div class="relative h-64 overflow-hidden">
          <img
            src="{{note.heroimgurl}}"
            alt=""
            class="object-cover w-full h-full transition-transform duration-700 transform group-hover:scale-105"
          >
          <!-- Hovering effect -->
          <div class="absolute inset-0 transition-opacity duration-300 opacity-100 bg-gradient-to-t from-black/90 to-transparent group-hover:from-amber-900/80"></div>
        </div>
        <!-- Content that slides up on hover -->
        <div class="absolute bottom-0 left-0 right-0 p-6 transition-transform duration-300 transform translate-y-8 group-hover:translate-y-0">
          <!-- Date with minimal styling -->
          <p class="mb-2 text-xs font-light transition-opacity duration-300 opacity-0 text-white/80 group-hover:opacity-100">
            {{ note.last_date | date: "%B %d, %Y" }}
          </p>
          <!-- Title with emphasis -->
          <div
            class="block text-xl font-medium text-white transition-colors duration-300"
          >{{ note.title }}</div>
          <!-- Read more link that appears on hover -->
          <p class="inline-flex items-center mt-3 text-sm transition-all duration-300 opacity-0 text-white/90 group-hover:opacity-100">
            Learn more..
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-1 transition-transform duration-300 transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </p>
        </div>
        </a>
      </div>
    {% endfor %}
  </div>
  <hr class="my-8">
  {% include gallery.html items=page.yt_gallery id="yt-gallery" %}
  <div class="flex justify-center">
  <a class="px-4 py-2 my-4 rounded-md text-primary-light bg-primary" href="https://www.youtube.com/@realPaperLand">Discover More</a>
</div>
</section>

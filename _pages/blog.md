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

  Two inks here are darker than the brand's own, and both are measured rather
  than chosen: the brand orange on paper is 1.98:1 and the pale ink on the
  orange button was 1.83:1 — both under WCAG AA, and the button is body-sized
  text. `text-orange-850` reads 3.27:1 on paper (AA for the 36px heading) and
  the page's own dark ink reads 5.93:1 on the button. Neither is a new colour:
  both are in core/tokens.css. Put the brand orange back the day the Library is
  rethemed, not before.
{%- endcomment -%}

<section id="blog" class="mt-16">
  <h2 class="my-8 text-4xl font-bold tracking-tight text-center lg:text-5xl text-secondary">Our <span class="text-orange-850 font-paperlang">Library.</span></h2>

  <div class="grid grid-cols-1 gap-8 my-12 sm:grid-cols-2">
    {% assign recent_notes = site.notes | sort: "last_date" %}
    {% for note in recent_notes limit: 5 %}
      <div class="relative overflow-hidden transition-all duration-300 rounded-lg group hover:shadow-md">
      <a href="{{ site.baseurl }}{{ note.url }}" data-tooltip="true" >
        <div class="relative h-64 overflow-hidden">
          {%- comment -%} Five covers of photographs at their own full size, and
             the Library is the heaviest first view on the site because of it: on a
             phone each card is a full screen, so only the first is in the reader's
             viewport and only the first is worth fetching at high priority. The
             other four arrive as the reader scrolls to them. {%- endcomment -%}
          <img
            src="{{note.heroimgurl}}"
            alt=""
            decoding="async"
            {% if forloop.first %}fetchpriority="high"{% else %}loading="lazy"{% endif %}
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
  <a class="px-4 py-2 my-4 rounded-md text-secondary bg-primary" href="https://www.youtube.com/@realPaperLand">Discover More</a>
</div>
</section>

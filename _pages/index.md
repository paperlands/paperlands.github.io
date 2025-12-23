---
layout: page
title: Paperland - Designing new patterns of learning
excerpt: We believe that the world would be a better place if the processes we shape illuminates and uplifts the spirit of fellowship and belonging. 
image: /assets/lib/beauty_first.png
id: home
permalink: /
nav_color: white
---

<section class="h-[70vh] animate-fade-in md:h-[75vh]">
  <video class="absolute top-0 left-0 w-screen h-[100vh] object-cover brightness-[40%] -z-10" 
    src="/assets/lib/landing/3DWaves_small.webm" 
    poster="/assets/lib/landing/3DWaves.webp" 
    alt="Math x Computation hero video" 
    autoplay loop muted playsinline 
  />
  <!-- <img class="absolute top-0 left-0 w-screen h-[100vh] object-cover brightness-[40%] -z-10" src="/assets/lib/landing/3DWaves.webp" alt=""> -->

  <div class="flex flex-col items-center justify-center mt-40">
    <h1 class="text-5xl tracking-tighter text-center text-white font-paperlang lg:text-8xl">where math <span class="text-primary">Lives.</span></h1>
    <div class="my-4 text-lg text-center text-white lg:my-8 lg:text-2xl">Coding, Exploring and Sharing<br>Math's hidden Beauty.</div>
    <a class="px-4 py-2 my-4 rounded-md bg-primary font-paperlang" href="https://dojo.paperland.sg/welcome">Enter PaperLand</a>
  </div>
</section>



<!-- Approach section -->
<section class="px-4 mt-32 mb-2 lg:px-0 lg:mx-32 animate-fade-in">
  <h2 class="text-4xl font-bold text-center lg:text-5xl font-paperlang text-secondary">
    Bring Math to Life with Code
  </h2>
  <div class="flex flex-col items-center justify-center my-4">
    <div class="flex flex-col items-start mx-auto">
      <span>1. <span class="text-lg font-bold text-secondary lg:text-xl">Craft</span> your own mathematical paths</span>
      <span>2. <span class="text-lg font-bold text-secondary lg:text-xl">Experiment</span> with ideas and conjectures</span>
      <span>3. <span class="text-lg font-bold text-secondary lg:text-xl">Collaborate</span> to test and refine ideas</span>
      <span>4. <span class="text-lg font-bold text-secondary lg:text-xl">Embrace</span> productive struggle</span>
    </div>
  </div>
</section>

<div id="media-gallery" class="max-w-4xl mx-auto">
  <!-- Main Display -->
  <div class="w-full mx-auto overflow-hidden bg-black shadow-xl aspect-video rounded-xl sm:w-3/4">
    <div class="w-full h-full">
      <div class="w-full h-full media-slide" data-index="0">
        <video src="/assets/lib/landing/fibonacci_spiral.webm" poster="/assets/lib/landing/fibonacci_spiral.webp" class="object-cover w-full h-full" muted playsinline></video>
      </div>
      <div class="hidden w-full h-full media-slide" data-index="1">
        <video data-src="/assets/lib/landing/3DWaves_small.webm" class="object-cover w-full h-full" muted playsinline></video>
      </div>
      <div class="hidden w-full h-full media-slide" data-index="2">
        <video data-src="/assets/lib/landing/tree_fractal.webm" class="object-cover w-full h-full" muted playsinline></video>
      </div>
      <div class="hidden w-full h-full media-slide" data-index="3">
        <video data-src="/assets/lib/landing/polygon_fill.webm" class="object-cover w-full h-full" muted playsinline></video>
      </div>
      <div class="hidden w-full h-full media-slide" data-index="4">
        <video data-src="/assets/lib/landing/prime_sequence.webm" class="object-cover w-full h-full" muted playsinline></video>
      </div>
      <div class="hidden w-full h-full media-slide" data-index="5">
        <video data-src="/assets/lib/landing/sine_curve_with_code.webm" class="object-cover w-full h-full" muted playsinline></video>
      </div>
    </div>
  </div>
  <!-- Thumbnails (unchanged) -->
  <div class="relative max-w-xl mx-auto">
    <div class="flex items-center gap-3 px-6 py-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 media-thumb" data-index="0" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/fibonacci_spiral.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 media-thumb" data-index="1" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/3DWaves.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 media-thumb" data-index="2" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/tree_fractal.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 media-thumb" data-index="3" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/polygon_fill.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 media-thumb" data-index="4" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/prime_sequence.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 media-thumb" data-index="5" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/sine_curve_with_code.webp" alt=""></button>
    </div>
  </div>
</div>

<script>
document.addEventListener('DOMContentLoaded', function () {
  const gallery = document.getElementById('media-gallery');
  if (!gallery) return;

  const slides = gallery.querySelectorAll('.media-slide');
  const thumbs = gallery.querySelectorAll('.media-thumb');
  if (!slides.length || !thumbs.length) return;

  let currentIndex = 0;

  // Horizontal scroll container for thumbnails
  const thumbScroller = thumbs[0].closest('.overflow-x-auto');

  function ensureVideoLoaded(slide) {
    const video = slide.querySelector('video');
    if (!video) return;

    if (!video.src) {
      const realSrc = video.dataset.src;
      if (realSrc) {
        video.src = realSrc;
        video.load();
      }
    }
  }

  function pauseMedia(slide) {
    const video = slide.querySelector('video');
    if (video) video.pause();
  }

  function playMedia(slide) {
    const video = slide.querySelector('video');
    if (!video) return;

    // Don't force currentTime to 0 here; let it play naturally.
    video.play().catch(() => {
      // On some mobile browsers autoplay may be blocked;
      // in that case, don't try to auto-advance based on "ended".
    });
  }

  function setActiveThumb(index) {
    thumbs.forEach((thumb, i) => {
      if (i === index) {
        thumb.classList.add('ring-2', 'ring-primary');
      } else {
        thumb.classList.remove('ring-2', 'ring-primary');
      }
    });
  }

  function scrollThumbIntoCenter(index) {
    if (!thumbScroller) return;

    const thumb = thumbs[index];
    const scrollerRect = thumbScroller.getBoundingClientRect();
    const thumbRect = thumb.getBoundingClientRect();
    const currentScroll = thumbScroller.scrollLeft;

    const thumbCenter = thumbRect.left + thumbRect.width / 2;
    const scrollerCenter = scrollerRect.left + scrollerRect.width / 2;
    const offset = thumbCenter - scrollerCenter;

    thumbScroller.scrollTo({
      left: currentScroll + offset,
      behavior: 'smooth'
    });
  }

  function showSlide(index) {
    if (index === currentIndex) return;
    if (index < 0 || index >= slides.length) return;

    // Hide current slide
    slides[currentIndex].classList.add('hidden');
    pauseMedia(slides[currentIndex]);

    // Show new slide
    currentIndex = index;
    const newSlide = slides[currentIndex];

    ensureVideoLoaded(newSlide);
    newSlide.classList.remove('hidden');
    playMedia(newSlide);

    // Update UI
    setActiveThumb(currentIndex);
    scrollThumbIntoCenter(currentIndex);
  }

  function showNextSlide() {
    const nextIndex = (currentIndex + 1) % slides.length;
    showSlide(nextIndex);
  }

  // Attach safe auto-advance handlers
  function attachEndedHandlers() {
    slides.forEach((slide, index) => {
      const video = slide.querySelector('video');
      if (!video) return;

      video.addEventListener('ended', () => {
        // Only act if this slide is still the current one
        if (index !== currentIndex) return;

        // Guard: on some browsers or unsupported formats,
        // duration may be NaN or 0 and "ended" may fire weirdly.
        const duration = video.duration;

        if (!duration || isNaN(duration) || duration < 1) {
          // Don't auto-advance for bogus/unsupported videos
          return;
        }

        // If we've truly reached the end, advance
        showNextSlide();
      });
    });
  }

  // Initial state — only first slide visible and playing
  slides.forEach((slide, i) => {
    if (i === 0) {
      slide.classList.remove('hidden');
      playMedia(slide);
    } else {
      slide.classList.add('hidden');
      pauseMedia(slide);
    }
  });

  setActiveThumb(0);
  scrollThumbIntoCenter(0);
  attachEndedHandlers();

  // Thumbnail click handlers
  thumbs.forEach((thumb) => {
    const index = parseInt(thumb.dataset.index, 10);
    thumb.addEventListener('click', () => {
      showSlide(index);
    });
  });
});
</script>
<div class="flex justify-center">
  <a class="px-4 py-2 my-4 rounded-md bg-primary internal-link" href="/approach">Explore Our Approach</a>
</div>



<!-- Math Leaders Program section -->
<section class="px-4 mb-2 mt-44 lg:px-0 lg:mx-48 animate-fade-in">
  <h2 class="text-4xl font-bold text-center font-paperlang text-secondary lg:text-5xl">Math Leaders Program (MLP)</h2>
  <p class="mt-4 text-center text-secondary/80">We coach student leaders to <span class="text-lg font-bold lg:text-xl text-secondary">spearhead</span> a culture of <span class="text-lg font-bold lg:text-xl text-secondary">creative</span> mathematical inquiry in <span class="text-lg font-bold lg:text-xl text-secondary">service</span> of their wider community.</p>
</section>
<div id="mlp-gallery" class="max-w-4xl mx-auto">
<!-- Approach section -->
  <div class="w-full mx-auto overflow-hidden bg-black shadow-xl aspect-video rounded-xl sm:w-3/4">
    <div class="relative w-full h-full">
      <div class="absolute inset-0 w-full h-full transition duration-500 ease-out mlp-slide" data-index="0"><img src="/assets/lib/landing/SUTD_calculus_16x9.jpg" class="object-cover w-full h-full" alt=""></div>
      <div class="absolute inset-0 hidden w-full h-full transition duration-500 ease-out mlp-slide" data-index="1"><img loading="lazy" src="/assets/lib/landing/wan_workshop_16x9.jpg" class="object-cover w-full h-full" alt=""></div>
      <div class="absolute inset-0 hidden w-full h-full transition duration-500 ease-out mlp-slide" data-index="2"><img loading="lazy" src="/assets/lib/landing/knowledge_park_16x9.webp" class="object-cover w-full h-full" alt=""></div>
      <div class="absolute inset-0 hidden w-full h-full transition duration-500 ease-out mlp-slide" data-index="3"><img loading="lazy" src="/assets/lib/landing/senang_16x9.webp" class="object-cover w-full h-full" alt=""></div>
      <div class="absolute inset-0 hidden w-full h-full transition duration-500 ease-out mlp-slide" data-index="4"><img loading="lazy" src="/assets/lib/landing/ca_workshop_16x9.jpg" class="object-cover w-full h-full" alt=""></div>
      <div class="absolute inset-0 hidden w-full h-full transition duration-500 ease-out mlp-slide" data-index="5"><img loading="lazy" src="/assets/lib/landing/stpats_discord_bot_workshop_16x9.jpg" class="object-cover w-full h-full" alt=""></div>
    </div>
  </div>
  <div class="relative max-w-xl mx-auto">
    <div class="relative z-10 flex items-center gap-3 px-6 py-2 overflow-x-auto pointer-events-auto snap-x snap-mandatory scrollbar-hide">
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 mlp-thumb" data-index="0" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/SUTD_calculus_16x9.jpg" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 mlp-thumb" data-index="1" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/wan_workshop_16x9.jpg" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 mlp-thumb" data-index="2" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/knowledge_park_16x9.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 mlp-thumb" data-index="3" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/senang_16x9.webp" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 mlp-thumb" data-index="4" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/ca_workshop_16x9.jpg" alt=""></button>
      <button class="w-20 overflow-hidden rounded-lg h-14 snap-center shrink-0 mlp-thumb" data-index="5" type="button"><img class="object-cover w-full h-full" src="/assets/lib/landing/stpats_discord_bot_workshop_16x9.jpg" alt=""></button>
    </div>
  </div>
</div>
<script>
document.addEventListener("DOMContentLoaded", () => {
  const slides = document.querySelectorAll(".mlp-slide");
  const thumbs = document.querySelectorAll(".mlp-thumb");
  let currentIndex = 0;
  function showSlide(index) {
    slides.forEach(slide => {
      slide.classList.add("hidden");
    });
    slides[index].classList.remove("hidden");
    thumbs.forEach(thumb => {
      thumb.classList.remove("ring-2","ring-primary");
    });
    thumbs[index].classList.add("ring-2","ring-primary");
    currentIndex = index;
  }
  function nextSlide() {
    const nextIndex = (currentIndex + 1) % slides.length;
    showSlide(nextIndex);
  }
  thumbs.forEach(thumb => {
    thumb.addEventListener("click", () => {
      const index = Number(thumb.dataset.index);
      showSlide(index);
    });
  });
  showSlide(0);
  setInterval(nextSlide,3000);
});
</script>
<div class="flex justify-center">
  <a class="px-4 py-2 my-4 rounded-md bg-primary internal-link" href="/mlp">Learn More</a>
</div>



<section class="mt-36">
  <h2 class="my-8 text-4xl font-bold text-center lg:text-5xl text-secondary">Why Paperland?</h2>
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



<section id="blog" class="mt-36 ">
  <h2 class="my-8 text-4xl font-light font-bold tracking-tight text-center lg:text-5xl text-secondary">Blog.</h2>
  
  <div class="grid grid-cols-1 gap-8 my-12 sm:grid-cols-2">
    {% assign recent_notes = site.notes | sort: "last_modified_at_timestamp" | reverse %}
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
</section>



<!-- Contact us -->
<section id="contact" class="mt-36">
  <h2 class="my-8 text-4xl font-bold text-center lg:text-5xl text-secondary">Contact Us</h2>

  <div class="my-8 sm:flex sm:justify-center">
    <div class="m-8 sm:w-5/12">
      <p>Want to bring computation into mathematics for your students?</p><br>
      <p>Want a demo?</p><br>
      <p>Let's chat!</p>
      Email us at <a class="underline" href="mailto:info@paperland.sg">info@paperland.sg</a>
    </div>
    
    {% include contact_form.html
      href="/dojo" %}
  </div>
</section>

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
  <video class="absolute top-0 left-0 w-screen h-[100vh] object-cover brightness-[40%] -z-10" src="/assets/lib/landing/hero_video.mp4" alt="Math x Computation hero video" autoplay loop muted playsinline />

  <div class="flex flex-col items-center justify-center mt-40">
    <h1 class="text-5xl tracking-tighter text-center text-white font-paperlang lg:text-8xl">where math <span class="text-primary">Lives.</span></h1>
    <div class="my-4 text-lg text-center text-white lg:my-8 lg:text-2xl">Coding, Exploring and Sharing<br>Math's hidden Beauty.</div>
    <a class="px-4 py-2 my-4 rounded-md bg-primary font-paperlang" href="https://dojo.paperland.sg/welcome">Enter PaperLand</a>
  </div>
</section>



<!-- Discovering mathematics section -->
<section class="px-4 mt-16 mb-2 lg:px-0 lg:mx-32 animate-fade-in">
  <h2 class="text-3xl font-bold text-center text-secondary lg:text-4xl">
    Bring Math to Life with Code
  </h2>
  <p class="mt-4 text-sm text-center text-secondary/80 lg:text-base">
    CRAFT → EXPERIMENT → COLLABORATE → GROW
  </p>
  <div class="flex flex-col items-center justify-center my-4">
    <div class="flex flex-col items-start mx-auto">
      <span>1. Craft your own mathematical paths</span>
      <span>2. Experiment with ideas and conjectures</span>
      <span>3. Collaborate to test and refine ideas</span>
      <span>4. Embrace productive struggle</span>
    </div>
  </div>
</section>

<div id="media-gallery" class="max-w-4xl mx-auto">
  <!-- MAIN DISPLAY (slightly smaller, still dominant) -->
  <div class="w-full mx-auto overflow-hidden bg-black shadow-xl aspect-video rounded-xl sm:w-3/4">
    <div class="w-full h-full">
      <!-- Slide 0 – Video -->
      <div class="w-full h-full media-slide" data-index="0">
        <video
          src="/assets/lib/landing/fibonacci_spiral.webm"
          poster="/assets/lib/landing/fibonacci_spiral.webp"
          class="object-cover w-full h-full"
          autoplay
          loop
          muted
          playsinline
        ></video>
      </div>
      <!-- Slide 1 – Video -->
      <div class="hidden w-full h-full media-slide" data-index="1">
        <video
          src="/assets/lib/landing/sine_curve.webm"
          class="object-cover w-full h-full"
          autoplay
          loop
          muted
          playsinline
        ></video>
      </div>
      <!-- Slide 2 – Image -->
      <div class="hidden w-full h-full media-slide" data-index="2">
        <video class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/tree.mp4" alt="tree animation" autoplay loop muted playsinline />
      </div>
      <!-- Slide 3 – Video -->
      <div class="hidden w-full h-full media-slide" data-index="3">
        <video
          src="/assets/lib/landing/polygon.mp4"
          class="object-cover w-full h-full"
          autoplay
          loop
          muted
          playsinline
        ></video>
      </div>
      <!-- Slide 4 – Image -->
      <div class="hidden w-full h-full media-slide" data-index="4">
        <video
          src="/assets/lib/landing/xsinx.mp4"
          class="object-cover w-full h-full"
          autoplay
          loop
          muted
          playsinline
        ></video>
      </div>
      <!-- Slide 5 – Video -->
      <div class="hidden w-full h-full media-slide" data-index="5">
        <video
          src="/assets/lib/landing/fibonacci.webm"
          class="object-cover w-full h-full"
          autoplay
          loop
          muted
          playsinline
        ></video>
      </div>
    </div>
  </div>
  <!-- THUMBNAILS – compact horizontal strip, centered on desktop -->
  <div class="relative max-w-xl mx-auto">
    <div class="flex items-center gap-3 px-6 py-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide">
      <!-- Thumb 0 (active by default) -->
      <button
        class="w-20 overflow-hidden transition rounded-lg snap-center shrink-0 h-14 media-thumb ring-2 ring-primary hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
        data-index="0"
        type="button"
        title="fibonacci spiral image"
      >
        <img class="object-cover w-full h-full" src="/assets/lib/landing/fibonacci_spiral.webp" alt="fibonacci spiral image">
      </button>
      <!-- Thumb 1 -->
      <button
        class="w-20 overflow-hidden transition rounded-lg snap-center shrink-0 h-14 media-thumb hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
        data-index="1"
        type="button"
        title="sine curve with code image"
      >
        <img class="object-cover w-full h-full" src="/assets/lib/landing/sine_curve_with_code.webp" alt="fibonacci spiral image">
      </button>
      <!-- Thumb 2 -->
      <button
        class="w-20 overflow-hidden transition rounded-lg snap-center shrink-0 h-14 media-thumb hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
        data-index="2"
        type="button"
        title="tree"
      >
        <img class="object-cover w-full h-full" src="/assets/lib/landing/fibonacci_spiral.webp" alt="fibonacci spiral image">
      </button>
      <!-- Thumb 3 -->
      <button
        class="w-20 overflow-hidden transition rounded-lg snap-center shrink-0 h-14 media-thumb hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
        data-index="3"
        type="button"
        title="Polygon animation"
      >
        <img class="object-cover w-full h-full" src="/assets/lib/landing/fibonacci_spiral.webp" alt="fibonacci spiral image">
      </button>
      <!-- Thumb 4 -->
      <button
        class="w-20 overflow-hidden transition rounded-lg snap-center shrink-0 h-14 media-thumb hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
        data-index="4"
        type="button"
        title="Senang workshop"
      >
        <img class="object-cover w-full h-full" src="/assets/lib/landing/fibonacci_spiral.webp" alt="fibonacci spiral image">
      </button>
      <!-- Thumb 5 -->
      <button
        class="w-20 overflow-hidden transition rounded-lg snap-center shrink-0 h-14 media-thumb hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary"
        data-index="5"
        type="button"
        title="Fibonacci animation"
      >
        <img class="object-cover w-full h-full" src="/assets/lib/landing/fibonacci_spiral.webp" alt="fibonacci spiral image">
      </button>
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

  // Find the horizontal scroll container automatically
  const thumbScroller = thumbs[0].closest('.overflow-x-auto');

  function pauseMedia(slide) {
    const video = slide.querySelector('video');
    if (video) video.pause();
  }

  function playMedia(slide) {
    const video = slide.querySelector('video');
    if (video) {
      video.play().catch(() => {});
    }
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

    const thumbCenter =
      thumbRect.left + thumbRect.width / 2;

    const scrollerCenter =
      scrollerRect.left + scrollerRect.width / 2;

    const offset =
      thumbCenter - scrollerCenter;

    thumbScroller.scrollTo({
      left: currentScroll + offset,
      behavior: 'smooth'
    });
  }

  function showSlide(index) {
    if (index === currentIndex) return;
    if (index < 0 || index >= slides.length) return;

    // Hide old
    slides[currentIndex].classList.add('hidden');
    pauseMedia(slides[currentIndex]);

    // Show new
    currentIndex = index;
    slides[currentIndex].classList.remove('hidden');
    playMedia(slides[currentIndex]);

    // Update UI
    setActiveThumb(currentIndex);
    scrollThumbIntoCenter(currentIndex);
  }

  // ✅ Init
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

  // ✅ Click handlers
  thumbs.forEach((thumb) => {
    const index = parseInt(thumb.dataset.index, 10);
    thumb.addEventListener('click', () => {
      showSlide(index);
    });
  });
});
</script>


<div class="flex justify-center">
  <a class="px-4 py-2 my-4 rounded-md bg-primary font-paperlang internal-link" href="/approach">Explore Our Approach</a>
</div>





<!-- 1st Principles section -->
<section class="mx-auto mb-8 mt-36 lg:mx-32">
<h2 class="my-8 text-3xl font-bold text-center lg:text-4xl">From 1st Principles</h2><hr class="mb-8">

We are designing our lessons around concepts learned in school, but from a <strong class="text-orange-850">1st principles</strong> perspective.<br>
<br>

From uncovering where the "sum of exterior angles" in polygons in <strong class="text-orange-850">geometry</strong> comes from,<br>
to rediscovering <strong class="text-orange-850">calculus</strong> from a geometric perspective by observing change across the unit circle,<br>
to using <strong class="text-orange-850">algebra</strong> and <strong class="text-orange-850">abstraction</strong> to form faces that composes proportionally with their friends' eye.<br>
<br>

The world of computation and mathematics is very deep and we have only just scratched the surface!
</section>
<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div class="hidden sm:grid sm:gap-4">
        <div>
            <video class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/xsinx.mp4" alt="xsin(x) animation" autoplay loop muted playsinline />
        </div>
        <div>
            <img class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/SUTD_calculus_16x9.jpg" alt="calculus workshop">
        </div>
        <div>
            <video class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/tree.mp4" alt="tree animation" autoplay loop muted playsinline />
        </div>
    </div>
    <div class="grid gap-4">
        <div>
            <img class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/ca_workshop_16x9.jpg" alt="cellular automaton workshop">
        </div>
        <div>
            <video class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/prime_numbers.webm" alt="trigo unit circle animation" autoplay loop muted playsinline />
        </div>
        <div>
            <img class="h-auto max-w-full rounded-lg" src="/assets/lib/landing/stpats_discord_bot_workshop_16x9.jpg" alt="stpats workshop">
        </div>
    </div>
</div>



<section class="mt-36">
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



<section id="blog" class="mt-36 ">
  <h2 class="my-8 text-4xl font-light tracking-tight text-center">Blog.</h2>
  <hr>
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



<!-- School Engagement Modes section -->
<div class="relative w-full overflow-hidden mt-52">
    <!-- Left Fade -->
    <div class="absolute top-0 left-0 z-10 w-20 h-full pointer-events-none lg:w-28 bg-gradient-to-r from-background to-transparent"></div>
    <!-- marquee -->
    <div class="flex items-center space-x-8 animate-marquee whitespace-nowrap">
        <img src="assets/lib/school_logos/sutd_logo_grayscale.png" class="h-6 lg:h-28 no-border "/>
        <img src="assets/lib/school_logos/etonhouse_logo_grayscale.png" class="h-8 lg:h-20 no-border "/>
        <img src="assets/lib/school_logos/sjiinternational_logo_grayscale.png" class="h-20 lg:h-36 no-border"/>
        <img src="assets/lib/school_logos/stpats_logo_1x1_grayscale.png" class="h-16 lg:h-32 no-border"/>
        <img src="assets/lib/school_logos/sst_logo_1x1_grayscale.png" class="h-16 lg:h-48 no-border"/>
        <img src="assets/lib/school_logos/huayi_logo_grayscale.png" class="h-16 lg:h-32 no-border"/>
        <img src="assets/lib/school_logos/zhonghua_logo_grayscale.png" class="h-16 lg:h-32 no-border"/>
        <!-- Duplicated to create "endless" loop effect -->
        <img src="assets/lib/school_logos/sutd_logo_grayscale.png" class="h-6 lg:h-28 no-border "/>
        <img src="assets/lib/school_logos/etonhouse_logo_grayscale.png" class="h-8 lg:h-20 no-border "/>
        <img src="assets/lib/school_logos/sjiinternational_logo_grayscale.png" class="h-20 lg:h-36 no-border"/>
        <img src="assets/lib/school_logos/stpats_logo_1x1_grayscale.png" class="h-16 lg:h-32 no-border"/>
        <img src="assets/lib/school_logos/sst_logo_1x1_grayscale.png" class="h-16 lg:h-48 no-border"/>
        <img src="assets/lib/school_logos/huayi_logo_grayscale.png" class="h-16 lg:h-32 no-border"/>
        <img src="assets/lib/school_logos/zhonghua_logo_grayscale.png" class="h-16 lg:h-32 no-border"/>
    </div>
    <!-- Right Fade -->
    <div class="absolute top-0 right-0 w-20 h-full pointer-events-none lg:w-28 bg-gradient-to-l from-background to-transparent"></div>
</div>
<section class=" lg:mx-60">
<h2 class="my-8 text-3xl font-bold text-center lg:text-4xl">School Engagement Modes</h2><hr class="mb-8">

We adapt every engagement to fit the context and student profile of each school. Here are some ways we can kickstart this collaboration with you too:<br>
<br>

<strong class="text-orange-850">1. Workshop series:</strong><br>
<div class="ml-5">
We tailor our workshops for a variety of student profiles. Some students are faster while others need more support. One beautiful aspect about learning through computation is that it's <strong class="text-orange-850">flexible</strong> enough to accomodate all.<br>
</div>
<br>

<strong class="text-orange-850">2. Student-Initiated Learning:</strong><br>
<div class="ml-5">
We designed a series of 1hr <strong class="text-orange-850">online lessons</strong> to engage students in mathematical exploration. Since we are exploring concepts from a geometrical perspective, students naturally explore ways to <strong class="text-orange-850">build</strong> elaborate works of art. The SIL program ends with us laser engraving the mathematical works of art made by students in the final lesson.<br>
</div>
<br>

<strong class="text-orange-850">3. Lesson Co-designing:</strong><br>
<div class="ml-5">
We explore how math teachers can bring  it in their classrooms during curriculum time. We work with them to <strong class="text-orange-850">co-design lesson plans</strong> according to their <strong class="text-orange-850">scheme of work</strong> for the year. These are super exciting as we are pushing the <strong class="text-orange-850">frontier</strong> of math education together.<br>
</div>
<br>

</section>




<!-- Contact us -->
<section id="contact" class="mt-36">
  <h2 class="my-8 text-4xl text-center">Contact Us</h2><hr>

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

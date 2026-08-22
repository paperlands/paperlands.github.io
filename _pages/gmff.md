---
layout: darkpage
title: Gambian Mathematics Film Festival
excerpt: Celebrating the young Gambian spirit of discovery and learning
image: /assets/lib/gmff.png
permalink: /gmff
---
<style>
  * { box-sizing: border-box; }
  body { background: #10100E; color: #F2E7D5; overflow-x: hidden; }
  .orange-line { height: 1px; background: #C84F23; }
  .math-dec { color: #c5b9a5; font: 0.7rem 'Share Tech Mono', monospace; letter-spacing: 0.08em; text-align: center; }
</style>
<main class="min-h-screen py-12 px-4">
  <div class="max-w-6xl mx-auto">
 
    <!-- Header -->
    <div class="text-center">
      
      <style>
 
  :root {
    --gmff-ink: #10100E;
    --gmff-paper: #F2E7D5;
    --gmff-sienna: #C84F23;
    --gmff-sun: #F2A65A;
    --gmff-charcoal: #282622;
  }

  .gmff-presenter { margin-top: 2rem; }
  .gmff-results-wrap { margin: clamp(4rem, 8vw, 6.5rem) auto 0; }

  .gmff-hero {
    display: grid;
    place-items: center;
    padding: clamp(3rem, 8vw, 6rem) 1.25rem;
    background: var(--gmff-ink);
    color: var(--gmff-paper);
  }

  .gmff-hero__frame {
    width: min(100%, 54rem);
    text-align: center;
  }

  .gmff-hero__eyebrow {
    margin: 0 0 0.9rem;
    color: var(--gmff-sun);
    font-family: 'Orbitron', sans-serif;
    font-size: 0.63rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  .gmff-hero__title {
    max-width: 22ch;
    margin: 0 auto 0.75rem;
    color: var(--gmff-paper);
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(1.75rem, 3.6vw, 3.1rem);
    letter-spacing: -0.035em;
    line-height: 1.1;
  }

  .gmff-hero__deck {
    max-width: 38rem;
    margin: 0 auto 2rem;
    color: #D8CCB8;
    font-family: 'Lora', serif;
    font-size: clamp(0.95rem, 1.5vw, 1.12rem);
    line-height: 1.6;
  }

  .gmff-hero__stage {
    position: relative;
    aspect-ratio: 4 / 3;
    overflow: hidden;
    background: #17130F;
    border-left: clamp(0.45rem, 1.2vw, 0.75rem) solid var(--gmff-sienna);
  }

  .gmff-hero__poster-frame, .gmff-hero__video {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }

  .gmff-hero__poster-frame {
    z-index: 2;
    background: #17130F;
  }

  .gmff-hero__poster {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center;
  }

  .gmff-hero__video {
    z-index: 1;
    border: 0;
    background: #000;
  }

  .gmff-hero__play {
    position: absolute;
    z-index: 4;
    top: auto;
    bottom: clamp(0rem, 4vw, 0.5rem);
    left: 50%;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.75rem 1rem;
    border: 1px solid rgba(242, 231, 213, 0.78);
    background: rgba(16, 16, 14, 0.86);
    color: var(--gmff-paper);
    font-family: 'Share Tech Mono', monospace;
    font-size: clamp(0.64rem, 1.4vw, 0.78rem);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    transform: translateX(-50%);
    cursor: pointer;
  }

  .gmff-hero__play:hover { border-color: var(--gmff-sun); color: var(--gmff-sun); }
  .gmff-hero__play:focus-visible { outline: 2px solid var(--gmff-sun); outline-offset: 4px; }

  .gmff-hero__wipe {
    position: absolute;
    z-index: 3;
    inset: 0;
    background: var(--gmff-sienna);
    pointer-events: none;
    transform: translateX(-101%);
  }

  .gmff-hero__stage.is-transitioning .gmff-hero__wipe { animation: gmff-stage-wipe 300ms ease-in-out both; }
  .gmff-hero__stage.is-playing .gmff-hero__poster-frame, .gmff-hero__stage.is-playing .gmff-hero__play { visibility: hidden; }

  @keyframes gmff-stage-wipe {
    0% { transform: translateX(-101%); }
    50% { transform: translateX(0); }
    100% { transform: translateX(101%); }
  }

  @media (max-width: 520px) {
    .gmff-hero { padding: 3rem 1rem; }
    .gmff-hero__stage { aspect-ratio: 4 / 3; }
  }

  @media (prefers-reduced-motion: reduce) {
    .gmff-hero__stage.is-transitioning .gmff-hero__wipe { animation: none; }
    .gmff-hero *, .gmff-hero *::before, .gmff-hero *::after { transition-duration: 0.01ms !important; }
  }
</style>
 
<section class="gmff-hero" id="gmff-hero" aria-label="Gambian Mathematics Film Festival">
  <div class="gmff-hero__frame">
    <p class="gmff-hero__eyebrow">May 16 · 2026</p>
    <h1 class="gmff-hero__title">Gambian Mathematics Film Festival</h1>
    <p class="gmff-hero__deck">A celebration of young Gambian curiosity, creativity, and storytelling.</p>
    <div class="gmff-hero__stage" data-gmff-hero-stage>
      <picture class="gmff-hero__poster-frame">
        <source type="image/webp" srcset="/assets/lib/gmff-720.webp 720w, /assets/lib/gmff-1301.webp 1301w" sizes="(max-width: 520px) calc(100vw - 2rem), 720px" />
        <img class="gmff-hero__poster" src="/assets/lib/gmff.png" alt="Gambian Mathematics Film Festival poster" width="1301" height="1354" />
      </picture>
      <iframe
        class="gmff-hero__video"
        data-gmff-hero-video="https://www.youtube-nocookie.com/embed/IT7jGh46MPc?autoplay=1&rel=0"
        title="Gambian Mathematics Film Festival film"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
      <div class="gmff-hero__wipe" aria-hidden="true"></div>
      <button class="gmff-hero__play" type="button" data-gmff-hero-play aria-label="Play the festival film">▶ <span>Play the festival film</span></button>
    </div>
  </div>
</section>

<div class="gmff-presenter inline-block">
  <span class="font-orbitron text-xs tracking-[0.3em] text-orange-400 opacity-60 uppercase block">
    Young Mathematician Association · Presents with ♡
  </span>
</div>

<div class="orange-line my-4"></div>

<div class="font-lora text-base text-gray-400 leading-relaxed max-w-lg mx-auto font-light tracking-wide space-y-4">
  <p>
    When we asked for films, we weren't looking for perfect proofs or the biggest ideas.
    We were looking for something rarer: <span class="text-orange-400">your team's spirit</span>
    of curiosity that asks "Why?", the joy in creating something together and the courage
    to share it with others so they can feel it too.
  </p>
  <p>
    We felt this overpowering spirit as your questions, ideas and mathematics itself came <span class="text-orange-400">alive</span> in your films.
  </p>
  <p>It was a real joy to witness your curiosity, creativity, and courage as you brought mathematics to life through your creations and stories!</p>
  <p>Here are the work of the finalists of the inaugural Gambian Mathematics Film Festival!</p>
</div>

<section class="gmff-results-wrap w-full">
  {% include festivals/gmff/podium.html %}
</section>
{% include festivals/gmff/podium_assets.html %}

<div data-gmff-modal aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="gmff-modal-title">
  <div class="gmff-modal__shell">
    <div class="gmff-modal__head">
      <div>
        <div class="gmff-modal__eyebrow" data-gmff-school-label></div>
        <h2 class="gmff-modal__title" id="gmff-modal-title"></h2>
      </div>
      <button type="button" class="gmff-modal__close" data-gmff-close aria-label="Close video">×</button>
    </div>
    <video controls playsinline preload="metadata" data-gmff-player aria-label="Festival film"></video>
  </div>
</div>

    <!-- Footer -->
    <div class="text-center  mt-16 pb-8">
      <div class="math-dec text-xs">crafted with reverence for fellowship.</div>
    </div>
 
    </div>
  </div>
</main>
 

<script>
(() => {
  const modal = document.querySelector('[data-gmff-modal]');
  if (!modal) return;
  const player = modal.querySelector('[data-gmff-player]');
  const title = modal.querySelector('#gmff-modal-title');
  const schoolLabel = modal.querySelector('[data-gmff-school-label]');
  const close = modal.querySelector('[data-gmff-close]');
  const focusableSelector = 'button:not([disabled]), video, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])';
  let lastTrigger;

  const closeModal = () => {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('gmff-modal-open');
    player.pause();
    player.removeAttribute('src');
    player.load();
    lastTrigger?.focus();
  };

  document.querySelectorAll('[data-gmff-video]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      lastTrigger = trigger;
      player.src = trigger.dataset.gmffVideo;
      title.textContent = trigger.dataset.gmffTitle;
      schoolLabel.textContent = trigger.dataset.gmffSchool || '';
      player.setAttribute('aria-label', `Play ${trigger.dataset.gmffTitle}`);
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('gmff-modal-open');
      close.focus();
    });
  });

  close.addEventListener('click', closeModal);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (!modal.classList.contains('is-open')) return;
    if (event.key === 'Escape') {
      closeModal();
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [...modal.querySelectorAll(focusableSelector)];
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
})();
</script>

<script>
(() => {
  const stage = document.querySelector('[data-gmff-hero-stage]');
  const play = document.querySelector('[data-gmff-hero-play]');
  const video = stage?.querySelector('[data-gmff-hero-video]');
  if (!stage || !play || !video) return;

  play.addEventListener('click', () => {
    if (stage.classList.contains('is-transitioning') || stage.classList.contains('is-playing')) return;
    const startVideo = () => {
      video.src = video.dataset.gmffHeroVideo;
      stage.classList.add('is-playing');
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      startVideo();
      return;
    }

    stage.classList.add('is-transitioning');
    window.setTimeout(startVideo, 150);
    window.setTimeout(() => stage.classList.remove('is-transitioning'), 300);
  });
})();
</script>

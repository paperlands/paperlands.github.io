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
    min-height: min(760px, 86vh);
    padding: clamp(3rem, 8vw, 6rem) 1.25rem;
    background: var(--gmff-ink);
    color: var(--gmff-paper);
  }
  .gmff-hero__frame {
    display: grid;
    grid-template-columns: minmax(0, .82fr) minmax(0, 1.18fr);
    align-items: center;
    gap: clamp(2rem, 6vw, 6rem);
    width: min(100%, 72rem);
  }
  .gmff-hero__copy { text-align: left; }
  .gmff-hero__eyebrow {
    margin: 0 0 1rem;
    color: var(--gmff-sun);
    font-family: 'Orbitron', sans-serif;
    font-size: 0.63rem;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }
  .gmff-hero__title {
    margin: 0 0 1rem;
    color: var(--gmff-paper);
    font-family: 'Orbitron', sans-serif;
    font-size: clamp(2rem, 4.8vw, 4.5rem);
    letter-spacing: -0.05em;
    line-height: 1.03;
  }
  .gmff-hero__deck {
    max-width: 28rem;
    margin: 0;
    color: #D8CCB8;
    font-family: 'Lora', serif;
    font-size: clamp(1rem, 1.5vw, 1.2rem);
    line-height: 1.6;
  }
  .gmff-hero__hint {
    display: flex;
    align-items: center;
    gap: .7rem;
    margin-top: 2rem;
    color: var(--gmff-sun);
    font: .68rem 'Share Tech Mono', monospace;
    letter-spacing: .13em;
    text-transform: uppercase;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: pointer;
    text-align: left;
  }
  .gmff-hero__hint::before { content: '▶'; display: inline-grid; flex: 0 0 auto; place-items: center; width: 2.125rem; height: 1.5rem; border-radius: .35rem; background: var(--gmff-sienna); color: var(--gmff-paper); font-size: .58rem; }
  .gmff-hero__hint:hover { color: var(--gmff-paper); }
  .gmff-hero__hint:hover::before { background: #9f3d1c; }
  .gmff-hero__stage {
    position: relative;
    aspect-ratio: 16 / 10;
    overflow: hidden;
    background: #17130F;
    border: 1px solid rgba(242, 166, 90, .45);
    border-left: clamp(0.45rem, 1.2vw, 0.75rem) solid var(--gmff-sienna);
    box-shadow: 18px 18px 0 rgba(200, 79, 35, .18);
  }
  .gmff-hero__poster-frame, .gmff-hero__video {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
  }
  .gmff-hero__poster-frame { z-index: 2; transition: opacity .35s ease, transform .5s ease; }
  .gmff-hero__poster {
    display: block; width: 100%; height: 100%;
    object-fit: cover; object-position: center;
    filter: saturate(.8);
  }
  .gmff-hero__poster-frame::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(16,16,14,.15), rgba(16,16,14,.58));
  }
  .gmff-hero__video { z-index: 1; border: 0; background: #000; opacity: 0; transition: opacity .45s ease; }
  .gmff-hero__play {
    position: absolute; z-index: 4; inset: 50% auto auto 50%;
    display: inline-grid; place-items: center;
    width: 68px; height: 48px; padding: 0; border: 0; border-radius: 12px;
    background: var(--gmff-sienna); color: #fff;
    font: 1.25rem/1 'Arial', sans-serif; letter-spacing: 0;
    text-transform: uppercase; transform: translate(-50%, -50%);
    cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.35);
    transition: background .2s ease, transform .2s ease;
  }
  .gmff-hero__play:hover { background: #9f3d1c; color: #fff; transform: translate(-50%, -50%) scale(1.04); }
  .gmff-hero__play:focus-visible { outline: 2px solid var(--gmff-sun); outline-offset: 4px; }
  .gmff-hero__wipe { position: absolute; z-index: 3; inset: 0; background: var(--gmff-sienna); pointer-events: none; transform: translateX(-101%); }
  .gmff-hero__stage.is-transitioning .gmff-hero__wipe { animation: gmff-stage-wipe 300ms ease-in-out both; }
  .gmff-hero__stage.is-playing .gmff-hero__poster-frame { opacity: 0; transform: scale(1.04); pointer-events: none; }
  .gmff-hero__stage.is-playing .gmff-hero__video { z-index: 5; opacity: 1; }
  .gmff-hero__stage.is-playing .gmff-hero__play { display: none; }
  @keyframes gmff-stage-wipe { 0% { transform: translateX(-101%); } 50% { transform: translateX(0); } 100% { transform: translateX(101%); } }
  @media (max-width: 720px) {
    .gmff-hero { min-height: auto; padding: 3.5rem 1rem 4rem; }
    .gmff-hero__frame { grid-template-columns: 1fr; gap: 2rem; }
    .gmff-hero__copy { text-align: center; }
    .gmff-hero__deck { margin-inline: auto; }
    .gmff-hero__hint { justify-content: center; }
    .gmff-hero__stage { aspect-ratio: 4 / 3; box-shadow: 10px 10px 0 rgba(200, 79, 35, .18); }
  }
  @media (prefers-reduced-motion: reduce) {
    .gmff-hero__stage.is-transitioning .gmff-hero__wipe { animation: none; }
    .gmff-hero *, .gmff-hero *::before, .gmff-hero *::after { transition-duration: 0.01ms !important; }
  }
</style>
 
<section class="gmff-hero" id="gmff-hero" aria-label="Gambian Mathematics Film Festival">
  <div class="gmff-hero__frame">
    <div class="gmff-hero__copy">
      <p class="gmff-hero__eyebrow">May 16 · 2026</p>
      <h1 class="gmff-hero__title">Gambian Mathematics Film Festival</h1>
      <p class="gmff-hero__deck">A celebration of young Gambian curiosity, creativity, and storytelling.</p>
      <button class="gmff-hero__hint" type="button" data-gmff-hero-play aria-label="Play the festival film">Watch the festival film</button>
    </div>
    <div class="gmff-hero__stage" data-gmff-hero-stage>
      <div class="gmff-hero__poster-frame">
        <img class="gmff-hero__poster" src="https://i.ytimg.com/vi/IT7jGh46MPc/maxresdefault.jpg" alt="Preview of the Gambian Mathematics Film Festival film" width="1280" height="720" />
      </div>
      <iframe
        class="gmff-hero__video"
        data-gmff-hero-video="https://www.youtube-nocookie.com/embed/IT7jGh46MPc?autoplay=1&rel=0"
        title="Gambian Mathematics Film Festival film"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin"
        allowfullscreen
      ></iframe>
      <div class="gmff-hero__wipe" aria-hidden="true"></div>
      <button class="gmff-hero__play" type="button" data-gmff-hero-play aria-label="Play the festival film">▶</button>
    </div>
  </div>
</section>

<div class="gmff-presenter inline-block">
  <span class="font-orbitron text-sm tracking-[0.3em] text-orange-400 opacity-60 uppercase block">
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
      player.autoplay = true;
      player.play().catch(() => {});
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
  const plays = document.querySelectorAll('[data-gmff-hero-play]');
  const video = stage?.querySelector('[data-gmff-hero-video]');
  if (!stage || !video || !plays.length) return;

  const startPlayback = () => {
    if (stage.classList.contains('is-playing') || stage.classList.contains('is-transitioning')) return;
    stage.classList.add('is-transitioning');
    window.setTimeout(() => {
      video.src = video.dataset.gmffHeroVideo;
      stage.classList.add('is-playing');
      stage.classList.remove('is-transitioning');
    }, 150);
  };

  plays.forEach((play) => play.addEventListener('click', startPlayback));
})();
</script>

---
layout: darkpage
title: Gambian Mathematics Film Festival
excerpt: Celebrating the young Gambian spirit of discovery and learning
image: /assets/lib/gmff.png
permalink: /gmff
---
<head>
<style>
  * { box-sizing: border-box; }
 
  body {
    background-color: #050505;
    color: #e5e5e5;
    font-family: 'Rajdhani', sans-serif;
    min-height: 100vh;
    overflow-x: hidden;
  }
 
  /* Perspective grid background */
  .grid-bg {
    position: fixed;
    inset: 0;
    z-index: -5;
    background-image:
      linear-gradient(rgba(249,115,22,0.12) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.12) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gridScroll 20s linear infinite;
    mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.3) 20%, rgba(0,0,0,0.6) 50%, transparent 100%);
  }
 
  .scanline {
    position: fixed;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(249,115,22,0.4), transparent);
    animation: scanline 6s linear infinite;
    z-index: -10;
    pointer-events: none;
  }
 
  /* CRT overlay noise */
  .noise-overlay {
    position: fixed;
    inset: 0;
    z-index: -10;
    pointer-events: none;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }
 
  /* Input styling */
  .field-input {
    width: 100%;
    background: rgba(10, 10, 10, 0.9);
    border: 1px solid rgba(249, 115, 22, 0.4);
    color: #f5f5f5;
    padding: 12px 16px;
    font-family: 'Share Tech Mono', monospace;
    font-size: 14px;
    letter-spacing: 0.05em;
    outline: none;
    transition: all 0.2s ease;
    position: relative;
  }
 
  .field-input:focus {
    border-color: #F97316;
    box-shadow: 0 0 16px rgba(249, 115, 22, 0.3), inset 0 0 8px rgba(249, 115, 22, 0.05);
    background: rgba(15, 8, 0, 0.95);
  }
 
  .field-input::placeholder {
    color: rgba(249, 115, 22, 0.3);
    font-family: 'Share Tech Mono', monospace;
  }
 
  .field-input:focus::placeholder {
    color: rgba(249, 115, 22, 0.5);
  }
 
  /* Select styling */
  .field-select {
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23F97316' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    cursor: pointer;
  }
 
  .field-select option {
    background-color: #0a0a0a;
    color: #f5f5f5;
  }
 
  /* Label */
  .field-label {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #F97316;
    text-transform: uppercase;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
 
  .field-label::before {
    content: '▸';
    font-size: 8px;
    opacity: 0.7;
  }
 
  /* Corner brackets decoration */
  .bracket-box {
    position: relative;
  }
  .bracket-box::before, .bracket-box::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: rgba(249, 115, 22, 0.5);
    border-style: solid;
  }
  .bracket-box::before {
    top: -1px; left: -1px;
    border-width: 2px 0 0 2px;
  }
  .bracket-box::after {
    bottom: -1px; right: -1px;
    border-width: 0 2px 2px 0;
  }
 
  /* Member card */
  .member-card {
    background: rgba(249, 115, 22, 0.03);
    border: 1px solid rgba(249, 115, 22, 0.2);
    border-left: 3px solid rgba(249, 115, 22, 0.6);
    padding: 16px;
    position: relative;
    transition: all 0.2s;
  }
  .member-card:hover {
    border-color: rgba(249, 115, 22, 0.5);
    background: rgba(249, 115, 22, 0.05);
  }
 
  /* Submit button */
  .submit-btn {
    background: #F97316;
    color: #000;
    font-family: 'Orbitron', monospace;
    font-weight: 900;
    font-size: 13px;
    letter-spacing: 0.2em;
    padding: 16px 48px;
    border: none;
    cursor: pointer;
    text-transform: uppercase;
    position: relative;
    transition: all 0.2s;
    clip-path: polygon(12px 0%, 100% 0%, calc(100% - 12px) 100%, 0% 100%);
  }
 
  .submit-btn::after {
    content: '';
    position: absolute;
    inset: 2px;
    background: rgba(0,0,0,0.2);
    clip-path: polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%);
    transition: opacity 0.2s;
    opacity: 0;
  }
 
  .submit-btn:hover {
    background: #ff9a3c;
    box-shadow: 0 0 30px rgba(249, 115, 22, 0.6);
    transform: translateY(-1px);
  }
 
  .submit-btn:active {
    transform: translateY(1px);
  }
 
  /* Add member button */
  .add-btn {
    border: 1px dashed rgba(249, 115, 22, 0.5);
    background: transparent;
    color: #F97316;
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.1em;
    padding: 10px 20px;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    text-transform: uppercase;
  }
  .add-btn:hover {
    border-color: #F97316;
    background: rgba(249, 115, 22, 0.08);
    box-shadow: 0 0 12px rgba(249, 115, 22, 0.2);
  }
 
  /* Remove button */
  .remove-btn {
    position: absolute;
    top: 10px; right: 10px;
    background: none;
    border: none;
    color: rgba(249, 115, 22, 0.4);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 4px;
    transition: color 0.15s;
    font-family: 'Share Tech Mono', monospace;
  }
  .remove-btn:hover {
    color: #F97316;
  }
 
  /* Divider line */
  .orange-line {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.7), transparent);
  }
 
  /* Archetype badge */
  .archetype-badge {
    border: 1px solid rgba(249, 115, 22, 0.35);
    background: rgba(249, 115, 22, 0.05);
    padding: 10px 14px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    transition: all 0.2s;
  }
  .archetype-badge:hover {
    border-color: rgba(249, 115, 22, 0.6);
    background: rgba(249, 115, 22, 0.09);
  }
 
  /* Glow text */
  .glow-text {
    text-shadow: 0 0 20px rgba(249, 115, 22, 0.8), 0 0 40px rgba(249, 115, 22, 0.4);
  }
 
  /* Success state */
  .form-success {
    display: none;
  }
 
  /* Number counter */
  .member-num {
    font-family: 'Orbitron', monospace;
    font-size: 10px;
    color: rgba(249, 115, 22, 0.5);
    font-weight: 700;
    letter-spacing: 0.1em;
  }
 
  /* Horizontal rule math decoration */
  .math-dec {
    font-family: 'Share Tech Mono', monospace;
    font-size: 11px;
    color: rgba(255, 115, 22, 0.75);
    letter-spacing: 0.05em;
    text-align: center;
    overflow: hidden;
    white-space: nowrap;
  }
</style>
</head>
<body class="animate-flicker">
 
<div class="grid-bg"></div>
<div class="scanline"></div>
<div class="noise-overlay"></div>
 
<div class="relative min-h-screen py-12 px-4">
  <div class="max-w-2xl mx-auto">
 
    <!-- Header -->
    <div class="text-center mb-10 pt-4">
      <div class="math-dec mb-3"></div>
      
      <style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');
 
  .gmff-hero {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 60px 24px 80px;
    background: #050505;
    overflow: hidden;
    font-family: 'Orbitron', monospace;
  }
 
  /* Perspective grid */
  .gmff-hero__grid {
    position: absolute;
    inset: 0;
    background-image:
      linear-gradient(rgba(249,115,22,0.10) 1px, transparent 1px),
      linear-gradient(90deg, rgba(249,115,22,0.10) 1px, transparent 1px);
    background-size: 40px 40px;
    animation: gmff-grid 20s linear infinite;
    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.5) 0%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,0,0,0.5) 0%, transparent 100%);
  }
 
  /* Outer glow halo */
  .gmff-hero__halo {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 50% at 50% 55%, rgba(249,115,22,0.07) 0%, transparent 70%);
    pointer-events: none;
  }
 
  /* Scanline */
  .gmff-hero__scan {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.35) 50%, transparent 100%);
    animation: gmff-scan 7s linear infinite;
    pointer-events: none;
  }
 
  /* Poster frame */
  .gmff-hero__frame {
    position: relative;
    z-index: 2;
    max-width: 420px;
    width: 100%;
  }
 
  /* Corner brackets */
  .gmff-hero__frame::before,
  .gmff-hero__frame::after {
    content: '';
    position: absolute;
    width: 28px;
    height: 28px;
    border-color: rgba(249,115,22,0.8);
    border-style: solid;
    z-index: 3;
    pointer-events: none;
  }
  .gmff-hero__frame::before {
    top: -6px; left: -6px;
    border-width: 2px 0 0 2px;
  }
  .gmff-hero__frame::after {
    bottom: -6px; right: -6px;
    border-width: 0 2px 2px 0;
  }
 
  /* Inner corner brackets (opposite corners) */
  .gmff-hero__bracket-tr,
  .gmff-hero__bracket-bl {
    position: absolute;
    width: 28px;
    height: 28px;
    border-color: rgba(249,115,22,0.8);
    border-style: solid;
    z-index: 3;
    pointer-events: none;
  }
  .gmff-hero__bracket-tr {
    top: -6px; right: -6px;
    border-width: 2px 2px 0 0;
  }
  .gmff-hero__bracket-bl {
    bottom: -6px; left: -6px;
    border-width: 0 0 2px 2px;
  }
 
  /* The poster image */
  .gmff-hero__poster {
    width: 100%;
    display: block;
    box-shadow:
      0 0 0 1px rgba(249,115,22,0.25),
      0 0 40px rgba(249,115,22,0.2),
      0 0 80px rgba(249,115,22,0.08);
    animation: gmff-float 6s ease-in-out infinite;
  }
 
  /* HUD data-strip across the bottom */
  .gmff-hero__hud {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 24px;
    padding: 10px 20px;
    border-top: 1px solid rgba(249,115,22,0.15);
    background: rgba(5,5,5,0.6);
    backdrop-filter: blur(4px);
  }
 
  .gmff-hero__hud-item {
    font-family: 'Share Tech Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.12em;
    color: rgba(249,115,22,0.5);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 4px;
  }
 
  .gmff-hero__hud-item span {
    color: rgba(249,115,22,0.85);
  }
 
  .gmff-hero__hud-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(249,115,22,0.4);
    animation: gmff-blink 1.5s steps(1) infinite;
  }
 
  @keyframes gmff-grid {
    0%   { background-position: 0 0; }
    100% { background-position: 0 40px; }
  }
 
  @keyframes gmff-scan {
    0%   { top: -2px; opacity: 0; }
    5%   { opacity: 1; }
    95%  { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
 
  @keyframes gmff-float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-8px); }
  }
 
  @keyframes gmff-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
</style>
 
<section class="gmff-hero" id="gmff-hero" aria-label="Gambian Mathematics Film Festival poster">
  <div class="gmff-hero__grid"></div>
  <div class="gmff-hero__halo"></div>
  <div class="gmff-hero__scan"></div>
 
  <div class="gmff-hero__frame">
    <!-- <div class="gmff-hero__bracket-tr"></div> -->
    <!-- <div class="gmff-hero__bracket-bl"></div> -->
    <img
      
      src="assets/lib/gmff.png"
      alt="The Gambian Mathematics Film Festival — May 15th"
    />
  </div>
 
  <div class="gmff-hero__hud">
    <div class="gmff-hero__hud-item">
    </div>
    <div class="gmff-hero__hud-item">⏲ <span>MAY 15TH</span></div>
    <div class="gmff-hero__hud-item">STATUS <span>JUDGING</span></div>
    <div class="gmff-hero__hud-item">
      <div class="gmff-hero__hud-dot"></div>
      UTG Law Faculty, Kanifing
    </div>
  </div>
</section>

<div class="inline-block mt-6 mb-2">
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
    We felt this overpowering spirit as your questions, ideas and mathematics itself came <span class="text-orange-400"> alive </span> in your films.
  </p>
  <p>Now others will too.</p>
  <p>See you at the festival!</p>
</div>

<div class="text-center my-8 font-mono text-xs text-orange-500 opacity-50">
  FESTIVAL ON <b>MAY 15TH 9AM</b>
</div> 
    <!-- <\!-- Criteria badges -\-> -->
    <!-- <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-10"> -->
    <!--   <div class="archetype-badge"> -->
    <!--     <span class="text-orange-400 text-lg mt-0.5 shrink-0">✦</span> -->
    <!--     <div> -->
    <!--       <div class="font-orbitron text-[10px] text-orange-400 font-bold tracking-wider uppercase mb-1">Mathematical Creativity</div> -->
    <!--       <div class="font-rajdhani text-xs text-gray-400 leading-snug">Mathematical originality &amp; novel ways of thinking</div> -->
    <!--     </div> -->
    <!--   </div> -->
    <!--   <div class="archetype-badge"> -->
    <!--     <span class="text-orange-400 text-lg mt-0.5 shrink-0">◈</span> -->
    <!--     <div> -->
    <!--       <div class="font-orbitron text-[10px] text-orange-400 font-bold tracking-wider uppercase mb-1">Storytelling</div> -->
    <!--       <div class="font-rajdhani text-xs text-gray-400 leading-snug">Relatable narrative that invites the viewer in</div> -->
    <!--     </div> -->
    <!--   </div> -->
    <!--   <div class="archetype-badge"> -->
    <!--     <span class="text-orange-400 text-lg mt-0.5 shrink-0">◉</span> -->
    <!--     <div> -->
    <!--       <div class="font-orbitron text-[10px] text-orange-400 font-bold tracking-wider uppercase mb-1">Production</div> -->
    <!--       <div class="font-rajdhani text-xs text-gray-400 leading-snug">Visual quality that honours the work within</div> -->
    <!--     </div> -->
    <!--   </div> -->
    <!-- </div> -->
 
    <div class="orange-line mb-10"></div>
 
    
        <!-- FORM -->
    <form id="gmff-film-submission" accept-charset="UTF-8" action="https://book.paperland.sg/proxy/apps/guru/film" method="POST" onsubmit="return validateForm(event)">
      <div class="math-dec mb-8">— FILM SUBMISSION CLOSED —</div>
 
    <!--   <\!-- Film Title -\-> -->
    <!--   <div class="mb-7"> -->
    <!--     <label class="field-label" for="film-title-input">Film Title</label> -->
    <!--     <div class="bracket-box"> -->
    <!--       <input -->
    <!--         class="field-input" -->
    <!--         type="text" -->
    <!--         id="film-title-input" -->
    <!--         name="film_title" -->
    <!--         placeholder="Enter the title of your film..." -->
    <!--         required -->
    <!--       /> -->
    <!--     </div> -->
    <!--   </div> -->
 
    <!--   <\!-- School -\-> -->
    <!--   <div class="mb-7"> -->
    <!--     <label class="field-label" for="school-input">School</label> -->
    <!--     <div class="bracket-box"> -->
    <!--       <input -->
    <!--         class="field-input" -->
    <!--         type="text" -->
    <!--         id="school-input" -->
    <!--         name="school" -->
    <!--         placeholder="Name of your school or institution..." -->
    <!--         required -->
    <!--       /> -->
    <!--     </div> -->
    <!--   </div> -->
 
    <!--   <\!-- Film Link -\-> -->
    <!--   <div class="mb-10"> -->
    <!--     <label class="field-label" for="film-link-input">Film Link</label> -->
    <!--     <div class="bracket-box"> -->
    <!--       <input -->
    <!--         class="field-input" -->
    <!--         pattern="(?:(?:https?:\/\/)?|(?:www\.))[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,4}\b(?:[-a-zA-Z0-9@:%_\+.~#?&/=]*)" -->
    <!--         id="film-link-input" -->
    <!--         name="film_link" -->
    <!--         placeholder="youtube.com/watch?v=... or www.tiktok.com/@/..." -->
    <!--         required -->
    <!--       /> -->
    <!--     </div> -->
    <!--     <p class="font-mono text-xs text-orange-500 opacity-40 mt-2 ml-1"> -->
    <!--       ↳ YouTube, TikTok, Instagram, or any PUBLIC video link -->
    <!--     </p> -->
    <!--   </div> -->
 
    <!--   <div class="orange-line mb-8"></div> -->
 
    <!--   <\!-- Team Members Section -\-> -->
    <!--   <div class="mb-8"> -->
    <!--     <div class="flex items-center justify-between mb-5"> -->
    <!--       <div> -->
    <!--         <h2 class="font-orbitron font-bold text-sm tracking-widest text-orange-400 uppercase">Team Members</h2> -->
    <!--         <p class="font-rajdhani text-xs text-gray-500 mt-1 tracking-wide">Add every student involved in creating this film</p> -->
    <!--       </div> -->
    <!--       <div class="font-mono text-xs text-orange-500 opacity-40" id="memberCount">01 MEMBER</div> -->
    <!--     </div> -->
 
    <!--     <div id="membersList" class="space-y-3"> -->
    <!--       <\!-- Initial member added by JS -\-> -->
    <!--     </div> -->
 
    <!--     <button type="button" class="add-btn mt-4" onclick="addMember()"> -->
    <!--       + ADD TEAM MEMBER -->
    <!--     </button> -->
    <!--   </div> -->
 
    <!--   <\!-- Hidden fields -\-> -->
    <!--   <input type="hidden" name="return_url" value="" id="return-url-input" /> -->
 
    <!--   <\!-- Cloudflare Turnstile -\-> -->
    <!--   <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script> -->
    <!--   <div class="flex justify-center my-6"> -->
    <!--     <div class="cf-turnstile" data-sitekey="0x4AAAAAACugliz5rFIg0aRA" data-theme="dark"></div> -->
    <!--   </div> -->
 
 
  <div class="orange-line mb-10"></div>
 
    <!--   <\!-- Submit -\-> -->
    <!--   <div class="flex flex-col items-center gap-4"> -->
    <!--     <div class="math-dec text-xs w-full">∑ ( creatives × storytellers × producers ) ⊃ ∞</div> -->
 
    <!--     <button type="submit" class="submit-btn mt-2"> -->
    <!--       SUBMIT FILM ▸▸ -->
    <!--     </button> -->
 
    <!--     <p class="font-mono text-xs text-gray-600 text-center mt-2"> -->
    <!--       BY SUBMITTING YOU CONFIRM THIS IS ORIGINAL STUDENT WORK -->
    <!--     </p> -->
    <!--   </div> -->
    <!-- </form> -->
 
    <!-- <\!-- Success Message -\-> -->
    <!-- <div class="form-success" id="successMessage"> -->
    <!--   <div class="text-center py-16 px-8"> -->
    <!--     <div class="font-orbitron font-black text-5xl text-orange-400 glow-text mb-6">✓</div> -->
    <!--     <h2 class="font-orbitron font-bold text-xl text-white tracking-widest mb-4">SUBMISSION RECEIVED</h2> -->
    <!--     <div class="orange-line my-5"></div> -->
    <!--     <p class="font-rajdhani text-gray-400 text-base leading-relaxed mb-6"> -->
    <!--       Thank you for submitting to the Gambian Mathematics Film Festival.<br> -->
    <!--       Your film will be reviewed in the spirit of discovery. -->
    <!--     </p> -->
    <!--     <div class="font-mono text-xs text-orange-500 opacity-50">MAY 16TH · YOUNG MATHEMATICIAN ASSOCIATION</div> -->
    <!--   </div> -->
    <!-- </div> -->
 
    <!-- Footer -->
    <div class="text-center  mt-16 pb-8">
      <div class="math-dec text-xs">crafted with reverence for fellowship.</div>
    </div>
 
<!--   </div> -->
<!-- </div> -->
 
 <!-- Toast: success -->
<div class="fixed z-50 hidden bottom-6 right-6" id="toast-good">
  <div style="background:rgba(5,5,5,0.97);border:1px solid rgba(249,115,22,0.7);box-shadow:0 0 24px rgba(249,115,22,0.25);" class="flex items-center gap-3 px-5 py-4 font-mono text-sm text-orange-400">
    <span style="font-size:18px;">✓</span>
    <span>Film submitted — <span class="text-white">see you at the Festival!</span></span>
    <button class="ml-4 text-orange-600 hover:text-orange-400 focus:outline-none" onclick="document.getElementById('toast-good').style.display='none'">✕</button>
  </div>
</div>
 
<!-- Toast: error -->
<div class="fixed z-50 hidden bottom-6 right-6" id="toast-bad">
  <div style="background:rgba(5,5,5,0.97);border:1px solid rgba(239,68,68,0.6);box-shadow:0 0 24px rgba(239,68,68,0.2);" class="flex items-center gap-3 px-5 py-4 font-mono text-sm text-red-400">
    <span style="font-size:18px;">✗</span>
    <span>Submission failed — <span class="text-white">please try again.</span></span>
    <button class="ml-4 text-red-600 hover:text-red-400 focus:outline-none" onclick="document.getElementById('toast-bad').style.display='none'">✕</button>
  </div>
</div>
 
<script>
let memberCount = 0;
 
const gradeOptions = [
  { value: '', label: 'Select grade...' },
  { value: 'grade10', label: 'Grade 10' },
  { value: 'grade11', label: 'Grade 11' },
  { value: 'grade12', label: 'Grade 12' },
];
 
function updateMemberCount() {
  const count = document.querySelectorAll('.member-card').length;
  const el = document.getElementById('memberCount');
  el.textContent = count.toString().padStart(2, '0') + (count === 1 ? ' MEMBER' : ' MEMBERS');
}
 
function addMember(animate = true) {
  memberCount++;
  const id = memberCount;
  const list = document.getElementById('membersList');
 
  const card = document.createElement('div');
  card.className = 'member-card';
  card.id = `member-${id}`;
  if (animate) card.style.opacity = '0';
 
  const gradeOpts = gradeOptions.map(o =>
    `<option value="${o.value}">${o.label}</option>`
  ).join('');
 
  card.innerHTML = `
    <button type="button" class="remove-btn" onclick="removeMember(${id})" aria-label="Remove member">✕</button>
    <div class="member-num mb-3">MEMBER ${String(id).padStart(2, '0')}</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label class="field-label" for="member-name-${id}">Full Name</label>
        <input
          class="field-input"
          type="text"
          id="member-name-${id}"
          name="member_name[]"
          placeholder="Student name..."
          required
        />
      </div>
      <div>
        <label class="field-label" for="member-grade-${id}">Grade Level</label>
        <select
          class="field-input field-select"
          id="member-grade-${id}"
          name="member_grade[]"
          required
        >
          ${gradeOpts}
        </select>
      </div>
    </div>
  `;
 
  list.appendChild(card);
 
  if (animate) {
    setTimeout(() => {
      card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      card.style.transform = 'translateY(8px)';
      card.style.opacity = '0';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        });
      });
    }, 10);
  }
 
  updateMemberCount();
}
 
function removeMember(id) {
  const cards = document.querySelectorAll('.member-card');
  if (cards.length <= 1) return; // keep at least 1
 
  const card = document.getElementById(`member-${id}`);
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(-8px)';
    setTimeout(() => {
      card.remove();
      updateMemberCount();
    }, 200);
  }
}
 
function validateForm(e) {
  const form = document.getElementById('gmff-film-submission');
  const inputs = form.querySelectorAll('[required]');
  let valid = true;
  inputs.forEach(input => {
    if (!input.value.trim()) {
      input.style.borderColor = 'rgba(239,68,68,0.8)';
      input.style.boxShadow = '0 0 10px rgba(239,68,68,0.3)';
      valid = false;
      setTimeout(() => {
        input.style.borderColor = 'rgba(249,115,22,0.4)';
        input.style.boxShadow = '';
      }, 2000);
    }
  });
  return valid; // allow native POST if valid
}
 
// Set return_url to current page
document.getElementById('return-url-input').value = window.location.href.split('?')[0];
 
// Show toast based on ?sent= param (set by server redirect)
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('sent') === 'true') {
  document.getElementById('toast-good').style.display = 'block';
} else if (urlParams.get('sent') === 'false') {
  document.getElementById('toast-bad').style.display = 'block';
}
 
// Init with one member
addMember(false);
</script>

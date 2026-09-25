---
layout: folio
title: Helios Dojo
permalink: /helios-dojo
nav: folio
nav_tone: dark
description: A standalone canvas for the helix commands. The landing is unchanged.
---

<style>
  .helios-dojo {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(16rem, 28rem);
    gap: 1.25rem;
    min-height: 100svh;
    padding: 5.5rem 1.4rem 2rem;
    background: #140806;
    color: #f6e6c4;
  }
  .helios-dojo__stage {
    position: relative;
    min-height: 70svh;
    border: 1px solid rgb(246 230 196 / 0.16);
  }
  .helios-dojo__stage canvas,
  .helios-dojo__stage video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    background: transparent;
  }
  .helios-dojo__stage video {
    object-fit: contain;
    mix-blend-mode: screen;
  }
  .helios-dojo__side {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    min-width: 0;
  }
  .helios-dojo__side p {
    margin: 0;
    font-family: "Cormorant Garamond", Georgia, serif;
    font-style: italic;
    font-size: 1.05rem;
    line-height: 1.35;
  }
  .helios-dojo__status {
    font-family: Cinzel, serif;
    font-size: 0.62rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #ff9933;
  }
  .helios-dojo textarea {
    flex: 1 1 auto;
    min-height: 24rem;
    width: 100%;
    resize: vertical;
    border: 1px solid rgb(246 230 196 / 0.2);
    background: rgb(20 8 6 / 0.4);
    color: #f6e6c4;
    font: 0.78rem/1.45 ui-monospace, monospace;
    padding: 0.8rem;
  }
  @media (max-width: 800px) {
    .helios-dojo { grid-template-columns: 1fr; }
    .helios-dojo__stage { min-height: 52svh; }
  }
</style>

<section class="helios-dojo" data-helios-dojo>
  <div class="helios-dojo__stage">
    <video data-helios-dojo-film hidden muted playsinline loop
      poster="/assets/lib/helios/see-helix-ccddfd.webp"
      src="/assets/lib/helios/see-helix-f4a342.mp4"></video>
    <canvas data-helios-dojo-canvas aria-label="Helix drawn from the commands"></canvas>
  </div>
  <div class="helios-dojo__side">
    <p>The landing is unchanged. Edit the commands. If the draw fails, the film returns.</p>
    <p class="helios-dojo__status" data-helios-dojo-status>waiting</p>
    <textarea data-helios-dojo-program spellcheck="false">#dnahelix
def helix r d do
  fn angle 180
  rt 90
  jmp r
  rt -90
  as helix do
    loop 180 do
      rt -angle/2
      fw 2*r*sin[angle/2]
      jmp -2*r*sin[angle/2]
      rt angle/2
      fn x 7
      loop x do
        jmp 2*pi*r/360
        rt -1
      end
      dive 90
      fw d
      dive -90
      wait 0.1
    end
  end
  rt -90
  jmp r
  rt 90
end
dive -90
roll 45
wait 2
hd
helix 100 15
</textarea>
  </div>
</section>

<script type="module" src="{{ '/assets/js/home/helios-dojo.js' | relative_url }}"></script>

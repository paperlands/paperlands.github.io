---
layout: page
title: Install PaperLAN Locally 
excerpt: We believe that the world would be a better place if the processes we shape illuminates and uplifts the spirit of fellowship and belonging. 
image: /assets/lib/beauty_first.png
id: lan
permalink: /lan
version: 0.4.1
---
<body class="min-h-screen overflow-x-hidden font-mono bg-bg text-txt">
 
<div class="relative z-10 max-w-xl px-6 py-20 mx-auto">
 
  <!-- Header -->
  <header class="mb-16 text-center animate-fade-up">
    <h1 class="mb-4 text-4xl font-bold tracking-wide text-center font-paperlang sm:text-5xl text-txt">
      Install <span class="text-primary ">PaperLan </span> 
    </h1>
    <div class="w-16 h-px mx-auto bg-gradient-to-r from-transparent via-primary to-transparent"></div>
  </header>
 
  <!-- OS Selector -->
  <div class="mb-16 animate-fade-up-1">
    <p class="text-center text-[10px] tracking-[0.25em] uppercase text-stone-warm mb-7">
      Choose your platform
    </p>
    <div class="flex justify-center gap-3" id="os-buttons">
 
      <div  class="os-btn group flex-1 max-w-[170px] flex flex-col items-center
            border border-sage/40 rounded-lg px-3 pt-5
            transition-all duration-300 ease-out
            has-[a:hover]:border-primary has-[a:hover]:-translate-y-0.5
            has-[a:hover]:shadow-[0_4px_24px_rgba(255,153,51,0.08)]">

  <div class="flex items-center justify-center flex-1 w-full">
    <a href="https://github.com/paperlands/dojo/releases/latest/download/PaperLandDojo-{{ page.version }}-windows-x86-setup.exe"
       download="PaperLand_Windows_v{{ page.version }}_x86.exe"
       data-os="windows" onclick="pick('windows')"
       class="flex flex-col items-center py-2 group/half">
      <pre class="os-icon text-[9px] leading-[1.15] text-stone-warm font-mono whitespace-pre group-hover/half:text-primary-dark transition-colors duration-300">
⠀⠀⠀⣤⣴⣾⣿⣿⣿⣿⣿⣶
⠀⠀⢀⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⡏
⠀⠀⣼⣿⡿⠿⠛⠻⠿⣿⣿⡇
⠀⠀⠉⠀⠀⠀⢀⠀⠀⠀⠈⠁
⠀⠀⣠⣴⣶⣿⣿⣿⣷⣶⣤⠀
⠀⢸⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀
⠀⣾⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀
⠀⣿⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀
⢠⣿⡿⠿⠛⠉⠉⠉⠛⠿⠀⠀
⠘⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀</pre>
      <span class="mt-1 text-[8px] tracking-[0.13em] text-center font-mono text-sage/60
                   group-hover/half:text-primary
                   transition-colors duration-300">x86<br>(32bit)</span>
    </a>
    <a href="https://github.com/paperlands/dojo/releases/latest/download/PaperLandDojo-{{ page.version }}-windows-x86_64-setup.exe"
       download="PaperLand_Windows_v{{ page.version }}_x86_64.exe"
       data-os="windows" onclick="pick('windows')"
       class="flex flex-col items-center py-2 group/half">
      <pre class="os-icon text-[9px] leading-[1.15] text-stone-warm font-mono whitespace-pre group-hover/half:text-primary-dark transition-colors duration-300">⡄⠀⠀⠀⠀⠀⠀⠀⠀⠀⣠⡄
⠀⠀⢰⣦⣄⣀⣀⣠⣴⣾⣿⠃
⠀⠀⣼⣿⣿⣿⣿⣿⣿⣿⣿⠀
⠀⠀⣿⣿⣿⣿⣿⣿⣿⣿⡿⠀
⠀⢰⣿⣿⣿⣿⣿⣿⣿⣿⠇⠀
⠀⠀⠈⠉⠛⠛⠛⠉⠉⠀⠀⠀
⠀⣶⣦⣄⣀⣀⣀⣤⣤⣶⠀⠀
⢀⣿⣿⣿⣿⣿⣿⣿⣿⡟⠀⠀
⢸⣿⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀
⢸⣿⣿⣿⣿⣿⣿⣿⣿⠁⠀⠀
⠻⢿⣿⣿⣿⣿⣿⠿⠛⠀⠀⠀</pre>
      <span class="mt-1 text-[8px] tracking-[0.13em] text-center font-mono text-sage/60
                   group-hover/half:text-primary
                   transition-colors duration-300">x64<br>(64bit)</span>
    </a>

  </div>

  <span class="text-[11px] tracking-[0.12em] os-label uppercase pb-4 text-sage">Windows</span>
</div>
      <div  class="os-btn group flex-1 max-w-[170px] flex flex-col items-center
            border border-sage/40 rounded-lg px-3 pt-5
            transition-all duration-300 ease-out
            has-[a:hover]:border-primary has-[a:hover]:-translate-y-0.5
            has-[a:hover]:shadow-[0_4px_24px_rgba(255,153,51,0.08)]">

  <div class="flex items-center justify-center flex-1 w-full">
    <a href="https://github.com/paperlands/dojo/releases/latest/download/PaperLandDojo-{{ page.version }}-macos-x86_64.dmg"
       download="PaperLand_MacOS_v{{ page.version }}_x86_64.dmg"
       data-os="macos" onclick="pick('macos')"
       class="flex flex-col items-center py-2 group/half">
      <pre class="os-icon text-[9px] leading-[1.15] text-stone-warm font-mono whitespace-pre group-hover/half:text-primary-dark transition-colors duration-300">⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀
⠀⠀⠀⢀⣠⣤⣤⣤⣀⣀⠈
⠀⢠⣶⣿⣿⣿⣿⣿⣿⣿⣿
⣠⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠹⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠻⣿⣿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⠙⢿⣿⣿⣿⣿⣿⣿⣿
⠀⠀⠀⠈⠙⢿⣿⣿⣿⠿⠟</pre>
      <span class="mt-1 text-[8px] tracking-[0.13em] text-center font-mono text-sage/60
                   group-hover/half:text-primary
                   transition-colors duration-300">x86</span>
    </a>
    <a href="https://github.com/paperlands/dojo/releases/latest/download/PaperLandDojo-{{ page.version }}-macos-arm64.dmg"
       download="PaperLand_MacOS_v{{ page.version }}_arm64.dmg"
       data-os="macos" onclick="pick('macos')"
       class="flex flex-col items-center py-2 group/half">
      <pre class="os-icon text-[9px] leading-[1.15] text-stone-warm font-mono whitespace-pre group-hover/half:text-primary-dark transition-colors duration-300">⠀⠀⠀⣀⣀⠀⠀⠀⠀⠀⠀
⢀⣴⣿⣿⡿⠀⠀⠀⠀⠀⠀
⣾⣿⣿⠟⠁⠀⠀⠀⠀⠀⠀
⠋⠉⣁⣠⣤⣤⣤⣀⡀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⣦⡀
⣿⣿⣿⣿⣿⣿⣿⣿⠟⠋⠀
⣿⣿⣿⣿⣿⣿⣿⡏⠀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣧⠀⠀⠀
⣿⣿⣿⣿⣿⣿⣿⣿⣷⣤⣀
⣿⣿⣿⣿⣿⣿⣿⣿⣿⡿⠁
⣿⣿⣿⣿⣿⣿⣿⣿⡟⠁⠀
⠛⠻⠿⣿⣿⣿⡿⠋</pre>
      <span class="mt-1 text-[8px] tracking-[0.13em] uppercase font-mono text-sage/60
                   group-hover/half:text-primary
                   transition-colors duration-300">arm</span>
    </a>

  </div>

  <span class="text-[11px] tracking-[0.12em] os-label uppercase pb-4 text-sage">macOS</span>
</div>
      <a href="https://github.com/paperlands/dojo/releases/latest/download/dojo-{{ page.version }}-linux-x86_64" download="PaperLand_Linux_v{{ page.version }}_x86_64" data-os="linux" onclick="pick('linux')"
        class="os-btn group flex-1 max-w-[170px] flex flex-col items-center
               border border-sage/40 rounded-lg px-3 pt-5
               transition-all duration-300 ease-out
               hover:border-primary hover:-translate-y-0.5 hover:shadow-[0_4px_24px_rgba(255,153,51,0.08)]
               cursor-pointer bg-transparent">
        <div class="flex items-center justify-center flex-1">
        <pre class="os-icon text-[9px] leading-[1.04] text-stone-warm transition-colors duration-300
                    group-hover:text-primary-dark whitespace-pre font-mono">
          d888b
        d888888b.
        8P"YP"Y88
        8|o||o|88
        8'    .88
        8`._.' Y8.
      d/      `8b.
      dP   .    Y8b.
    d8:'  "  `::88b
    d8"         'Y88b
  :8P    '      :888
    8a.   :     _a88P
  ._/"Yaa_:   .| 88P|
  \    YP"    `| 8P  `.
  /     \.___.d|    .'
  `--..__)8888P`._.' 
</pre>
        </div>
        <span class="os-label text-[11px] tracking-[0.12em] uppercase pb-4 text-sage transition-colors duration-300">Linux</span>
      </a>
 
    </div>
  </div>
 
  <!-- Requirements -->
  <section class="mb-16 animate-fade-up-2">
    <div class="relative p-8 border rounded-lg border-primary/20">
      <span class="absolute -top-2.5 left-6 bg-bg px-3 text-[10px] tracking-[0.25em] uppercase text-primary-dark">
        System Requirements
      </span>
      <div class="grid gap-5 text-sm sm:grid-cols-2">
        <div class="flex items-start gap-3">
          <span class="text-primary/50 mt-0.5 text-[10px]">►</span>
          <div>
            <div class="text-txt-light">Local Network</div>
            <div class="text-sage text-xs mt-0.5">mobile hotspot, wired ethernet or wifi router</div>
          </div>
        </div>
        <div class="flex items-start gap-3">
          <span class="text-primary/50 mt-0.5 text-[10px]">►</span>
          <div>
            <div class="text-txt-light">Friends Nearby</div>
            <div class="text-sage text-xs mt-0.5">the only true requirement</div>
          </div>
        </div>
      </div>
    </div>
  </section>
 
  <!-- Footer -->
  <footer class="pt-8 text-center border-t border-primary/10 animate-fade-up-3">
    <div class="text-sm tracking-widest font-paperlang text-primary">PaperLan</div>
    <div class="text-[10px] text-sage mt-1">crafted with reverence for fellowship</div>
    <div class="flex justify-center gap-2 mt-4">
      <span class="w-[3px] h-[3px] rounded-full bg-primary/30"></span>
      <span class="w-[3px] h-[3px] rounded-full bg-primary/20"></span>
      <span class="w-[3px] h-[3px] rounded-full bg-primary/10"></span>
    </div>
    <pre class="text-[10px] leading-tight text-primary    mt-8 select-none font-mono">    ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⢔⣶⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡼⠗⡿⣾⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡼⠓⡞⢩⣯⡀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀⠰⡹⠁⢰⠃⣩⣿⡇⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢷⣿⠿⣉⣩⠛⠲⢶⡠⢄⠐⣣⠃⣰⠗⠋⢀⣯⠁⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣯⣠⠬⠦⢤⣀⠈⠓⢽⣾⢔⣡⡴⠞⠻⠙⢳⡄
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣵⣳⠖⠉⠉⢉⣩⣵⣿⣿⣒⢤⣴⠤⠽⣬⡇
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⢻⣟⠟⠋⢡⡎⢿⢿⠳⡕⢤⡉⡷⡽⠁
⣧⢮⢭⠛⢲⣦⣀⠀⠀⠀⠠⡀⠀⠀⠀⡾⣥⣏⣖⡟⠸⢺⠀⠀⠈⠙⠋⠁⠀⠀
⠈⠻⣶⡛⠲⣄⠀⠙⠢⣀⠀⢇⠀⠀⠀⠘⠿⣯⣮⢦⠶⠃⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢻⣿⣥⡬⠽⠶⠤⣌⣣⣼⡔⠊⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢠⣿⣧⣤⡴⢤⡴⣶⣿⣟⢯⡙⠒⠤⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠘⣗⣞⣢⡟⢋⢜⣿⠛⡿⡄⢻⡮⣄⠈⠳⢦⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠈⠻⠮⠴⠵⢋⣇⡇⣷⢳⡀⢱⡈⢋⠛⣄⣹⣲⡀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣱⡇⣦⢾⣾⠿⠟⠿⠷⠷⣻⠧⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠻⠽⠞⠊⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀</pre>
  </footer>
 
</div>
 
<script>
  function pick(os) {
    document.querySelectorAll('.os-btn').forEach(b => {
      b.className = b.className
        .replace(/border-primary\b/g, 'border-sage/40')
        .replace(/bg-primary-light/g, 'bg-transparent')
        .replace(/shadow-\[0_0_0_1px[^\]]*\]/g, '')
        .replace(/shadow-\[0_4px_24px_rgba\(255,153,51,0\.1\)\]/g, '');
      b.querySelector('.os-icon').classList.remove('text-primary-dark');
      b.querySelector('.os-icon').classList.add('text-stone-warm');
      b.querySelector('.os-label').classList.remove('text-txt');
      b.querySelector('.os-label').classList.add('text-sage');
    });
    const el = document.querySelector(`[data-os="${os}"]`);
    el.classList.remove('border-sage/40', 'bg-transparent');
    el.classList.add('border-primary', 'bg-primary-light',
      'shadow-[0_0_0_1px_rgba(255,153,51,0.4)]',
      'shadow-[0_4px_24px_rgba(255,153,51,0.1)]');
    el.querySelector('.os-icon').classList.remove('text-stone-warm');
    el.querySelector('.os-icon').classList.add('text-primary-dark');
    el.querySelector('.os-label').classList.remove('text-sage');
    el.querySelector('.os-label').classList.add('text-txt');
  }
 
  // Auto-detect OS
  const ua = navigator.userAgent.toLowerCase();
  pick(ua.includes('win') ? 'windows' : ua.includes('mac') ? 'macos' : 'linux');
</script>
 
</body>



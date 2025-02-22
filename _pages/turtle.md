---
title: Turtle
id: turtle
layout: canvas
permalink: /turtle
---
<!-- ! This page has been redirected to /dojo -->

<!-- Canvas background -->
<canvas phx-update="ignore" id="canvas" class="fixed w-full h-full animate-fade transition duration-200 bg-inherit"></canvas>
<div id="runenv"  class="relative max-h-screen overflow-hidden">


    <div id="runenv" class="my-12 cursor-text pointer-events-auto">

      <textarea class="bg-transparent" id="editor" phx-hook="Shell"></textarea>
    </div>

<div
id="output"
class="fixed bottom-0 overflow-y-auto font-mono border-none text-orange-700 left-2"
>
</div>

<svg class="animate-fadeout fixed top-20 overflow-y-auto font-mono border-none text-orange-700 right-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" height="200"  > 
<image xlink:href="/assets/logo.svg" width="25" height="25"/>
</svg>

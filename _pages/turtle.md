---
title: Turtle
id: turtle
layout: canvas
onlytailwind: true
permalink: /turtle
---
<!-- ! This page has been redirected to /dojo -->
<canvas id="canvas" class="fixed w-full h-full animate-fade transition duration-200 bg-inherit"></canvas>
<div id="runenv" class="fixed top-20 w-5/12 h-screen ">
   
    <textarea 
      class="bg-transparent resize-none overflow-y-auto text-wrap no-scrollbar" 
      id="editor" 
      phx-hook="Shell"
    ></textarea>
  

  <div
    id="output"
    class="fixed bottom-0 left-2 w-[20vh] max-h-[50vh] overflow-y-auto font-mono border-none text-orange-700"
  >
  </div>
  

  <svg 
    class="animate-fadeout fixed top-20 overflow-y-auto font-mono border-none text-orange-700 right-2" 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 50 50" 
    height="200"
  > 
    <image xlink:href="/assets/logo.svg" width="25" height="25"/>
  </svg>
</div>

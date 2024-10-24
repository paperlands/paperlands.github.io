---
layout: page
title: Turtle
id: turtle
permalink: /turtle
---
<!-- ! This page has been redirected to /dojo -->

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50" height="200" style="float: right; " > 
<image xlink:href="/assets/logo.svg" width="50" height="50"/>
</svg>

# Welcome to Paperland! 

<h1> *We design new patterns of learning* </h1>

Find us [on GitHub](https://github.com/paperlands) or [on ⛩️ Dojo](https://thedojo.fly.dev/shell).

<strong>Past Writings </strong>

<ul>
  {% assign recent_notes = site.notes | sort: "last_modified_at_timestamp" | reverse %}
  {% for note in recent_notes limit: 5 %}
    <li>
      {{ note.last_modified_at | date: "%Y-%m-%d" }} — <a class="internal-link" href="{{ site.baseurl }}{{ note.url }}">{{ note.title }}</a>
    </li>
  {% endfor %}
</ul>


<div id="runenv">
    <textarea id="editor"></textarea>
    <!-- <button id="runButton" onclick="runCode()" >Go</button> -->
    </div>
  <canvas id="canvas"></canvas>
  <div id="output"></div>
    
<style>

#canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: inherit;
    z-index: -1;
    animation: fadeIn 1s ease-in-out;
}



@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

#runenv {
    z-index: 0;
}

#editor {
    border: 1px solid black;
    color: white;
    font-family: monospace;
    background-color: rgba(255, 255, 255, 0.1);
    z-index: 1;
    
}

#output {
    width: 400px;
    height: 100px;
    border: 1px solid;
    margin: 10px;
    right: 0;
    overflow-y: auto;
}

@media (min-width: 1024px) {
    #runenv, #editor {
        width: 30%;  /* Responsive width for large screens */
        height: 80%; /* Responsive height for large screens */
        position: fixed;
        align-items: right; 
        right: 0;
        top: 30%;
        bottom: 0; /* Ensures it stretches from top to bottom */
        overflow-y: auto; /* Handles overflow if content exceeds height */
    }
}

@media (max-width: 1024px) {
    #runenv, #editor {
        width: 90%;  /* Full width for small screens */
        height: 30%;  /* Adjusted height for bottom drawer */
        position: fixed;
        align-items: center; 
        bottom: 0;    /* Positioned at the bottom */
        overflow-y: auto; /* Handles overflow if content exceeds height */
    }
}


#editor:hover, #editor:focus {
    border-color: #00f;
    transition: border-color 0.3s ease-in-out;
}

</style>

<script src="shell/codemirror.js"></script>
<link rel="stylesheet" href="shell/codemirror.css">
<link rel="stylesheet" href="shell/theme/abbott.css">
<script src="shell/mode/apl/apl.js"></script>
<script src="turtle.js"></script>

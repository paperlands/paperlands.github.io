---
layout: page
title: Home
id: home
permalink: /
---

# Good morning! 🌅

  Welcome to Paperlands! <span style="font-weight: bold">[[Your first note]]</span> to get started on your exploration.

Find us [on GitHub here](https://github.com/ve1ld/vyasa).

<strong>Past Writings</strong>

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
body {
    margin: 0;
    overflow: hidden;
}

#canvas.night-mode{
   background-color: white;
}

#canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: inherit;
    z-index: -1;
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
    border: 1px solid black;
    margin: 10px;
    right: 0;
    overflow-y: auto;
}

@media (min-width: 1024px) {
    #runenv, #editor {
        width: 400px;
        height: 400px;
        margin: 10px;
        position: fixed;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
    }
}

@media (max-width: 1024px) {
    #runenv, #editor {
        width: 100%;
        height: 200px;
        position: fixed;
        bottom: 0;
    }
}

#editor:hover, #editor:focus {
    border-color: #00f;
    transition: border-color 0.3s ease-in-out;
}

#runButton:hover {
    background-color: #00f;
    color: #fff;
    transition: background-color 0.3s ease-in-out, color 0.3s ease-in-out;
}

#canvas {
    animation: fadeIn 1s ease-in-out;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
</style>

<script src="shell/codemirror.js"></script>
<link rel="stylesheet" href="shell/codemirror.css">
<link rel="stylesheet" href="shell/theme/abbott.css">
<script src="shell/mode/apl/apl.js"></script>
<script src="turtle.js"></script>

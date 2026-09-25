/* ==========================================================================
   home/helios-interval.js — the morphology, on the real runtime
   --------------------------------------------------------------------------
   WHERE THE RUNTIME COMES FROM. The page does not know. It reads one URL from
   the markup, and that URL is templated from `_data/hatch.yml` — the pin. The
   pin is written by `node design/vendor.mjs` and checked by
   `python3 design/probe/hatch.py`, which hashes what is installed and confirms
   the built page imports it. No hash, commit or byte count is carried here: a
   fact recorded in prose is a fact that drifts. The current pin is a SPIKE —
   `release: false` — because the dojo has published no release to vendor.

   What is real: everything else. The page hands a canvas and a program to the
   dojo's own host door, and the runtime walks the program. The verse is that
   program, character for character. The score is not inferred — the hatch
   reports the line the walk is on, in logical time, and the page kindles it.

   Consequence worth knowing: this runtime has ambients, so movement three is
   twelve live mice chasing each other, not twelve arms drawn in sequence. It
   also means the crawl you are reading is the shell's language, not a dialect.

   WHAT THIS FILE DOES AND DOES NOT KNOW. It knows the page: the verse, the beat,
   the classes. It knows nothing about the language — `helios-plang-tokens.js` does
   that, and this file only asks it for kinds and wraps them. It does not
   reconstruct the joints between beats: a beat never reports the `wait` that
   closes it, and recovering that by arithmetic was page-side guesswork about a
   fact the executor holds. Removed; design/interval.org records the one-line fix.

   TWO AXES, AND NOTHING SERVES BOTH. A token's KIND gives its hue and never
   changes: a gesture stays a gesture whether the walk is on it or a hundred lines
   past it. The walk only changes LIGHT: `--done` warms a line, `--lit` lights the
   one it is on. That is why the ignite does not repaint the line.
   ========================================================================== */

import { tokensOf } from "./helios-plang-tokens.js";

function boot() {
  var root = document.querySelector("[data-helios-interval]");
  if (!root) return;
  var canvas = root.querySelector("[data-helios-interval-stroke]");
  var verse = root.querySelector("[data-helios-interval-verse]");
  var status = root.querySelector("[data-helios-interval-status]");
  var still = root.querySelector("[data-helios-interval-still]");
  var hatchUrl = root.getAttribute("data-helios-interval-hatch");
  if (!canvas || !verse) return;
  /* An empty URL means _data/hatch.yml is missing — the pin did not survive the
     build. Say so on the page rather than rendering nothing. */
  if (!hatchUrl) { showStill("the pin is missing — no runtime was vendored"); return; }

  /* The hatch is 1.1 MB of runtime. Reduced motion and Save-Data ask for the
     finished figure instead, and never fetch it (design/hatch.org, origin
     policy). */
  var connection = navigator.connection || {};
  var motion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !connection.saveData;

  /* ---- the verse: the program, one span per line ------------------------- */
  var src = verse.textContent.replace(/^\n+/, "").replace(/\s+$/, "");
  var lines = src.split("\n");
  var spans = [];   /* index = source line, 1-based */
  var marks = [];   /* the movements named in the source */
  verse.textContent = "";
  lines.forEach(function (line, i) {
    var el = document.createElement("span");
    el.className = "helios-interval__line";
    var m = /^#\s*movement\s+(\S+)\s*--\s*(.+?)\s*$/.exec(line);
    if (m) {
      el.className += " helios-interval__line--mark";
      marks.push({ line: i + 1, act: m[1] + " \u00b7 " + m[2] });
    } else if (/^\s*#/.test(line)) {
      el.className += " helios-interval__line--note";
    }
    var plain = el.className.indexOf("--mark") !== -1 || el.className.indexOf("--note") !== -1;
    if (!line.length) el.textContent = "\u00a0";
    else if (plain) el.textContent = line;
    else writeTokens(line, el);
    verse.appendChild(el);
    spans[i + 1] = el;
  });

  var hatch = null;
  var running = false;
  var finished = false;
  var act = "";

  function showStill(note) {
    canvas.hidden = true;
    /* The still is attached only when it is needed: a successful walk fetches
       neither the film nor its image. */
    if (still) {
      if (still.dataset.src && !still.getAttribute("src")) still.setAttribute("src", still.dataset.src);
      still.hidden = false;
    }
    if (status) status.textContent = note;
  }

  /* The line, split into kinds. The tokenizer knows the language and nothing
     about this page; this loop knows the page's classes and nothing about the
     language. Delete the import and the span classes and the score still works,
     as plain text. */
  function writeTokens(line, el) {
    var tokens = tokensOf(line);
    for (var i = 0; i < tokens.length; i++) {
      var token = tokens[i];
      if (!token.kind) { el.appendChild(document.createTextNode(token.text)); continue; }
      var span = document.createElement("span");
      span.className = "helios-interval__tok helios-interval__tok--" + token.kind;
      span.textContent = token.text;
      el.appendChild(span);
    }
  }

  /* One beat: every line walked in it warms, the line the walk is on is kindled. */
  function kindle(beat) {
    if (still) still.hidden = true;
    canvas.hidden = false;
    for (var i = 0; i < spans.length; i++) {
      if (spans[i]) spans[i].classList.remove("helios-interval__line--lit");
    }
    var walked = beat.lines || [];
    for (var j = 0; j < walked.length; j++) {
      var el = spans[walked[j]];
      if (el) el.classList.add("helios-interval__line--done");
    }
    var lit = spans[beat.line];
    if (lit) lit.classList.add("helios-interval__line--lit");
    for (var k = 0; k < marks.length; k++) {
      if (walked.indexOf(marks[k].line) !== -1) act = marks[k].act;
    }
    if (status && act) status.textContent = act;
  }

  function settle() {
    for (var i = 0; i < spans.length; i++) {
      if (!spans[i]) continue;
      spans[i].classList.remove("helios-interval__line--lit");
      spans[i].classList.add("helios-interval__line--done");
    }
    if (status) status.textContent = "the finished figure";
  }

  function fail(err) {
    running = false;
    if (hatch) { try { hatch.dispose(); } catch (e) {} hatch = null; }
    showStill("fell back to the finished figure — " + (err && err.message ? err.message : err));
  }

  function run() {
    running = true;
    act = "";
    for (var i = 0; i < spans.length; i++) {
      if (spans[i]) spans[i].classList.remove("helios-interval__line--lit", "helios-interval__line--done");
    }
    if (status) status.textContent = "performing";
    import(hatchUrl).then(function (mod) {
      hatch = mod.createHatch(canvas);
      hatch.onLine(kindle);
      return hatch.play(src);
    }).then(function (handle) {
      return handle.finished;
    }).then(function () {
      running = false;
      finished = true;
      settle();
    }).catch(fail);
  }

  if (motion) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            if (!finished && !running) run();
          } else if (running && hatch) {
            /* Abandon the performance; the contract says dispose, not pause. */
            try { hatch.dispose(); } catch (e) {}
            hatch = null;
            running = false;
          }
        }
      }, { threshold: 0.3 });
      io.observe(root);
    } else {
      run();
    }
  } else {
    showStill("the finished figure");
  }
}

boot();

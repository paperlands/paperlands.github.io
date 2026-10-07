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
   the classes. It knows nothing about what the words MEAN — `helios-plang-tokens.js`
   owns the vocabulary, and this file asks it for kinds and for the two shapes the
   score needs: which lines open and close a body, and which lines are rests.

   THE JOINTS. A beat never reports the `wait` that closes it, so the page reads
   where the rests are from the verse it already renders — a depth scan for the
   bodies, one token for the rest verb — and gives the beat's joint a light of its
   own, struck again on every turn of a loop. This is NOT the removed arithmetic
   (a `time` gap matched against a duration literal, silent wherever two waits
   shared a duration): no clock is consulted, and the verse's own text names the
   rest. It is still page-side standing in for a language fact — one span on the
   wait effect, added to the beat it closes, would delete `restOf` and
   `restLength` — and a branch that skips its rest is misnamed until then.
   design/interval.org records it.

   TWO AXES, AND NOTHING SERVES BOTH. A token's KIND gives its hue and never
   changes: a gesture stays a gesture whether the walk is on it or a hundred lines
   past it. The walk only changes LIGHT: `--done` warms a line, `--lit` lights the
   one it is on, `--rest` strikes the joint, `--pair` ticks a body's far end, and
   `--afterglow` is what the last `end` keeps once the walk has stopped. That is
   why the ignite does not repaint the line.
   ========================================================================== */

import { tokensOf, OPENERS, ENTERS, REST } from "./helios-plang-tokens.js";

function boot() {
  var root = document.querySelector("[data-helios-interval]");
  if (!root) return;
  var canvas = root.querySelector("[data-helios-interval-stroke]");
  var verse = root.querySelector("[data-helios-interval-verse]");
  var status = root.querySelector("[data-helios-interval-status]");
  var still = root.querySelector("[data-helios-interval-still]");
  var hatchUrl = root.getAttribute("data-helios-interval-hatch");
  /* The status line's WORDS are the page's, not this script's: they arrive as
     data attributes on the root (see _pages/helios-interval.md), so the page can
     say what its own rehearsal is doing without a second copy of the vocabulary
     here. `fallback` is a PREFIX — the runtime appends the error to it. */
  var words = root.dataset;
  if (!canvas || !verse) return;
  /* An empty URL means _data/hatch.yml is missing — the pin did not survive the
     build. Say so on the page rather than rendering nothing. */
  if (!hatchUrl) { showStill(words.intervalMissingPin); return; }

  /* The hatch is over a megabyte of runtime. Reduced motion and Save-Data ask for the
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

  /* ---- the verse's shape, read once from its own text --------------------- */
  /* Which lines open a body and which `end` closes each (a depth scan, not a
     parser), where the rests are, and how long the verse says each one is. The
     score needs all three because of one fact of the runtime: a beat names the
     statements it walked and says nothing about the `wait` that produced it.
     These are readings of the verse the page already renders — not claims about
     the runtime's clock, and not a second interpreter. */
  var bodies = [];     /* { open, end, enters } for every body, innermost first */
  var bodyAt = {};     /* opener line -> its record */
  var endOf = {};      /* opener line -> the `end` that closes it */
  var restMs = {};     /* rest line -> its length in ms; 0 when the verse writes none */
  (function () {
    var stack = [];
    for (var i = 0; i < lines.length; i++) {
      var sig = tokensOf(lines[i]).filter(function (t) { return t.kind && t.kind !== "cmt"; });
      if (!sig.length) continue;
      var n = i + 1;
      if (sig[0].text === REST) { restMs[n] = restLength(sig); continue; }
      if (OPENERS[sig[0].text] === 1 && sig[sig.length - 1].text === "do") {
        stack.push({ line: n, word: sig[0].text });
        continue;
      }
      if (!stack.length || sig.length !== 1 || sig[0].text !== "end") continue;
      var opened = stack.pop();
      var body = { open: opened.line, end: n, enters: ENTERS[opened.word] === 1 };
      bodies.push(body);
      bodyAt[body.open] = body;
      endOf[body.open] = n;
      /* The near end of a body the walk will enter: the look ticks it once the
         walk arrives, and the tick is a class on this line. */
      if (body.enters && spans[body.open]) spans[body.open].classList.add("helios-interval__line--body");
    }
    bodies.sort(function (a, b) { return b.open - a.open; });
  })();

  /* A rest's length when the verse writes it as a literal: `wait 1/2` is half a
     second, `wait 0.35` is 350 ms. An expression the page cannot read is not
     guessed — the look's own length stands in for it. */
  function restLength(sig) {
    var args = sig.slice(1);
    if (args.length === 1 && args[0].kind === "num") return Number(args[0].text) * 1000;
    if (args.length === 3 && args[0].kind === "num" && args[1].text === "/" && args[2].kind === "num") {
      var by = Number(args[2].text);
      if (by) return Number(args[0].text) / by * 1000;
    }
    return 0;
  }

  /* Which rest a beat closes. The ledger holds every statement walked since the
     last joint, in execution order, so the walk is standing at the end of the
     last of them: the rest is the first `wait` line after it in the body that
     contains it — failing that, in the body that encloses that one; failing
     both, after the greatest line the ledger holds, which is where a body's
     call site sits. A branch that skips its rest misnames this; a runtime that
     put the wait's span on its own beat would delete it. */
  function restOf(beat) {
    var walked = beat.lines || [];
    if (!walked.length) return 0;
    var i, r;
    var last = walked[walked.length - 1];
    for (i = 0; i < bodies.length; i++) {
      if (!(bodies[i].open < last && last < bodies[i].end)) continue;
      for (r = last + 1; r < bodies[i].end; r++) if (restMs[r] !== undefined) return r;
    }
    var outer = last;
    for (i = 0; i < walked.length; i++) if (walked[i] > outer) outer = walked[i];
    for (r = outer + 1; r <= lines.length; r++) if (restMs[r] !== undefined) return r;
    return 0;
  }

  /* ---- the rests ---------------------------------------------------------- */
  /* A beat is the runtime's joint; the rest is the page's light for it. Struck
     again on every turn of a loop, so it is driven a frame at a time — a
     transition already running cannot be struck twice. `--rest` carries the
     light and `--helios-rest` says how much of it is left, so the ink under it
     stays the tokenizer's business. */
  var restLook = 320;    /* ms: the length of a rest the verse does not measure */
  var striking = {};     /* rest line -> { el, from, ms } */
  var frame = 0;

  function strike(line) {
    var el = spans[line];
    if (!el) return;
    /* A rest is passed through, not landed on: the beat stream's ledger never
       names it, so it is struck and never warmed — the light comes and goes,
       and what counts as walked stays the runtime's to say. */
    el.classList.add("helios-interval__line--rest");
    el.style.setProperty("--helios-rest", "1");
    striking[line] = { el: el, from: performance.now(), ms: restMs[line] || restLook };
    if (!frame) frame = requestAnimationFrame(bloom);
  }

  function bloom(now) {
    frame = 0;
    var alive = 0;
    for (var line in striking) {
      var one = striking[line];
      /* Clamped at both ends: an animation frame's clock can be older than the
         strike's own `performance.now()`, and a rest must not out-glow itself. */
      var t = Math.min(1, Math.max(0, (now - one.from) / one.ms));
      /* The joint is the strike; the rest lets the light down. */
      one.el.style.setProperty("--helios-rest", Math.pow(1 - t, 1.6).toFixed(3));
      if (t < 1) { alive++; continue; }
      one.el.classList.remove("helios-interval__line--rest");
      one.el.style.removeProperty("--helios-rest");
      delete striking[line];
    }
    if (alive) frame = requestAnimationFrame(bloom);
  }

  /* Every rest released: leaving the act, a failed walk, or the end of the
     performance must not leave a light running on a line nobody is walking. */
  function quiet() {
    for (var line in striking) {
      striking[line].el.classList.remove("helios-interval__line--rest");
      striking[line].el.style.removeProperty("--helios-rest");
    }
    striking = {};
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }

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

  /* One beat. Every line walked in it warms; the line the walk is on is kindled;
     a body the walk has entered ticks its far end; and the joint is struck. */
  function kindle(beat) {
    if (still) still.hidden = true;
    canvas.hidden = false;
    for (var i = 0; i < spans.length; i++) {
      if (spans[i]) spans[i].classList.remove("helios-interval__line--lit");
    }
    var walked = beat.lines || [];
    var j;
    for (j = 0; j < walked.length; j++) {
      var el = spans[walked[j]];
      if (el) el.classList.add("helios-interval__line--done");
      /* The body the walk has entered: its `end` is the pair's other half, and
         the look ticks both. `def`/`draw` do not enter where they stand. */
      var body = bodyAt[walked[j]];
      if (body && body.enters && spans[body.end]) spans[body.end].classList.add("helios-interval__line--pair");
    }
    var lit = spans[beat.line];
    if (lit) lit.classList.add("helios-interval__line--lit");
    var at = restOf(beat);
    if (at) strike(at);
    for (j = 0; j < marks.length; j++) {
      if (walked.indexOf(marks[j].line) !== -1) act = marks[j].act;
    }
    if (status && act) status.textContent = act;
  }

  function settle() {
    quiet();
    for (var i = 0; i < spans.length; i++) {
      if (!spans[i]) continue;
      spans[i].classList.remove("helios-interval__line--lit");
      spans[i].classList.add("helios-interval__line--done");
    }
    /* The walk went out of the program's own door. The last `end` — the close
       of the outermost body the verse wrote — glows once and then keeps a low
       light: the afterglow the reference leaves on the water after sundown. */
    var close = 0;
    for (var line in endOf) if (endOf[line] > close) close = endOf[line];
    if (close && spans[close]) spans[close].classList.add("helios-interval__line--afterglow");
    if (status) status.textContent = words.intervalFinished;
  }

  function fail(err) {
    running = false;
    quiet();
    if (hatch) { try { hatch.dispose(); } catch (e) {} hatch = null; }
    showStill(words.intervalFallback + " " + (err && err.message ? err.message : err));
  }

  function run() {
    running = true;
    act = "";
    /* A performance, not a pause: whatever the last one left lit, including a
       rest still running on its own frame, goes out first. */
    quiet();
    for (var i = 0; i < spans.length; i++) {
      if (!spans[i]) continue;
      spans[i].classList.remove(
        "helios-interval__line--lit",
        "helios-interval__line--done",
        "helios-interval__line--pair",
        "helios-interval__line--rest",
        "helios-interval__line--afterglow"
      );
      spans[i].style.removeProperty("--helios-rest");
    }
    if (status) status.textContent = words.intervalPerforming;
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
            quiet();
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
    showStill(words.intervalFinished);
  }
}

boot();

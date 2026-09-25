import Turtle from "../turtling/turtle.js";
import { parseProgram } from "../turtling/parse.js";

/* The shell speaks def/as. This page's turtle speaks draw, and has no assistant.
   The translation is mechanical so the program in the box can stay the shell's. */
function toSite(src) {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  const opened = [];
  let depth = 0;
  for (const line of lines) {
    const t = line.trim();
    if (/^def\b/.test(t)) {
      out.push(line.replace(/\bdef\b/, "draw"));
      if (/\bdo$/.test(t)) depth += 1;
      continue;
    }
    if (/^as\s+\S+\s+do$/.test(t)) {
      opened.push(depth);
      continue;
    }
    if (t === "end" && opened.length && opened[opened.length - 1] === depth) {
      opened.pop();
      continue;
    }
    if (/\bdo$/.test(t)) depth += 1;
    if (t === "end") depth = Math.max(0, depth - 1);
    out.push(line);
  }
  return out.join("\n");
}

function bindFn(turtle) {
  turtle.defineFunc = function (name, parameters, ctx) {
    const raw = parameters[0] && parameters[0].value;
    ctx[name] = this.evaluateExpression(raw, ctx);
  };
}

function size(canvas) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.floor(r.width * dpr));
  const h = Math.max(1, Math.floor(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

function boot() {
  const root = document.querySelector("[data-helios-dojo]");
  if (!root) return;
  const canvas = root.querySelector("[data-helios-dojo-canvas]");
  const film = root.querySelector("[data-helios-dojo-film]");
  const box = root.querySelector("[data-helios-dojo-program]");
  const status = root.querySelector("[data-helios-dojo-status]");
  let turtle = null;
  let timer = 0;

  function fail(err) {
    canvas.hidden = true;
    film.hidden = false;
    if (status) status.textContent = "fell back to the film — " + (err && err.message ? err.message : err);
  }

  function run() {
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      try {
        size(canvas);
        if (!turtle) {
          turtle = new Turtle(canvas);
          bindFn(turtle);
        }
        const ast = parseProgram(toSite(box.value));
        turtle.draw(ast, { comms: false });
        canvas.hidden = false;
        film.hidden = true;
        if (status) status.textContent = "drawing from the commands";
      } catch (err) {
        console.error(err);
        fail(err);
      }
    }, 180);
  }

  box.addEventListener("input", run);
  window.addEventListener("resize", run);
  run();
}

boot();

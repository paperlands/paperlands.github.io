// The probe rig's viewport: the pinned runtime, exposed raw, so the CDP probes can read the
// accepted source, command counts, faults and beats of the recipes the page runs. It opens the
// runtime through the same `hatch.mjs` the act's viewport does, so a probe cannot measure a
// different artifact than the page ships. This is a probe instrument: it is not the act's host
// boundary (`assets/js/home/fourth-turn/stage.mjs`, which presents whole figures over a
// postMessage bridge) and not a production decision.
import { hatchFactory } from '../../assets/js/home/fourth-turn/hatch.mjs';
import { bindBeat } from '../../assets/js/home/paperlang/performer.mjs';

const canvas = document.querySelector('canvas');
const fault = document.querySelector('#fault');
let factory = null;
let hatch = null;
let generation = 0;
// A run's lifetime is a generation. A beat that arrives after its generation has moved on is
// counted, not delivered: the probe can then say whether the runtime stops announcing at all, or
// merely stops being listened to. `stale.beats` is the raw count either way.
const stale = { beats: 0, finished: 0 };
const notes = [];
const captures = [];
for (const phase of ['gotpointercapture', 'lostpointercapture']) {
  document.addEventListener(phase, (event) => {
    captures.push({ phase, x: Math.round(event.clientX), y: Math.round(event.clientY), target: event.target?.tagName ?? null, id: event.pointerId, moved: false });
  }, true);
}
document.addEventListener('pointermove', (event) => {
  if (captures.length && event.buttons) captures[captures.length - 1].moved = true;
}, true);

function note(message) { notes.push(message); }

async function boot() {
  // The rig opens the runtime through the same module the act's viewport does, so a probe can
  // never measure a different artifact than the page ships.
  const { path, createHatch } = await hatchFactory();
  factory = createHatch;
  window.__ft = {
    ready: true,
    artifact: path,
    factory,
    notes,
    captures,
    open(caps = {}) {
      hatch?.dispose?.();
      hatch = factory(canvas, { caps });
      window.__ft.hatch = hatch;
      return { keys: Object.keys(hatch), caps };
    },
    // What the runtime mounts in the document, so the probe can find the native
    // point without inventing camera arithmetic. Honest DOM observation only.
    dom() {
      const rows = [];
      for (const node of document.body.children) {
        const style = getComputedStyle(node);
        const rect = node.getBoundingClientRect();
        rows.push({ tag: node.tagName, id: node.id, cls: typeof node.className === 'string' ? node.className : '', pointerEvents: style.pointerEvents, rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) } });
      }
      return { childCount: document.body.children.length, rows, keys: hatch ? Object.keys(hatch) : [] };
    },
    // Same isolation morphology-stage uses: after the runtime's own capture
    // listener, so a claimed native point still gets first refusal and an
    // unclaimed canvas drag cannot orbit the camera and fake a geometry change.
    lockCamera() {
      if (window.__ft._fence) return;
      const fence = (event) => { if (event.target === canvas) event.stopImmediatePropagation(); };
      window.addEventListener('pointerdown', fence, { capture: true });
      window.addEventListener('wheel', fence, { capture: true, passive: true });
      window.__ft._fence = fence;
    },
    // Locate the native point by reading the overlay canvas the runtime mounts.
    pinBox() {
      const overlay = [...document.querySelectorAll('canvas')].find((c) => c !== canvas);
      if (!overlay) return { overlay: false };
      const ctx = overlay.getContext('2d');
      if (!ctx) return { overlay: true, context2d: false };
      const { width, height } = overlay;
      let data;
      try { data = ctx.getImageData(0, 0, width, height).data; } catch (error) { return { overlay: true, context2d: true, error: error.message }; }
      let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1, count = 0;
      for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) { const a = data[(y * width + x) * 4 + 3]; if (a > 10) { count += 1; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; } }
      // The native point marker is solid; the ring, rail and grid are thin.
      // The densest 9px cell is the point itself.
      const CELL = 9;
      let hot = null;
      for (let cy0 = 0; cy0 < height; cy0 += CELL) {
        for (let cx0 = 0; cx0 < width; cx0 += CELL) {
          let sum = 0;
          for (let y = cy0; y < Math.min(cy0 + CELL, height); y += 1) for (let x = cx0; x < Math.min(cx0 + CELL, width); x += 1) sum += data[(y * width + x) * 4 + 3];
          if (sum > 0 && (!hot || sum > hot.sum)) hot = { sum, x: cx0 + CELL / 2, y: cy0 + CELL / 2 };
        }
      }
      return { overlay: true, context2d: true, size: { width, height }, count, box: count ? { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 } : null, hot };
    },
    pinImage() {
      const overlay = [...document.querySelectorAll('canvas')].find((c) => c !== canvas);
      if (!overlay) return null;
      try { return overlay.toDataURL('image/png'); } catch (error) { return 'ERR:' + error.message; }
    },
    // Play one program and resolve with everything the host can honestly see.
    stale,
    async play(program) {
      const gen = ++generation;
      fault.textContent = '';
      const beats = [];
      if (!hatch) { hatch = factory(canvas, {}); window.__ft.hatch = hatch; }
      bindBeat(hatch, (beat) => { if (gen === generation) beats.push(beat); else stale.beats += 1; });
      const t0 = performance.now();
      let accepted = null;
      try {
        const run = await hatch.play(program);
        accepted = { commands: run.commandCount, atMs: performance.now() - t0 };
        // A probe must never hang the runner: race settlement against a guard.
        let guard = 0;
        const settled = await Promise.race([
          run.finished,
          new Promise((resolve) => { guard = setTimeout(() => resolve({ timedOut: true }), 45000); }),
        ]);
        clearTimeout(guard);
        if (settled?.timedOut) {
          generation++; hatch?.dispose?.(); hatch = null; window.__ft.hatch = null;
          return { ok: false, program, error: 'probe guard: no settlement after 45s', atMs: performance.now() - t0, beats: beats.length };
        }
        return { ok: true, program, accepted, settled, settledMs: performance.now() - t0, beats: beats.length, beatLines: [...new Set(beats.map((b) => b?.line))].filter((n) => n != null).slice(0, 40) };
      } catch (error) {
        return { ok: false, program, error: error.message, atMs: performance.now() - t0, beats: beats.length };
      }
    },
    dispose() { generation++; hatch?.dispose?.(); hatch = null; window.__ft.hatch = null; },
  };
}
boot().catch((error) => { fault.textContent = error.message; window.__ft = { ready: false, error: error.message }; });

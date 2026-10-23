// Scroll behaviour under a stationary pointer, on the shared CDP harness.
//
//   CDP_PORT=9226 node design/probe/scroll.mjs [route]
//
// A page can render perfectly and still be unusable: the reader wheels down, the
// pointer crosses a band that silently refuses the gesture, and the page stops
// with content still below. Nothing moves on its own, so no layout probe sees it.
//
// The pointer STAYS PUT while the page moves under it. That is the whole point:
// a wheel test that recentres the pointer on each band proves nothing, because a
// real reader does not move the mouse to keep scrolling.
import { connect, newPage } from './cdp.mjs';

const ROUTE = process.argv[2] || '/helios';
const BASE = 'http://127.0.0.1:8801';
const NOTCH = 200;
const LIMIT = 80;

const cdp = await connect();
const page = await newPage(cdp);

let failures = 0;
function check(label, ok, detail) {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : `  — ${detail}`}`);
  if (!ok) failures += 1;
}

await page.s('Emulation.setDeviceMetricsOverride', {
  width: 1280, height: 800, deviceScaleFactor: 1, mobile: false,
});
await page.goto(BASE + ROUTE, 2200);

const read = `(() => {
  const el = document.scrollingElement || document.documentElement;
  return {
    y: Math.round(window.scrollY),
    max: Math.round(el.scrollHeight - el.clientHeight),
    behavior: getComputedStyle(document.documentElement).scrollBehavior,
  };
})()`;

const at = () => page.evaluate(read);

async function jump(top) {
  await page.evaluate(`window.scrollTo({ top: ${top}, behavior: 'instant' })`);
  await new Promise(r => setTimeout(r, 250));
}

async function notch(x, y, deltaY) {
  await page.s('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY, pointerType: 'mouse' });
  await new Promise(r => setTimeout(r, 110));
}

// Sweep the page under a fixed point. A notch that moves nothing, while the
// target is still ahead, is the defect: the pointer is over a band that ate it.
async function sweep(label, x, y, down) {
  const info = await at();
  const target = down ? info.max : 0;
  const dir = down ? 1 : -1;
  await jump(down ? 0 : info.max);

  let notches = 0, stalls = 0, reversals = 0, worst = 0, previous = await at();
  while (notches < LIMIT) {
    const before = await at();
    if (down ? before.y >= target - 4 : before.y <= 4) break;
    await notch(x, y, dir * NOTCH);
    const after = await at();
    notches += 1;
    const d = after.y - before.y;
    if (d === 0) stalls += 1;
    if (down ? d < -8 : d > 8) { reversals += 1; worst = down ? Math.min(worst, d) : Math.max(worst, d); }
    previous = after;
  }

  const end = (await at()).y;
  const reached = down ? end >= target - 8 : end <= 8;
  check(`${label} — reaches the ${down ? 'bottom' : 'top'}`, reached,
    `${end} of ${target} after ${notches} notch(es), ${stalls} stall(s)`);
  check(`${label} — nothing pulls the reader back`, reversals === 0,
    `${reversals} reversal(s), worst ${worst}px`);
  return { notches, stalls, end, target };
}

const info = await at();
const W = 1280, H = 800;
const strip = await page.evaluate(`(() => {
  const s = document.querySelector('[data-media-track]');
  if (!s) return null;
  const cs = getComputedStyle(s);
  return { overscrollX: cs.overscrollBehaviorX, overscrollY: cs.overscrollBehaviorY, overflowY: cs.overflowY };
})()`);

console.log(`\n### ${ROUTE}`);
console.log(`   scroll-behavior: ${info.behavior}   page ${info.max + H}px tall, max scroll ${info.max}px`);
if (strip) {
  console.log(`   strip: overflow-y=${strip.overflowY}  overscroll x=${strip.overscrollX} y=${strip.overscrollY}`);
}

check('the document scrolls', info.max > 200, `max scroll ${info.max}px`);

if (info.max > 200) {
  // The realistic reader: pointer parked at 35% height, never moved.
  await sweep('pointer parked mid-screen, down', Math.round(W / 2), Math.round(H * 0.35), true);
  await sweep('pointer parked mid-screen, up', Math.round(W / 2), Math.round(H * 0.35), false);

  if (strip) {
    // And the worst case, aimed straight at the horizontal band.
    await page.evaluate(`document.querySelector('[data-media-track]').scrollIntoView({ block: 'center', behavior: 'instant' })`);
    const centre = await page.evaluate(`(() => {
      const r = document.querySelector('[data-media-track]').getBoundingClientRect();
      return { x: Math.round(r.left + r.width / 2), y: Math.round(Math.min(innerHeight - 40, Math.max(40, r.top + r.height / 2))) };
    })()`);
    await sweep('pointer over the strip, down', centre.x, centre.y, true);
    await sweep('pointer over the strip, up', centre.x, centre.y, false);
  }
}

cdp.close();
console.log(`\n${failures === 0 ? 'scroll holds' : `${failures} check(s) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

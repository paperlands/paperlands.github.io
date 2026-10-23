// Render-level check for the shared identity's hit area.
//
//   PROBE=identity.mjs bash design/probe/run.sh /helios /beginnings
//
// Two looks draw the same element — the Helios look on /helios, the evening
// edition on the notes — and in both, `_includes/home/wordmark.html` paints the
// identity while `_includes/nav.html` keeps the real link. The wordmark is
// `pointer-events: none`, and the link that owns the click and the keyboard stop
// is drawn invisible, so the link's own box IS the hit area. Nothing else is.
//
// That box was the invisible text: "PaperLand" at the nav's 1.15rem, which stops
// around the third letter while the drawn art runs on to the edge of its 12rem.
// Measured on /helios before the fix, the drawn word spanned x 50..174 and the
// link reached x 116 — a reader could click "Pap" and no further. Every kind of
// test this repository already had passed: the markup was right, the rule that
// binds the mark was right, the focus ring landed on the drawn twin, and a
// stylesheet diff showed only an added pseudo-element.
//
// So the assertion is the reader's: every point over the identity's own box must
// belong to the brand link, and a plate must still win its own clicks where the
// two boxes touch on a narrow screen.
import { connect, newPage } from './cdp.mjs';

const BASE = 'http://127.0.0.1:8801';
const ROUTES = process.argv.slice(2);
if (!ROUTES.length) {
  console.error('usage: PROBE=identity.mjs bash design/probe/run.sh <route...>');
  process.exit(2);
}
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 900, height: 800 },
  { name: 'phone', width: 390, height: 780 },
  { name: 'narrow', width: 320, height: 640 },
];

const cdp = await connect();
const page = await newPage(cdp);

let failures = 0;
function check(label, ok, detail) {
  console.log(`   ${ok ? 'ok  ' : 'FAIL'} ${label}${detail === undefined ? '' : `  — ${detail}`}`);
  if (!ok) failures += 1;
}

const PROBE = `(() => {
  const mark = document.querySelector('[data-nav-mark]');
  const wm = document.querySelector('.helios-wordmark');
  if (!mark || !wm) return { mark: !!mark, wordmark: !!wm };
  const box = wm.getBoundingClientRect();
  const name = (el) => el ? el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : '') : 'null';
  // The identity's own box, on a grid; three heights, because a hit area that
  // covers one band and not the rest is still a broken hit area.
  const misses = [];
  let points = 0;
  for (let fx = 0.02; fx <= 0.991; fx += 0.04) {
    for (const fy of [0.2, 0.5, 0.8]) {
      const x = box.left + box.width * fx, y = box.top + box.height * fy;
      const el = document.elementFromPoint(x, y);
      points += 1;
      if (!(el === mark || mark.contains(el))) {
        misses.push(Math.round(x) + ',' + Math.round(y) + ' -> ' + name(el));
      }
    }
  }
  // A plate under the identity's box must keep its own clicks: the mark's hit
  // area is spread past the link's own box, and on a 320px screen the boxes
  // overlap. Later in the DOM wins, and that is what this checks.
  const stolen = [];
  let plates = 0;
  for (const a of document.querySelectorAll('.folio-nav__plates a')) {
    const b = a.getBoundingClientRect();
    // A plate with no box is not on screen: the bar collapses to the burger
    // below 1024px (components/nav.css). There is nothing there to steal, so
    // it is skipped rather than counted as a pass — and the count is reported,
    // so a width where every plate vanished cannot read as a clean run.
    // (No backticks anywhere in this file: the whole probe is one template.)
    if (!b.width || !b.height) continue;
    plates += 1;
    const el = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
    if (!(el === a || a.contains(el))) stolen.push(a.textContent.trim() + ' -> ' + name(el));
  }
  return {
    mark: true, wordmark: true, points, misses, stolen, plates,
    box: [Math.round(box.left), Math.round(box.top), Math.round(box.width), Math.round(box.height)],
    link: (() => { const b = mark.getBoundingClientRect();
      return [Math.round(b.left), Math.round(b.right), Math.round(b.width)]; })(),
  };
})()`;

for (const route of ROUTES) {
  for (const vp of VIEWPORTS) {
    console.log(`\n### ${route} @ ${vp.width}x${vp.height}`);
    await page.s('Emulation.setDeviceMetricsOverride', {
      width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.width < 700,
    });
    await page.goto(BASE + route, 1400);
    const m = await page.evaluate(PROBE);
    check('the identity and its link both render', m.mark === true && m.wordmark === true,
      `link=${m.mark} wordmark=${m.wordmark}`);
    if (!m.points) continue;
    check('every point over the identity is the identity',
      m.misses.length === 0,
      `box=${m.box} link=[l,r,w]=${m.link}, ${m.misses.length}/${m.points} missed` +
        (m.misses.length ? ` (${m.misses.slice(0, 3).join('; ')})` : ''));
    check('a plate still owns its own clicks', m.stolen.length === 0,
      m.stolen.length ? m.stolen.join('; ') : 'no plate stolen');
  }
}

cdp.close();
console.log(`\n${failures === 0 ? 'the identity holds' : `${failures} check(s) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);

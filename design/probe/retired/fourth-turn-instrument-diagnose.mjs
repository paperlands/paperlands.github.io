// Fourth-turn — why the instrument's SVG is not on the page.
//   PROBE=fourth-turn-instrument-diagnose.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';

const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-instrument-diagnose';
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const page_url = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cdp = await connect();
const page = await newPage(cdp);
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(page_url, 100);
  for (let i = 0; i < 60 && !(await page.evaluate('window.fourthTurn?.ready === true')); i += 1) await sleep(100);
  await page.evaluate('new Promise(r => { const c = () => window.fourthTurn.finished ? r(1) : setTimeout(c, 40); c(); })');
  for (let i = 0; i < 40 && !(await page.evaluate('window.fourthTurn.settled === true')); i += 1) await sleep(100);
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1200);
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1100);
  await page.evaluate('document.querySelector("#advance").click()');
  await sleep(1100);
  const report = await page.evaluate(`(() => {
    const describe = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      let bbox = null;
      try { const b = el.getBBox(); bbox = { x: b.x, y: b.y, w: b.width, h: b.height }; } catch (e) { bbox = 'no getBBox'; }
      return {
        tag: el.tagName, cls: el.getAttribute('class'), id: el.id,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        bbox, display: cs.display, visibility: cs.visibility, opacity: cs.opacity, stroke: cs.stroke, strokeWidth: cs.strokeWidth, fill: cs.fill,
        check: el.checkVisibility ? el.checkVisibility() : null,
        attrs: [...el.attributes].map((a) => a.name + '=' + a.value).join(' ').slice(0, 200),
      };
    };
    const svg = document.querySelector('#instrument');
    const rail = [...document.querySelectorAll('#rail > *')];
    const fig = document.querySelector('.figure').getBoundingClientRect();
    return JSON.stringify({
      figure: { x: Math.round(fig.x), y: Math.round(fig.y), w: Math.round(fig.width), h: Math.round(fig.height) },
      svg: describe(svg),
      spoke: describe(document.querySelector('#spoke')),
      pivot: describe(document.querySelector('#pivot')),
      turn: describe(document.querySelector('#turn')),
      railCount: rail.length,
      rail: rail.map(describe),
      grip: describe(document.querySelector('#grip')),
      thread: describe(document.querySelector('#thread')),
      threadLine: describe(document.querySelector('#thread-line')),
      threadParentHidden: document.querySelector('#thread').hidden,
      computedEmber: getComputedStyle(document.documentElement).getPropertyValue('--ember'),
      figureChildren: [...document.querySelector('.figure').children].map((c) => c.tagName + '.' + (c.getAttribute('class') || '') + ' z=' + getComputedStyle(c).zIndex + ' pos=' + getComputedStyle(c).position + ' disp=' + getComputedStyle(c).display),
    });
  })()`);
  writeFileSync(`${out}/report.json`, JSON.stringify(JSON.parse(report), null, 2));
  console.log(report);
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/page.png`, Buffer.from(data, 'base64'));
} finally { cdp.close(); }

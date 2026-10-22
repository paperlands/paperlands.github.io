// Real study, real pinned Hatch, and the rendered SVG guides.
// PROBE=fourth-turn-guides.mjs bash design/probe/fourth-turn.sh
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const cdp = await connect();
const page = await newPage(cdp);
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-guides';
mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wait(expression) {
  for (let i = 0; i < 200; i++) {
    if (await page.evaluate(expression)) return;
    await sleep(80);
  }
  throw Error(`Timed out: ${expression}`);
}
async function inspect(label) {
  const result = await page.evaluate(`(() => {
    const {len,turn}=ft.values;
    const rect=document.querySelector('#figure').getBoundingClientRect();
    const scale=rect.height/(2*500*Math.tan(Math.PI/6));
    const count=ft.active==='side';
    const theta=turn*Math.PI/180;
    const expected={x:rect.width/2+(count?-1:1)*len/2*scale,y:rect.height/2+(count?len/(2*Math.tan(theta/2)):len/2)*scale};
    const heading=count?theta:0;
    const line=document.querySelector('.turn-carry');
    if(!line)return {missing:true};
    const at={x:+line.getAttribute('x1'),y:+line.getAttribute('y1')};
    const ray={x:+line.getAttribute('x2')-at.x,y:+line.getAttribute('y2')-at.y};
    const path=document.querySelector('#turn').getAttribute('d');
    const numbers=path.match(/-?\\d+(?:\\.\\d+)?/g).map(Number);
    const first={x:numbers[0]-at.x,y:numbers[1]-at.y};
    const last={x:numbers.at(-2)-at.x,y:numbers.at(-1)-at.y};
    const outgoing=heading-theta;
    const arrow=document.querySelector('.turn-arrow').getAttribute('d').match(/-?\\d+(?:\\.\\d+)?/g).map(Number);
    const direction={x:arrow[0]-(arrow[2]+arrow[4])/2,y:arrow[1]-(arrow[3]+arrow[5])/2};
    return {
      turn,count,at,expected,
      originError:Math.hypot(at.x-expected.x,at.y-expected.y),
      incomingCross:ray.x*Math.sin(heading)-ray.y*Math.cos(heading),
      incomingDot:ray.x*Math.cos(heading)+ray.y*Math.sin(heading),
      arcStartCross:first.x*Math.sin(heading)-first.y*Math.cos(heading),
      arcEndCross:last.x*Math.sin(outgoing)-last.y*Math.cos(outgoing),
      tangentDot:direction.x*Math.cos(outgoing)+direction.y*Math.sin(outgoing),
      parallelGuides:document.querySelectorAll('.turn-axis').length,
      finite:!path.includes('NaN')
    };
  })()`);
  assert(!result.missing, `${label}: missing incoming guide`);
  assert(result.originError < 0.01, `${label}: guide is not at the turning vertex`);
  assert(Math.abs(result.incomingCross) < 0.01 && result.incomingDot > 0, `${label}: guide must continue the arrival heading`);
  assert(Math.abs(result.arcStartCross) < 0.15 && Math.abs(result.arcEndCross) < 0.15, `${label}: arc endpoints must lie on the two headings`);
  assert(Math.abs(result.tangentDot) < 0.01, `${label}: arc arrow must be tangent`);
  assert(result.parallelGuides === 0 && result.finite, `${label}: no offset or invalid guides`);
  console.log(`PASS ${label}: incoming line of action, exterior sweep, tangent arrow`);
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${label}.png`, Buffer.from(data, 'base64'));
  return result;
}
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
  await page.goto(base.replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html'));
  await wait('!!window.fourthTurn?.ready && window.fourthTurn.settled');
  await page.evaluate('window.ft=window.fourthTurn; ft.played(); ft.gather()');
  const results = {};
  for (const turn of [90, 72, 120, 60]) {
    await page.evaluate(`ft.played(); ft.setValue('turn',${turn})`);
    await wait(`ft.source.includes('left ${turn}')`);
    results[`loop-${turn}`] = await inspect(`loop-${turn}`);
  }
  await page.evaluate('ft.played(); ft.name(); ft.generalise()');
  for (const side of [4, 5, 3, 6]) {
    await page.evaluate(`ft.played(); ft.setValue('side',${side})`);
    await wait(`ft.source.includes('polygon 250 ${side}')`);
    results[`polygon-${side}`] = await inspect(`polygon-${side}`);
  }
  assert(!page.console.some(entry => entry.type === 'exception'), JSON.stringify(page.console));
  writeFileSync(`${out}/report.json`, JSON.stringify(results, null, 2));
} finally { cdp.close(); }

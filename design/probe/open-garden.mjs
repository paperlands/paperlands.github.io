// CDP browser evidence for the design-only variant. No added npm dependencies.
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { measure, project } from '../iterations/15-open-garden-model.mjs';
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8813/design/iterations/15-open-garden.html';
const out = process.env.PROBE_OUTPUT || '/tmp/open-garden-evidence';
mkdirSync(out, { recursive: true });
const evidence = [], pages = [], cdp = await connect();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function assert(ok, label) { if (!ok) throw new Error(label); evidence.push(label); }
async function fresh() { const page = await newPage(cdp); pages.push(page); return page; }
async function metrics(page, width = 1440, height = 900, mobile = false) { await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile }); }
async function click(page, selector) { await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function settled(page) {
  const result = await page.evaluate(`new Promise(resolve => {
    const start=performance.now(); function check(){
      const g=window.openGarden, f=document.querySelector('#fault');
      if(f && !f.hidden) return resolve({error:f.textContent});
      if(g?.ready && g.acceptedId===g.requestId && g.finishedId===g.requestId) return resolve({ok:true});
      if(performance.now()-start>9000)return resolve({error:'timeout'});
      setTimeout(check,30);
    } check();
  })`);
  if (!result.ok) throw new Error(JSON.stringify(result));
}
async function shot(page, name, clip) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, ...(clip ? { clip } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function key(page, name) {
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: name });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: name });
}
async function turnGeometry(page) {
  return page.evaluate(`(()=>{const r=document.querySelector('#drawing').getBoundingClientRect(),h=document.querySelector('#handle').getBoundingClientRect(),v=openGarden.view;return {x:h.x+h.width/2,y:h.y+h.height/2,px:r.x+v.width/2+(240-v.cx)*v.scale,py:r.y+v.height/2+v.cy*v.scale,radius:r.width<420?47:58};})()`);
}
async function mouseTurn(page, angle, release = true) {
  const g = await turnGeometry(page);
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x: g.x, y: g.y, button: 'left', clickCount: 1 });
  await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g.px + g.radius * Math.cos(angle * Math.PI / 180), y: g.py - g.radius * Math.sin(angle * Math.PI / 180), button: 'left', buttons: 1 });
  if (release) await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.px + g.radius * Math.cos(angle * Math.PI / 180), y: g.py - g.radius * Math.sin(angle * Math.PI / 180), button: 'left', clickCount: 1 });
}
async function pixels(page, name) {
  // Hide ONLY the authoring guide to measure actual Paperlang paint.
  await page.evaluate(`document.querySelector('#dial').style.visibility='hidden';document.querySelector('#handle').style.visibility='hidden'`);
  const data = await page.evaluate(`(()=>{const r=document.querySelector('#runtime').getBoundingClientRect();return {clip:{x:r.x,y:r.y,width:r.width,height:r.height,scale:1},state:openGarden.state,view:openGarden.view};})()`);
  await shot(page, name, data.clip);
  await page.evaluate(`document.querySelector('#dial').style.visibility='';document.querySelector('#handle').style.visibility=''`);
  const box = JSON.parse(execFileSync('python3', ['-c', 'from PIL import Image; import json,sys; im=Image.open(sys.argv[1]).convert("RGB"); mask=Image.new("L",im.size); mask.putdata([255 if r>165 and g>145 and r>b*1.13 else 0 for r,g,b in im.getdata()]); print(json.dumps(mask.getbbox()))', `${out}/${name}.png`], { encoding: 'utf8' }));
  assert(box !== null, `${name}: native Paperlang painted a trail`);
  const b = measure(data.state), a = project(b.minX, b.maxY, data.view), z = project(b.maxX, b.minY, data.view);
  const expected = [a.x, a.y, z.x, z.y];
  assert(box.every((value, i) => Math.abs(value - expected[i]) < 4), `${name}: native paint agrees with layout bounds (within 4px)`);
}
try {
  const page = await fresh(); await metrics(page); await page.goto(base); await settled(page); await sleep(500);
  assert(await page.evaluate('openGarden.state.form===0 && openGarden.state.angle===120'), 'Begins with one gesture and an editable 120° turn');
  await shot(page, 'desktop-gesture');
  await sleep(3500);
  assert(await page.evaluate('openGarden.state.form===0'), 'No automatic progression takes the gesture away');
  await page.evaluate(`document.querySelector('#handle').focus()`);
  for (let i = 0; i < 7; i++) await key(page, 'ArrowLeft');
  await settled(page);
  assert(await page.evaluate('openGarden.state.angle===113 && document.querySelector("#source").textContent.includes("lt 113")'), 'Real keyboard changes the angle and the visible source together');
  await click(page, '#next'); await settled(page); await sleep(600);
  const request = await page.evaluate('openGarden.requestId');
  const executed = await page.evaluate('document.querySelector("#executed").textContent');
  await page.evaluate('window.forwardWitness=document.querySelector("[data-row=forward]")');
  await click(page, '#next'); await sleep(650);
  assert(await page.evaluate(`openGarden.requestId===${request} && openGarden.state.form===2 && openGarden.state.angle===113`), 'Gathering preserves the actual drawing and chosen angle');
  assert(await page.evaluate(`document.querySelector('#executed').textContent===${JSON.stringify(executed)}`), 'Gathering retains truthful executed-source evidence');
  assert(await page.evaluate('document.querySelector("[data-row=forward]")===window.forwardWitness && !document.querySelector(".morph-ghost")'), 'The original instruction survives the fold; transient copies are cleaned up');
  await click(page, '#next'); await settled(page); await sleep(600);
  assert(await page.evaluate('openGarden.state.form===3 && openGarden.state.angle===113 && document.querySelector("#source").textContent.includes("garden length/2 angle remaining-1")'), 'The chosen turn is inherited by the recursive rule');
  await click(page, '#keep'); await click(page, '#begin'); await settled(page);
  assert(await page.evaluate('openGarden.state.form===0 && openGarden.state.angle===120 && openGarden.keeps[0].angle===113'), 'Beginning again preserves the kept discovery');
  await click(page, '#undo'); await settled(page);
  assert(await page.evaluate('openGarden.state.form===3 && openGarden.state.angle===113'), 'Undo can reverse a new beginning');
  await click(page, '#begin'); await click(page, '.kept-item > button'); await settled(page);
  assert(await page.evaluate('openGarden.state.form===3 && openGarden.state.angle===113'), 'A kept discovery restores its angle, form, and depth');
  const heldView = await page.evaluate('JSON.stringify(openGarden.view)');
  await mouseTurn(page, 137, false);
  assert(await page.evaluate(`openGarden.dragging && openGarden.state.angle===137 && JSON.stringify(openGarden.view)===${JSON.stringify(heldView)}`), 'Mouse drag edits the turn while the view remains still');
  const g = await turnGeometry(page);
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.x, y: g.y, button: 'left', clickCount: 1 }); await settled(page);
  assert(await page.evaluate('!openGarden.dragging && openGarden.state.angle===137'), 'Release commits the turn and fits its result');
  await mouseTurn(page, 60, false); await key(page, 'Escape'); await settled(page);
  assert(await page.evaluate('!openGarden.dragging && openGarden.state.angle===137'), 'Escape cancels a held turn without losing the previous choice');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g.x, y: g.y, button: 'left', clickCount: 1 });
  await click(page, '#trace'); await sleep(300);
  assert(await page.evaluate('openGarden.trace && openGarden.beats>0 && document.querySelectorAll(".is-lit").length>0'), 'Tracing reflects actual interpreter beats');
  assert(await page.evaluate(`[...document.querySelectorAll('.is-lit')].every(row=>document.querySelector('#executed').textContent.split(String.fromCharCode(10)).some(line=>line.trim()===row.textContent.trim()))`), 'Highlighted recipe rows are present in the actual executed source');
  await click(page, '#trace'); await settled(page); await sleep(750);
  assert(await page.evaluate('!openGarden.trace && !document.querySelector(".is-lit") && !document.querySelector("#executed").textContent.includes("wait ")'), 'Finish now cancels a trace and removes its pauses and highlights');
  await click(page, '[data-form="0"]'); await settled(page);
  await page.evaluate('document.querySelector("#handle").focus()');
  for (let i = 0; i < 72; i++) { await key(page, i % 2 ? 'ArrowRight' : 'ArrowLeft'); await settled(page); }
  assert(await page.evaluate('openGarden.state.angle===137 && document.querySelector("#fault").hidden'), 'Seventy-two successive edits survive renderer retirement without errors or lost input');
  await page.evaluate(`window.dispatchEvent(new MessageEvent('message',{source:document.querySelector('#runtime').contentWindow,origin:location.origin,data:{channel:'open-garden-stage',kind:'fault',id:openGarden.requestId-1,error:'stale'}}))`);
  assert(await page.evaluate('document.querySelector("#fault").hidden'), 'An obsolete runtime response cannot replace the current state');
  for (const angle of [0, 1, 60, 90, 110, 119, 120, 121, 137, 180, 240, 359, 360]) {
    await page.goto(`${base}?angle=${angle}&form=3&depth=4`, 400); await settled(page); await sleep(500);
    await pixels(page, `native-${angle}`);
    assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), `${angle}° does not introduce page-width overflow`);
  }
  await page.goto(`${base}?angle=110&form=3&depth=3`); await settled(page); await sleep(500); await shot(page, 'desktop-open');
  assert(page.console.filter((m) => ['error', 'exception', 'log-error'].includes(m.type)).length === 0, 'Desktop interactions produced no browser errors');

  await metrics(page, 390, 844, true); await page.s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 }); await sleep(300); await settled(page);
  await page.evaluate('window.scrollTo(0,0)');
  const touch = await turnGeometry(page);
  await page.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touch.x, y: touch.y, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.px - touch.radius, y: touch.py, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await settled(page);
  assert(await page.evaluate('openGarden.state.angle===180 && !openGarden.dragging'), 'A real touch gesture turns the handle on a phone');
  const cancelled = await turnGeometry(page);
  await page.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cancelled.x, y: cancelled.y, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cancelled.px, y: cancelled.py - cancelled.radius, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await settled(page);
  assert(await page.evaluate('openGarden.state.angle===180 && !openGarden.dragging'), 'A cancelled touch restores the prior turn');
  await page.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 28, y: 480, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 28, y: 380, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 28, y: 280, id: 1 }] });
  await page.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await sleep(400);
  assert(await page.evaluate('scrollY>0 && openGarden.state.angle===180'), 'Touch outside the dial scrolls the page without changing the rule');
  await page.evaluate('window.scrollTo(0,0)');
  for (const width of [320, 390, 700, 768]) {
    await metrics(page, width, 844, true); await sleep(200);
    for (let form = 0; form < 4; form++) {
      await click(page, `[data-form="${form}"]`); await settled(page); await sleep(600);
      assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), `Form ${form} contains its content at ${width}px`);
      assert(await page.evaluate(`(()=>{const h=document.querySelector('#handle').getBoundingClientRect();return h.left>=0 && h.right<=innerWidth && h.width>=44 && h.height>=44;})()`), `Form ${form} has a reachable 44px handle at ${width}px`);
    }
  }
  await metrics(page, 390, 844, true); await page.goto(`${base}?angle=137&form=3`); await settled(page); await sleep(500); await shot(page, 'phone-open');

  const reduced = await fresh(); await metrics(reduced);
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.goto(base);
  assert(await reduced.evaluate('!document.querySelector("#runtime").getAttribute("src") && !document.querySelector("#enable").hidden'), 'Reduced motion does not load the runtime before opt-in');
  await click(reduced, '#enable'); await settled(reduced);
  assert(await reduced.evaluate('document.querySelector("#trace").disabled && !document.querySelector("#executed").textContent.includes("wait ")'), 'Reduced-motion opt-in draws without animated tracing');
  const saved = await fresh(); await metrics(saved);
  await saved.s('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(navigator,"connection",{value:{saveData:true},configurable:true})' });
  await saved.goto(base);
  assert(await saved.evaluate('!document.querySelector("#runtime").getAttribute("src")'), 'Save-Data also waits for explicit opt-in');
  const blocked = await fresh(); await metrics(blocked);
  await blocked.s('Network.setBlockedURLs', { urls: ['*hatch-v1*'] }); await blocked.goto(base); await sleep(500);
  assert(await blocked.evaluate('!document.querySelector("#fault").hidden && !document.querySelector("#runtime").classList.contains("ready")'), 'A blocked runtime gives an honest error, not a substitute drawing');
  const nojs = await fresh(); await metrics(nojs);
  await nojs.s('Emulation.setScriptExecutionDisabled', { value: true }); await nojs.goto(base);
  await nojs.s('Emulation.setScriptExecutionDisabled', { value: false });
  assert(await nojs.evaluate('document.querySelector(".no-script")?.checkVisibility() && !document.querySelector(".field").checkVisibility() && document.querySelector("#source").textContent.includes("fw 240")'), 'Without JavaScript, the first rule and an honest explanation remain readable');
  writeFileSync(`${out}/report.json`, JSON.stringify({ passed: evidence.length, evidence }, null, 2));
  console.log(JSON.stringify({ passed: evidence.length, output: out }, null, 2));
} catch (error) {
  writeFileSync(`${out}/report.json`, JSON.stringify({ passed: evidence.length, evidence, error: error.message }, null, 2));
  throw error;
} finally {
  for (const page of pages) await page.s('Page.close').catch(() => {});
  cdp.close();
}

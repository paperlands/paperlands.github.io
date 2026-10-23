import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const out = process.env.PROBE_OUTPUT || '/tmp/morphology-evidence';
mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:8813/design/iterations/13-morphology.html';
const evidence = [];
const cdp = await connect();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function assert(condition, message) { if (!condition) throw new Error(message); evidence.push(message); }
async function settled(page) {
  const result = await page.evaluate(`new Promise(resolve => {
    const from = performance.now();
    const check = () => {
      const s = window.morphologyStudy;
      if (s?.walked || s?.lastMessage?.kind==='fault') return resolve({walked:s.walked,message:s.lastMessage});
      if(performance.now()-from>10000) return resolve({timeout:true,status:document.querySelector('#runtime-status')?.textContent});
      setTimeout(check,50);
    }; check();
  })`);
  if (!result.walked) throw new Error('Runtime did not settle: ' + JSON.stringify(result));
}
async function click(page, selector) { await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function shot(page, name, clip) {
  const result = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  const buffer = Buffer.from(result.data, 'base64');
  writeFileSync(`${out}/${name}.png`, buffer);
  return createHash('sha256').update(buffer).digest('hex');
}
async function metrics(page, width, height, mobile = false) {
  await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}
try {
  const page = await newPage(cdp);
  await metrics(page, 1440, 1050);
  await page.goto(base, 1800); await settled(page);
  assert(await page.evaluate('morphologyStudy.ready && morphologyStudy.artifact.startsWith("/assets/lib/hatch/")'), 'Uses the local pinned hatch, not a replacement renderer');
  for (let form = 0; form < 9; form++) {
    await click(page, `[data-form="${form}"]`);
    if (form === 6) {
      assert(await page.evaluate('document.querySelector("#trace").hidden===false && document.querySelector("#runtime").hidden && document.querySelector("#executed").textContent.startsWith("# NOT EXECUTED")'), 'Unguarded recursion is a labelled finite trace, never executed');
      assert(await page.evaluate(`(() => {
        const p=document.querySelector('#trace path').getAttribute('d').match(/[0-9.]+/g).map(Number);
        for(let i=2;i<p.length;i+=2){const distance=Math.hypot(p[i]-p[i-2],p[i+1]-p[i-1]);if(Math.abs(distance-520/2**(i/2-1))>.001)return false;}
        return true;
      })()`), 'The conceptual trace halves every successive edge');
    } else {
      await settled(page);
      assert(await page.evaluate('!document.querySelector("#runtime-status").textContent.includes("unavailable")'), `Canonical form ${form + 1} runs on Paperlang`);
    }
    assert(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `Form ${form + 1} has no page-width overflow`);
  }
  assert(await page.evaluate('document.querySelector("#source").textContent.includes(String.fromCharCode(10))'), 'Displayed source preserves copyable newlines');
  const noWait = await page.evaluate('!document.querySelector("#executed").textContent.includes("wait ")');
  assert(noWait, 'The live figure never inherits a slow replay timeline');
  await click(page, '[data-form="4"]'); await settled(page);
  await page.evaluate(`window.sizeWitness=document.querySelector('[data-key="size:0"]')`);
  await click(page, '[data-form="5"]'); await settled(page);
  assert(await page.evaluate(`window.sizeWitness===document.querySelector('[data-key="size:0"]')`), 'The size literal retains DOM identity as it moves from body to call');
  await click(page, '[data-form="8"]'); await settled(page);
  for (const depth of [0, 1, 3, 6]) {
    await click(page, `[data-depth="${depth}"]`); await settled(page);
    assert(await page.evaluate(`document.querySelector('[data-depth="${depth}"]').getAttribute('aria-pressed')==='true'`), `Non-drag control can select depth ${depth}`);
  }
  await page.s('Page.bringToFront');
  await page.evaluate(`document.querySelector('[data-depth="2"]').focus()`);
  await page.s('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
  await page.s('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await settled(page);
  assert(await page.evaluate(`document.querySelector('[data-depth="2"]').getAttribute('aria-pressed')==='true'`), 'A real Enter key can select depth without pointer input');
  await click(page, '[data-depth="0"]'); await settled(page); await sleep(350);
  const rect = await page.evaluate(`(() => {const r=document.querySelector('#runtime').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const clip = { x: rect.x, y: rect.y, width: rect.width, height: rect.height * .85, scale: 1 };
  const before = await shot(page, 'native-before', clip);
  const unit = rect.height / (1000 * Math.tan(Math.PI / 6));
  const x = rect.x + rect.width / 2 - 150 * unit;
  const y = rect.y + rect.height / 2 + 235 * unit;
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 12; step++) {
    await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 300 * unit * step / 12, y, button: 'left', buttons: 1 });
    await sleep(40);
  }
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 300 * unit, y, button: 'left', buttons: 0 });
  await sleep(800);
  const after = await shot(page, 'native-after', clip);
  assert(before !== after, 'Dragging the native X changes geometry above its control rail');
  assert(await page.evaluate('document.querySelector("[data-agency=breathe]").classList.contains("touched")'), 'The handoff responds to a native claimed drag');
  assert(await page.evaluate('[...document.querySelectorAll("[data-depth]")].every(b=>b.getAttribute("aria-pressed")==="false")'), 'Native dragging clears potentially stale selected-depth indicators');
  const quietRect = await page.evaluate(`(() => {const r=document.querySelector('#runtime').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  const stationaryBefore = await shot(page, 'stationary-before', quietRect);
  const blankX = quietRect.x + quietRect.width*.5;
  const blankY = quietRect.y + quietRect.height*.55;
  await page.s('Input.dispatchMouseEvent', {type:'mousePressed',x:blankX,y:blankY,button:'left',buttons:1,clickCount:1});
  await page.s('Input.dispatchMouseEvent', {type:'mouseMoved',x:blankX+70,y:blankY+35,button:'left',buttons:1});
  await page.s('Input.dispatchMouseEvent', {type:'mouseReleased',x:blankX+70,y:blankY+35,button:'left',buttons:0});
  await sleep(250);
  assert(stationaryBefore===await shot(page,'stationary-after',quietRect), 'Unclaimed live-canvas dragging does not move the camera');
  assert(await page.evaluate(`getComputedStyle(document.querySelector('#runtime').contentDocument.documentElement).colorScheme==='dark'`), 'The native viewport shares the dark colour scheme, with no white matte');
  await click(page, '[data-form="2"]'); await settled(page); await sleep(750);
  const id = await page.evaluate('morphologyStudy.requestId');
  for (const study of ['score', 'echo', 'garden']) {
    await click(page, `[data-study-link="${study}"]`); await sleep(250);
    assert(await page.evaluate(`morphologyStudy.study===${JSON.stringify(study)} && morphologyStudy.requestId===${id}`), `${study} treatment switches without restarting the native figure`);
    await shot(page, `${study}-loop`);
  }
  await click(page, '[data-study-link="echo"]');
  await click(page, '[data-form="1"]'); await settled(page);
  await click(page, '[data-form="2"]'); await sleep(180);
  assert(await page.evaluate(`Number(getComputedStyle(document.querySelector('#source-memory')).opacity)>0`), 'The afterimage retains an actual previous source arrangement during a rewrite');
  await shot(page,'echo-transition');
  await sleep(2200);
  assert(await page.evaluate(`Number(getComputedStyle(document.querySelector('#source-memory')).opacity)===0`), 'The afterimage withdraws instead of accumulating permanent visual noise');
  await click(page, '[data-form="1"]'); await settled(page); await sleep(750);
  await click(page, '[data-study-link="score"]');
  await click(page, '[data-form="2"]'); await sleep(220);
  await shot(page, 'score-contraction');
  await sleep(900);
  assert(await page.evaluate('document.querySelectorAll(".flying-token").length===0'), 'Rewrite ghosts are removed after contraction');
  await click(page, '[data-form="8"]'); await settled(page);
  await click(page, '[data-depth="5"]'); await settled(page); await sleep(350);
  await shot(page, 'score-live');
  const liveRect = await page.evaluate(`(() => {const r=document.querySelector('#runtime').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  await shot(page, 'score-live-figure', liveRect);
  for(const study of ['score','echo','garden']){
    await click(page,`[data-study-link="${study}"]`); await sleep(200);
    assert(await page.evaluate(`document.querySelector('#source-label').getBoundingClientRect().top>=document.querySelector('#study-intent').getBoundingClientRect().bottom`), `${study} live source does not collide with the introduction`);
    await shot(page,`${study}-live-layout`);
  }
  await click(page,'[data-study-link="score"]');
  // Cancellation / rapid reversal cannot allow an older completion to win.
  await click(page, '[data-form="1"]'); await settled(page);
  await click(page, '#replay'); await sleep(100); await click(page, '#replay');
  assert(await page.evaluate('document.querySelector("#runtime-status").textContent.startsWith("Stopped")'), 'Execution replay can be stopped deliberately');
  await page.evaluate(`for(const i of [8,2,6,7,0,8]) document.querySelector('[data-form="'+i+'"]').click()`);
  await settled(page);
  assert(await page.evaluate('morphologyStudy.state===8 && document.querySelector("#runtime-status").textContent.startsWith("Live")'), 'Rapid reversal settles on the newest source, not a stale completion');
  await metrics(page, 390, 844, true); await sleep(500);
  await shot(page, 'mobile-live-top');
  assert(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Live form stays within a 390px mobile viewport');
  await page.s('Emulation.setTouchEmulationEnabled', {enabled:true,maxTouchPoints:1});
  await click(page, '[data-depth="0"]'); await settled(page); await sleep(200);
  const touchRect = await page.evaluate(`(() => {const r=document.querySelector('#runtime').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const touchUnit = touchRect.height/(1000*Math.tan(Math.PI/6));
  const touchX = touchRect.x+touchRect.width/2-150*touchUnit;
  const touchY = touchRect.y+touchRect.height/2+235*touchUnit;
  const touchClip = {...touchRect,height:touchRect.height*.85,scale:1};
  const touchBefore = await shot(page,'touch-before',touchClip);
  await page.s('Input.dispatchTouchEvent', {type:'touchStart',touchPoints:[{x:touchX,y:touchY,id:1}]});
  for(let step=1;step<=8;step++){
    await page.s('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:touchX+250*touchUnit*step/8,y:touchY,id:1}]});
    await sleep(40);
  }
  await page.s('Input.dispatchTouchEvent', {type:'touchEnd',touchPoints:[]});
  await sleep(700);
  assert(touchBefore!==await shot(page,'touch-after',touchClip), 'A mobile horizontal touch drag changes native geometry');
  assert(await page.evaluate(`getComputedStyle(document.querySelector('#runtime').contentDocument.querySelector('canvas')).touchAction==='pan-y'`), 'The native canvas leaves vertical touch scrolling available');
  await page.evaluate('document.querySelector("#source").scrollIntoView({block:"start"})');
  await shot(page, 'mobile-live-source');
  const reduced = await newPage(cdp);
  await metrics(reduced, 390, 844, true);
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.goto(`${base}?study=echo&form=9`, 1400);
  assert(await reduced.evaluate('morphologyStudy.enabled===false && !document.querySelector("#runtime").getAttribute("src")'), 'Reduced motion does not automatically fetch the runtime');
  assert(!reduced.requests.some((url) => url.includes('/assets/lib/hatch/')), 'Reduced-motion first load requests no hatch bytes');
  await click(reduced, '#enable-runtime'); await settled(reduced);
  await click(reduced, '[data-form="2"]'); await settled(reduced);
  assert(await reduced.evaluate('document.getAnimations().length===0'), 'Explicit reduced-motion play works without rewrite animation');
  const economical = await newPage(cdp);
  await economical.s('Page.addScriptToEvaluateOnNewDocument', {source:`Object.defineProperty(navigator,'connection',{value:{saveData:true}})`});
  await economical.goto(base,1400);
  assert(await economical.evaluate(`!morphologyStudy.enabled && !document.querySelector('#runtime').getAttribute('src')`), 'Save-Data leaves the runtime unloaded until an explicit opt-in');
  const noScript = await newPage(cdp);
  await noScript.s('Emulation.setScriptExecutionDisabled', {value:true});
  await noScript.goto(base,1000);
  assert(await noScript.evaluate(`document.querySelector('#source').textContent.includes('fw 500') && document.querySelector('.no-script').getBoundingClientRect().height>0`), 'No-JavaScript retains the initial source and a complete-storyboard link');
  const blocked = await newPage(cdp);
  await metrics(blocked, 1000, 850);
  await blocked.s('Network.setBlockedURLs', { urls: ['*assets/lib/hatch/*'] });
  await blocked.goto(base, 1800);
  assert(await blocked.evaluate('document.querySelector("#runtime-status").textContent.includes("unavailable") && document.querySelectorAll(".source-line").length===2'), 'A blocked hatch leaves readable source and an honest failure message');
  const errors = [...page.console, ...reduced.console].filter((row) => ['exception','error','log-error'].includes(row.type));
  assert(errors.length === 0, 'Desktop, mobile, native drag and reduced-motion play have no console errors');
  writeFileSync(`${out}/report.json`, JSON.stringify({ passed: evidence.length, evidence, errors, output: out }, null, 2));
  console.log(JSON.stringify({ passed: evidence.length, evidence, output: out }, null, 2));
} finally { cdp.close(); }

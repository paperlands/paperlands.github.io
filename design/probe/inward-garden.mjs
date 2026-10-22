import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const out = process.env.PROBE_OUTPUT || '/tmp/inward-garden-evidence';
mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:8813/design/iterations/14-inward-garden.html';
const cdp = await connect();
const evidence = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function assert(ok, message) { if (!ok) throw new Error(message); evidence.push(message); }
async function click(page, selector) { await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); }
async function settled(page) {
  const result = await page.evaluate(`new Promise(resolve => {
    const start=performance.now(); const check=()=>{
      const g=window.inwardGarden;
      if(g?.completed || g?.lastMessage?.kind==='fault') return resolve({completed:g.completed,message:g.lastMessage});
      if(performance.now()-start>10000) return resolve({timeout:true});
      setTimeout(check,50);
    }; check();
  })`);
  if (!result.completed) throw new Error('Runtime failed: ' + JSON.stringify(result));
}
async function shot(page, name, clip) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  const bytes = Buffer.from(data, 'base64');
  writeFileSync(`${out}/${name}.png`, bytes);
  return createHash('sha256').update(bytes).digest('hex');
}
function sameDrawing(first, second) {
  // GPU layer promotion during source fades can change the background by
  // 1–2 RGB levels. Compare decoded pixels, not PNG hashes or metadata.
  const delta = Number(execFileSync('python3', ['-c', 'import sys; from PIL import Image,ImageChops; a=Image.open(sys.argv[1]).convert("RGB"); b=Image.open(sys.argv[2]).convert("RGB"); assert a.size==b.size; print(max(hi for lo,hi in ImageChops.difference(a,b).getextrema()))', `${out}/${first}.png`, `${out}/${second}.png`], { encoding: 'utf8' }));
  return delta <= 3;
}
async function metrics(page, width, height, mobile = false) {
  await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
}
try {
  const page = await newPage(cdp);
  await metrics(page, 1440, 900);
  await page.goto(base + '?form=1');
  await page.s('Page.bringToFront');
  await settled(page);
  await sleep(1400); await shot(page, 'desktop-seed');
  assert(await page.evaluate('inwardGarden.automatic'), 'Default progression runs automatically');
  await click(page, '#pause');
  const pausedState = await page.evaluate('inwardGarden.state');
  await sleep(4500);
  assert(await page.evaluate(`inwardGarden.state===${pausedState} && !inwardGarden.automatic`), 'Pause keeps the current form');
  let heldRequest, heldProgram;
  const figureClip = await page.evaluate(`(()=>{const r=document.querySelector('#runtime').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
  for (let i = 0; i < 7; i++) {
    await click(page, `[data-beat="${i}"]`); await settled(page); await sleep(1400);
    if (i===1) { heldRequest=await page.evaluate('inwardGarden.requestId'); heldProgram=await page.evaluate('document.querySelector("#executed").textContent'); await shot(page,'held-triangle',figureClip); }
    if (i>=2 && i<=4) {
      assert(await page.evaluate(`inwardGarden.requestId===${heldRequest}`), `Representation ${i+1} preserves the actual interpreter instance`);
      assert(await page.evaluate(`document.querySelector('#executed').textContent===${JSON.stringify(heldProgram)}`), `Representation ${i+1} keeps honest executed-source evidence`);
      await shot(page,`held-form-${i+1}`,figureClip);
      assert(sameDrawing('held-triangle',`held-form-${i+1}`), `Representation ${i+1} does not redraw or move the triangle`);
    }
    assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), `Form ${i + 1} fits the desktop width`);
    assert(await page.evaluate('document.documentElement.scrollHeight<=innerHeight'), `Form ${i + 1} fits the desktop screen`);
    if ([2, 5, 6].includes(i)) await shot(page, `desktop-form-${i + 1}`);
  }
  assert(await page.evaluate('document.querySelector("#source").textContent.includes("\\n")'), 'Source retains copyable newlines');
  assert(await page.evaluate('!document.querySelector("#executed").textContent.includes("wait ")'), 'Live figure has no replay delays');
  assert(await page.evaluate('document.querySelectorAll(".source-row").length===18 && [...document.querySelectorAll(".source-row")].every(row=>!row.hidden && row.checkVisibility()) && !document.querySelector("#unfold")'), 'The full rule, helpers, input constraints and depth calculation stay visible');
  assert(await page.evaluate('document.querySelector("#node-depth-calc .code").textContent.includes("snap(clamp(X.x+150), 50)/50")'), 'The actual X-to-depth calculation is shown, not merely asserted');
  assert(await page.evaluate('document.querySelector("#drag-cue").checkVisibility() && document.querySelector("#drag-cue").textContent.includes("drag X") && document.querySelector("#enter-play").classList.contains("active")'), 'Arrival at play has an active invitation and a visible drag affordance');
  await click(page, '#enter-play');
  assert(await page.evaluate('document.querySelector("#underneath").open && document.activeElement===document.querySelector("#depth")'), 'The active play invitation opens a working keyboard alternative');
  await page.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
  assert(await page.evaluate('!document.querySelector("#underneath").open && !document.querySelector("#depth").checkVisibility()'), 'Duplicate controls remain in the closed inspector');
  const beforeAnnotation = await page.evaluate('inwardGarden.requestId');
  await page.evaluate(`document.querySelector('#node-smaller .code').click()`); await sleep(450);
  assert(await page.evaluate('document.querySelector("#annotation").dataset.for==="smaller" && document.querySelector("#annotation").textContent.includes("½") && document.querySelector("#annotation").textContent.includes("one less step") && document.querySelector("#branches path[data-from=smaller][data-to=triangle]").classList.contains("is-focused")'), 'Recursion annotation connects half-length and one-less-step to the same rule');
  assert(await page.evaluate(`inwardGarden.requestId===${beforeAnnotation}`), 'Inspecting annotations does not restart the native figure');
  await shot(page, 'recursion-annotation');
  await page.evaluate(`document.querySelector('#node-guard .code').click()`);
  assert(await page.evaluate('document.querySelector("#annotation").textContent.includes("at zero, return")'), 'Guard annotation explains the stopping boundary');
  await page.evaluate(`document.querySelector('#source').dispatchEvent(new PointerEvent('pointerleave'))`);
  assert(await page.evaluate('[...document.querySelectorAll("#branches .flow")].every(path=>path.classList.contains("is-focused")) && document.querySelectorAll("#branches .flow").length===2'), 'The live invitation connects X to depth and depth to the drawing');
  assert(await page.evaluate('getComputedStyle(document.querySelector("#flow-tip path")).opacity==="1" && getComputedStyle(document.querySelector("#flow-tip path")).stroke!=="none"'), 'Causal arrows retain visible, coloured arrowheads');
  await click(page, '[data-beat="5"]'); await settled(page);
  const beatsBefore = await page.evaluate('inwardGarden.beatCount');
  await click(page, '#replay');
  const reflected = await page.evaluate(`new Promise(resolve=>{const start=performance.now(); const check=()=>{
    const g=inwardGarden, annotation=document.querySelector('#annotation');
    if(g.beatCount>${beatsBefore} && annotation.classList.contains('visible')) return resolve({ids:g.observedIds,lines:g.lastBeatLines,kind:annotation.dataset.kind});
    if(performance.now()-start>5000) return resolve(null); setTimeout(check,25);
  };check();})`);
  assert(reflected?.kind==='execution' && reflected.ids.length>0, 'Annotations reflect real execution without hiding any source');
  assert(await page.evaluate(`(()=>{const actual=inwardGarden.lastBeatLines.map(line=>document.querySelector('#executed').textContent.split('\\n')[line-1]?.trim());return [...document.querySelectorAll('.is-lit .code')].every(code=>actual.includes(code.textContent.trim()));})()`), 'Every execution highlight corresponds to a source line in the real beat');
  assert(await page.evaluate(`(()=>{
    const program=document.querySelector('#executed').textContent.split('\\n'), map=new Map(); let cursor=0;
    for(const row of document.querySelectorAll('.source-row')) { const at=program.findIndex((line,index)=>index>=cursor && line.trim()===row.querySelector('.code').textContent.trim()); if(at<0)return false; map.set(at+1,row.dataset.node); cursor=at+1; }
    const expected=[...new Set(inwardGarden.lastBeatLines.map(line=>map.get(line)).filter(Boolean))].sort();
    return JSON.stringify(expected)===JSON.stringify(inwardGarden.observedIds.slice().sort());
  })()`), 'Reflection honours the entire observed beat, not just its final line');
  await shot(page, 'execution-witness');
  await settled(page); await sleep(1600);
  assert(await page.evaluate('document.querySelectorAll(".is-lit").length===0 && !document.querySelector("#annotation").classList.contains("visible")'), 'Execution embers settle after the drawing ends');
  const beforeStale = await page.evaluate('inwardGarden.beatCount');
  await page.evaluate(`window.dispatchEvent(new MessageEvent('message',{source:document.querySelector('#runtime').contentWindow,origin:location.origin,data:{channel:'morphology-stage',kind:'beat',id:inwardGarden.requestId-1,beat:{line:1,lines:[1]}}}))`);
  assert(await page.evaluate(`inwardGarden.beatCount===${beforeStale}`), 'Stale performances cannot rekindle the current source');
  await click(page, '[data-beat="6"]'); await settled(page);
  for (const depth of [0, 3, 6]) {
    await page.evaluate(`(()=>{const input=document.querySelector('#depth'); input.value=${depth}; input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
    await sleep(100); await settled(page);
    assert(await page.evaluate(`document.querySelector('#executed').textContent.includes('jmpto ${depth * 50 - 150} -235')`), `Alternate control selects bounded depth ${depth}`);
  }
  await page.evaluate(`document.querySelector('#depth').value=0; document.querySelector('#depth').dispatchEvent(new Event('input',{bubbles:true}));`);
  await sleep(100); await settled(page); await sleep(500);
  const rect = await page.evaluate(`(()=>{const r=document.querySelector('#runtime').getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height};})()`);
  const clip = { ...rect, height: rect.height * .85, scale: 1 };
  const before = await shot(page, 'native-before', clip);
  const unit = rect.height / (1000 * Math.tan(Math.PI / 6));
  const x = rect.x + rect.width / 2 - 150 * unit;
  const y = rect.y + rect.height / 2 + 235 * unit;
  await page.s('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 12; i++) {
    await page.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 300 * unit * i / 12, y, button: 'left', buttons: 1 });
    await sleep(40);
  }
  await sleep(400);
  assert(await page.evaluate('inwardGarden.dragging && document.querySelector(".garden").dataset.lens==="hand" && document.querySelector("#drag-cue").textContent==="X → depth → drawing"'), 'A native drag gives immediate, sustained causal feedback');
  assert(await page.evaluate('["point","depth-calc","live"].every(id=>document.querySelector(`#node-${id}`).classList.contains("is-related")) && Number(getComputedStyle(document.querySelector("#node-forward")).opacity)<.5'), 'Dragging brings the causal chain forward and fades unrelated code');
  assert(await page.evaluate('getComputedStyle(document.querySelector("#node-point .tok-input")).color!==getComputedStyle(document.querySelector("#node-depth-calc .tok-depth")).color'), 'Input and derived depth have distinct semantic colours');
  assert(await page.evaluate('getComputedStyle(document.querySelector("#node-triangle [data-token=step]")).color===getComputedStyle(document.querySelector("#node-live .tok-depth")).color'), 'Depth and the rule’s step parameter share a colour, making argument binding visible');
  assert(await page.evaluate('document.documentElement.dataset.phase==="play" && document.querySelector("#enter-play").getAttribute("aria-pressed")==="true"'), 'Play with remains active while the hand is exploring');
  await shot(page, 'native-during');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 300 * unit, y, button: 'left', buttons: 0 });
  await sleep(700);
  assert(before !== await shot(page, 'native-after', clip), 'Dragging native X changes the actual drawing');
  assert(await page.evaluate('document.documentElement.dataset.phase==="breathe"'), 'Native play breathes the invitation to life');
  assert(await page.evaluate('inwardGarden.nativeInput && document.querySelector("#depth-value").value==="—"'), 'Native input clears the unobserved numeric depth instead of guessing it');
  await page.evaluate(`document.querySelector('#underneath summary').focus()`);
  await page.s('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
  await page.s('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await sleep(100);
  assert(await page.evaluate('document.querySelector("#underneath").open'), 'Inspector is keyboard accessible');
  await page.evaluate(`document.querySelector('#depth').focus()`);
  await page.s('Input.dispatchKeyEvent', {type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await page.s('Input.dispatchKeyEvent', {type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await sleep(150); await settled(page);
  assert(await page.evaluate('document.querySelector("#depth").value==="1" && document.querySelector("#depth-value").value==="1" && !inwardGarden.nativeInput'), 'Arrow keys set a new, explicit depth input');
  await page.s('Input.dispatchKeyEvent', {type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await page.s('Input.dispatchKeyEvent', {type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert(await page.evaluate('!document.querySelector("#underneath").open && document.activeElement===document.querySelector("#underneath summary")'), 'Escape closes the inspector and restores keyboard focus');
  await metrics(page, 390, 844, true);
  for (const i of [0, 4, 5, 6]) {
    await click(page, `[data-beat="${i}"]`); await settled(page); await sleep(1500);
    await shot(page, `mobile-form-${i + 1}`);
    assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'), `Form ${i + 1} fits mobile width`);
    assert(await page.evaluate('innerWidth===390 && innerHeight===844'), `Form ${i + 1} does not expand the mobile viewport`);
    const geometry = await page.evaluate(`(()=>{const source=document.querySelector('#source').getBoundingClientRect(), floor=document.querySelector('.floor').getBoundingClientRect(), verb=document.querySelector('.invitation').getBoundingClientRect();return {sourceBottom:source.bottom,floorTop:floor.top,verbTop:verb.top,height:innerHeight,scroll:document.documentElement.scrollHeight};})()`);
    assert(geometry.sourceBottom <= geometry.verbTop + 1, `Form ${i + 1} source does not overlap the invitation on mobile: ${JSON.stringify(geometry)}`);
    assert(geometry.scroll <= geometry.height, `Form ${i + 1} fits mobile screen`);
  }
  for (const [width, height] of [[375, 667], [320, 700], [768, 1024]]) {
    await metrics(page, width, height, width < 650);
    await click(page, '[data-beat="6"]'); await settled(page); await sleep(1500);
    assert(await page.evaluate('document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight'), `Live form fits ${width} × ${height}`);
    assert(await page.evaluate(`innerWidth===${width} && innerHeight===${height}`), `Viewport stays ${width} × ${height}`);
    assert(await page.evaluate('(()=>{const cue=document.querySelector("#drag-cue").getBoundingClientRect(), source=document.querySelector("#source").getBoundingClientRect(); return cue.bottom+2<=source.top || cue.right+2<=source.left || cue.left>=source.right+2;})()'), `Drag feedback does not collide with source at ${width} × ${height}`);
    assert(await page.evaluate('document.querySelector("#source").getBoundingClientRect().bottom <= document.querySelector(".invitation").getBoundingClientRect().top'), `Source and invitation remain separate at ${width} × ${height}`);
    await shot(page, `live-${width}-${height}`);
  }
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.goto(base);
  assert(await page.evaluate('!inwardGarden.enabled && !inwardGarden.automatic && inwardGarden.state===6 && !document.querySelector("#runtime").getAttribute("src")'), 'Reduced motion starts at the handoff without loading or autoplaying');
  await shot(page, 'reduced-motion');
  await click(page, '#enable'); await settled(page);
  assert(await page.evaluate('inwardGarden.enabled && !inwardGarden.automatic'), 'Reduced-motion live drawing is opt-in and stays still');
  await page.s('Emulation.setEmulatedMedia', { features: [] });
  await page.s('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(navigator,"connection",{value:{saveData:true},configurable:true})' });
  await page.goto(base);
  assert(await page.evaluate('!inwardGarden.enabled && !document.querySelector("#runtime").getAttribute("src")'), 'Save-data does not load the drawing runtime');
  assert(!page.console.some((event) => ['exception', 'log-error', 'error'].includes(event.type)), 'No browser exceptions or resource errors');
  // Separate fresh page, real clock: every phase advances exactly once, then rests.
  const auto = await newPage(cdp);
  await metrics(auto, 1440, 900);
  await auto.goto(base); await auto.s('Page.bringToFront');
  const sequence = await auto.evaluate(`new Promise(resolve=>{
    const seen=[], start=performance.now(); const check=()=>{
      const g=window.inwardGarden;
      if(g && seen.at(-1)!==g.state) seen.push(g.state);
      if(g?.state===6 && g.completed) return resolve(seen);
      if(performance.now()-start>60000) return resolve({timeout:true,seen,last:g?.lastMessage});
      setTimeout(check,100);
    }; check();
  })`);
  assert(JSON.stringify(sequence) === '[0,1,2,3,4,5,6]', 'Real-clock progression unfolds all seven forms in order');
  await sleep(6500);
  assert(await auto.evaluate('inwardGarden.state===6 && document.querySelector("#pause").disabled'), 'Automatic progression rests at play instead of looping away');
  await shot(auto, 'automatic-handoff');
  assert(!auto.console.some((event) => ['exception', 'log-error', 'error'].includes(event.type)), 'Autoplay produces no browser errors');
  writeFileSync(`${out}/report.json`, JSON.stringify({ evidence, sequence }, null, 2));
  console.log(JSON.stringify({ evidence, out }, null, 2));
} finally { cdp.close(); }

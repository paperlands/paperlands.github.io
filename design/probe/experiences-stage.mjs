// BASE_URL=http://127.0.0.1:4001 node design/probe/experiences-stage.mjs
// The stage keeps its own slow clock; scroll adds speed, never position. A
// reduced-motion, forced-colour or Save-Data page is the authored still, and
// the clock stops whenever the overture leaves the viewport.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connect, newPage } from './cdp.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:4012';
const cdp = await connect(), page = await newPage(cdp);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
// The pose is split out so the probe can compare a turn over time, not just
// whether a transform string changed.
const state = () => page.evaluate(`(() => {
  const c=document.querySelector('[data-stage-arcs]'), p=document.querySelector('[data-stage-torus]');
  const t=p.style.transform||'';
  const m=/translate3d\\(([-\\d.]+)px,\\s*([-\\d.]+)px,[^)]*\\)\\s*rotate\\(([-\\d.]+)deg\\)/.exec(t);
  return { motion: document.querySelector('.experiences-overture').dataset.stageState,
    strokes: window.stageStrokes, pixels: c.toDataURL(),
    source:p.querySelector('img').currentSrc, transform:t,
    x:m?+m[1]:0, y:m?+m[2]:0, angle:m?+m[3]:0,
    pause:!!document.querySelector('[data-stage-motion]') };
})()`);
async function shot(name) {
  const {data}=await page.s('Page.captureScreenshot',{format:'png'});
  await writeFile(`/tmp/experiences-stage-${name}.png`,Buffer.from(data,'base64'));
}
async function scroll(y) {
  await page.evaluate(`scrollTo({top:${y},behavior:'instant'})`); await wait(180);
}
try {
  await page.s('Network.setCacheDisabled', {cacheDisabled:true});
  await page.s('Network.setBypassServiceWorker', {bypass:true});
  await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`
    window.stageStrokes=0;
    const stroke=CanvasRenderingContext2D.prototype.stroke;
    CanvasRenderingContext2D.prototype.stroke=function(...args) {
      if(this.canvas.hasAttribute('data-stage-arcs')) window.stageStrokes++;
      return stroke.apply(this,args);
    };`});
  await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await page.goto(`${base}/experiences.html`,1200);
  await page.evaluate('document.fonts.ready'); await wait(350);
  // The picture keeps moving; diagnostic state and the live-class activation do
  // not. Observe actual DOM mutations, not merely calls to our style helpers.
  await page.evaluate(`(() => {
    window.stageAttributeWrites = 0;
    window.stageObserver = new MutationObserver(records => { window.stageAttributeWrites += records.length; });
    stageObserver.observe(document.querySelector('.experiences-overture'), {attributes:true, attributeFilter:['data-stage-state']});
    stageObserver.observe(document.querySelector('.experiences-arcs'), {attributes:true, attributeFilter:['class']});
  })()`);
  let a=await state(); await wait(450); let b=await state();
  assert.equal(a.motion,'moving'); assert.equal(a.pause,false);
  assert.ok(b.strokes>a.strokes,'the idle clock keeps the arcs alive');
  assert.notEqual(a.pixels,b.pixels,'the idle clock moves the arcs');
  assert.notEqual(a.angle,b.angle,'the idle clock orbits the torus');
  assert.equal(await page.evaluate('stageObserver.disconnect(); window.stageAttributeWrites'), 0,
    'steady motion does not rewrite unchanged stage attributes');
  const idle=Math.abs(b.angle-a.angle);
  const start=a;
  await shot('1440-rest');

  // A gesture is added speed, not a new pose: over the same window the figure
  // turns further than the idle clock alone would take it.
  await page.evaluate(`scrollTo({top:400,behavior:'instant'})`); await wait(60);
  a=await state(); await wait(450); b=await state();
  const hurried=Math.abs(b.angle-a.angle);
  assert.ok(hurried>idle*2,`scroll hurries the orbit (${hurried.toFixed(2)}° vs ${idle.toFixed(2)}° idle)`);
  assert.notEqual(a.pixels,b.pixels,'scroll advances world-2 arc pixels');
  assert.equal(start.source,b.source,'the authored full torus stays intact');
  await shot('1440-orbit');

  // Position retraces with the hero; the clock does not run backwards.
  await scroll(0); b=await state();
  assert.ok(Math.abs(b.x)<1&&Math.abs(b.y)<1,'the orbit returns to its authored place');
  assert.notEqual(b.angle,start.angle,'scrolling back does not rewind the clock');

  await page.evaluate(`document.getElementById('planning').scrollIntoView({behavior:'instant'})`);
  await wait(200); a=await state(); await wait(350); b=await state();
  assert.equal(a.motion,'offscreen'); assert.equal(a.strokes,b.strokes,'the clock stops offscreen');
  await scroll(0);

  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await wait(200); a=await state(); await scroll(180); b=await state();
  assert.equal(b.motion,'still'); assert.equal(b.transform,'');
  assert.equal(a.pixels,b.pixels,'reduced motion retains a fixed world-2 still');
  assert.equal(a.strokes,b.strokes,'reduced-motion scrolling does not repaint');
  for(const width of [390,320]) {
    await page.s('Emulation.setDeviceMetricsOverride',{width,height:844,deviceScaleFactor:2,mobile:true});
    await page.goto(`${base}/experiences.html`,700);
    assert.ok(await page.evaluate(`document.documentElement.scrollWidth<=innerWidth`));
    await shot(`${width}-still`);
  }
  const requests=page.requests.length;
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await scroll(0); a=await state(); await scroll(100); b=await state();
  assert.notEqual(a.transform,b.transform,'mobile orbit responds to scroll');
  assert.deepEqual(page.requests.slice(requests).filter(url=>url.includes('/ink/creators-')),[], 'orbit fetches no animation frames');
  await shot('320-orbit');

  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto(`${base}/tjc.html`,1200);
  // That page draws on its own clock; give it a beat rather than race the load.
  const world2 = () => page.evaluate(`(() => {
    const c=document.querySelector('canvas[data-world="2"]');
    return !!c && c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
  })()`);
  for (let i=0;i<10&&!(await world2());i++) await wait(300);
  assert.ok(await world2(),'original Twilight world 2 still paints');
  await page.s('Emulation.setScriptExecutionDisabled',{value:true});
  await page.goto(`${base}/experiences.html`,700);
  assert.equal(await page.evaluate(`document.querySelectorAll('.experiences-arcs svg path').length`),8);
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.experiences-arcs svg')).visibility`),'visible');
  assert.equal(await page.evaluate(`!!document.querySelector('[data-stage-motion]')`),false);
  await shot('no-js');
  await page.s('Emulation.setScriptExecutionDisabled',{value:false});
  assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
  assert.deepEqual([...page.responses].filter(([url,status])=>url.startsWith(base)&&status>=400&&url.includes('/assets/js/')),[]);
  console.log(JSON.stringify({passed:true,checks:['slow idle orbit','scroll adds speed','position retraces, clock does not','no pause button','offscreen stop','reduced motion','320/390 responsive','no extra ink fetches','Twilight world 2','no JS']},null,2));
} finally { await page.s('Page.close'); cdp.close(); }

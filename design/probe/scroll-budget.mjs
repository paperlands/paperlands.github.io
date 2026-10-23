// Native gestures + warmed figures: a cold all-the-way-down sweep alone misses
// the old failure, because its expensive canvas appears only after scrolling.
// CDP_PORT=9241 BASE=http://localhost:4001 BEFORE=http://localhost:4003 node design/probe/scroll-budget.mjs
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const base = process.env.BASE || 'http://127.0.0.1:4001';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-scroll-budget';
mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cdp = await connect(), page = await newPage(cdp);
await page.s('Performance.enable');
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__budget={recording:false,frames:[],tasks:[],callbacks:[],reads:[],decodes:0,maxDecodes:0};
  const b=window.__budget,raf=requestAnimationFrame.bind(window);let previous=0;
  function monitor(t){if(b.recording&&previous)b.frames.push(t-previous);previous=t;raf(monitor)}raf(monitor);
  window.requestAnimationFrame=cb=>raf(t=>{const start=performance.now();try{cb(t)}finally{if(b.recording)b.callbacks.push({name:cb.name,ms:performance.now()-start})}});
  const rect=Element.prototype.getBoundingClientRect;Element.prototype.getBoundingClientRect=function(){
    if(b.recording){const stack=new Error().stack;if(/scroll-scrub|helios-focus|scroll-clock/.test(stack))b.reads.push(stack)}return rect.call(this)};
  const decode=HTMLImageElement.prototype.decode;HTMLImageElement.prototype.decode=function(){b.decodes++;b.maxDecodes=Math.max(b.maxDecodes,b.decodes);return decode.call(this).finally(()=>b.decodes--)};
  new PerformanceObserver(l=>{if(b.recording)b.tasks.push(...l.getEntries().map(e=>e.duration))}).observe({type:'longtask'});
` });
const reports = [];
async function shoot(name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function jump(selector, progress) {
  await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top+r.height*${progress}-innerHeight*.72,behavior:'instant'})})()`);
  await wait(700);
}
async function readInk() {
  return page.evaluate(`Array.from(document.querySelectorAll('[data-scroll-scrub]')).map(root=>({
    name:root.dataset.inkScene,key:root.dataset.inkFrame,
    src:root.querySelector('[data-scrub-ink] img')?.currentSrc,
    ready:!!root.querySelector('[data-scrub-ink] img')?.naturalWidth,
    canvases:root.querySelectorAll('canvas').length,
    filter:root.querySelector('[data-scrub-ink]')&&getComputedStyle(root.querySelector('[data-scrub-ink]')).filter,
    rect:root.getBoundingClientRect().toJSON(),
  }))`);
}

async function nativeSweep(direction) {
  const viewport=await page.evaluate('({width:innerWidth,height:innerHeight})');
  await page.evaluate(`scrollTo({top:${direction===1?0:99999},behavior:'instant'})`);await wait(150);
  let reached=false;
  for(let notch=0;notch<40;notch++) {
    const before=await page.evaluate('({y:scrollY,max:document.documentElement.scrollHeight-innerHeight})');
    if(direction===1?before.y>=before.max-3:before.y<=3){reached=true;break}
    await page.s('Input.dispatchMouseEvent',{type:'mouseWheel',x:Math.round(viewport.width*.5),y:Math.round(viewport.height*.35),deltaX:0,deltaY:direction*200});
    await wait(90);
    const after=await page.evaluate('scrollY');
    assert.ok((after-before.y)*direction>=-8,'no reversal against the native wheel');
  }
  assert.ok(reached,'stationary-pointer wheel reaches the '+(direction===1?'bottom':'top'));
}
try {
  for (const [name, width, height, rate] of [['desktop',1440,900,1],['phone-4x',390,844,4]]) {
    for (const [revision, url] of [...(process.env.BEFORE ? [['before',process.env.BEFORE]] : []), ['after',base]]) {
      await page.s('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:width<850 });
      await page.s('Emulation.setCPUThrottlingRate', { rate });
      await page.goto(url, 2300); await page.evaluate('document.fonts.ready');
      await jump('.helios-create', .25); await wait(revision==='before'?1600:400);
      await shoot(`${revision}-${name}-creators`);
      const before=Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      await page.evaluate('window.__budget.recording=true');
      for(const distance of [-250,250]) {
        await page.s('Input.synthesizeScrollGesture',{x:Math.round(width*.7),y:Math.round(height*.55),yDistance:distance,speed:400,gestureSourceType:'mouse'});
        await wait(200);
      }
      const samples=await page.evaluate('window.__budget.recording=false;window.__budget');
      const after=Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const values=[...samples.frames].sort((a,b)=>a-b),pct=p=>values[Math.floor(values.length*p)]||0;
      const scripts=samples.callbacks.filter(c=>c.name==='paint').map(c=>c.ms).sort((a,b)=>a-b);
      const report={revision,name,frames:values.length,p50:pct(.5),p95:pct(.95),max:Math.max(0,...values),
        paintP95:scripts[Math.floor(scripts.length*.95)]||0,longTasks:samples.tasks,
        hotGeometryReads:samples.reads.length,maxConcurrentDecodes:samples.maxDecodes,
        runtimeRequests:page.requests.filter(request=>request.startsWith(url)&&/\/assets\/lib\/hatch\/.*\.mjs/.test(request)).length,
        totals:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,after[k]-before[k]]))};
      reports.push(report);console.log(JSON.stringify(report));
      writeFileSync(`${out}/${revision}-${name}.json`,JSON.stringify(samples,null,2));
      if(revision==='after') {
        assert.equal(samples.reads.length,0,'no geometry reads in a settled scrolling scene');
        assert.equal(report.runtimeRequests,0,'no visitor-side host module');
        assert.ok(report.paintP95<8,'bounded paint callback even at 4x CPU throttling');
        assert.ok(samples.maxDecodes<=2,'bounded concurrent decode work');
        assert.ok((await readInk()).every(ink=>ink.canvases===0&&ink.filter==='none'),'no live runtime or canvas filters');
        await jump('.helios-create',.65); const grown=await readInk(); await shoot(`after-${name}-grown`);
        await jump('.helios-create',.15); const reversed=await readInk();
        assert.notEqual(grown[1].src,reversed[1].src,'reverse scroll selects the shallower source-derived figure');
        await jump('.helios-plate',.5); await shoot(`after-${name}-inquiry`);
        assert.ok((await readInk()).every(ink=>ink.ready),'complete ink survives gesture reversal');
        assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no horizontal overflow');
      }
    }
  }
  await page.s('Emulation.setCPUThrottlingRate',{rate:1});
  await nativeSweep(1);await nativeSweep(-1);
  await page.s('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  // Chromium's synthetic touch-scroll command can acknowledge without moving
  // in headless mode. Dispatch an actual finger sequence, not a JS scrollTo.
  await page.s('Page.bringToFront');
  await page.s('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:270,y:650}]});
  for(let step=1;step<=20;step++) {
    await page.s('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:270,y:650-step*20}]});
    await wait(16);
  }
  await page.s('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await wait(250);
  assert.ok(await page.evaluate('scrollY>300'),'native phone swipe moves the document');
  await page.s('Emulation.setTouchEmulationEnabled',{enabled:false});
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto(base,1200);await jump('.helios-create',.4);
  assert.ok(await page.evaluate(`Array.from(document.querySelectorAll('[data-scroll-scrub]')).every(root=>{
    const data=JSON.parse(root.querySelector('[data-scrub-frames]').textContent),src=root.querySelector('[data-scrub-ink] img').currentSrc;
    return src.endsWith(data.layouts.narrow.frames.settled);
  })`),'reduced motion uses the programme as written');
  await shoot('reduced-motion-phone');
  await page.s('Emulation.setEmulatedMedia',{features:[]});
  const { identifier: saver } = await page.s('Page.addScriptToEvaluateOnNewDocument', { source:
    `if(navigator.connection)Object.defineProperty(navigator.connection,'saveData',{get:()=>true})` });
  await page.goto(base,1200);await jump('.helios-create',.4);
  assert.ok(await page.evaluate(`Array.from(document.querySelectorAll('[data-scroll-scrub]')).every(root=>{
    const data=JSON.parse(root.querySelector('[data-scrub-frames]').textContent);
    return root.querySelector('[data-scrub-ink] img').currentSrc.endsWith(data.layouts.narrow.frames.settled);
  })`),'Save-Data uses only settled ink, no growth catalogue');
  await page.s('Page.removeScriptToEvaluateOnNewDocument',{identifier:saver});
  const shallow=await page.evaluate(`JSON.parse(document.querySelector('.helios-create [data-scrub-frames]').textContent).layouts.narrow.frames['1']`);
  await page.s('Network.setCacheDisabled',{cacheDisabled:true});
  await page.s('Network.setBlockedURLs',{urls:[new URL(shallow,base).href]});
  await page.goto(base,1200);await jump('.helios-create',0);
  const fallback=await readInk();
  assert.ok(fallback[1].ready&&!fallback[1].src.endsWith(shallow),'a failed growth asset preserves the complete fallback');
  await page.s('Network.setBlockedURLs',{urls:[]});
  await page.evaluate("dispatchEvent(new Event('online'))");await wait(700);
  assert.ok((await readInk())[1].src.endsWith(shallow),'connection recovery retries the current depth');
  await page.s('Network.setCacheDisabled',{cacheDisabled:false});
  // Reflow invalidates geometry and switches aspect assets without a reload.
  await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await jump('.helios-create',.4);
  assert.ok((await readInk())[1].src.includes('-wide-'),'existing page switches to desktop ink');
  await page.s('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await jump('.helios-create',.4);
  assert.ok((await readInk())[1].src.includes('-narrow-'),'existing page switches back to phone ink');
  for(const [width,height,mobile] of [[2560,900,false],[320,640,true],[390,844,true]]) {
    await page.s('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
    await jump('.helios-create',.4);
    assert.ok(await page.evaluate(`Array.from(document.querySelectorAll('[data-scrub-ink] img')).every(image=>{
      const style=getComputedStyle(image);
      return Math.abs(parseFloat(style.width)/parseFloat(style.height)-image.naturalWidth/image.naturalHeight)<.005;
    })`),'responsive ink preserves geometry instead of stretching circles');
    assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'responsive ink stays within the document');
  }
  // Static ink is real progressive enhancement, not a blank canvas without JS.
  await page.s('Emulation.setScriptExecutionDisabled',{value:true});
  await page.goto(base,1200);await jump('.helios-create',.4);
  assert.ok((await readInk()).every(ink=>ink.ready&&ink.canvases===0),'no-JS keeps the authored still and story');
  await shoot('no-js-phone');await page.s('Emulation.setScriptExecutionDisabled',{value:false});
  writeFileSync(`${out}/report.json`,JSON.stringify(reports,null,2));
  console.log('Scroll budget and progressive enhancement hold.');
} finally {
  await page.s('Emulation.setCPUThrottlingRate',{rate:1});
  await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId});cdp.close();
}

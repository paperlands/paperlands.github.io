// First causal fork: one pinned video alone versus the shipped stationary hero.
// Requires a frozen site, media-serve.py, an isolated CDP browser, and
// design/probe/bare-lab.html copied to the frozen serving root:
//   cp design/probe/bare-lab.html /tmp/helios-hotpaths/site/
// Timing trials are untraced; separate traced windows expose compositor work.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
import { statistics as stats, summarizeRenderTrace as traceSummary, finishTrace } from './render-window.mjs';
const base = process.env.BASE || 'http://127.0.0.1:4004';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-hotpaths/phase1';
const repeats = Number(process.env.REPEATS || 4), windowMs = Number(process.env.WINDOW_MS || 3000);
const arms = (process.env.ARMS || 'bare,shipped').split(',');
assert.ok(arms.every(arm => ['bare','shipped','no-grade','static-landscape','static-no-grain','static-no-landscape','static-no-wordmark','static-no-scrim'].includes(arm)));
mkdirSync(out, { recursive: true });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cdp = await connect(), page = await newPage(cdp), reports = [];
const metrics = async () => Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
await page.s('Network.setBypassServiceWorker', { bypass: true });
await page.s('Network.setCacheDisabled', { cacheDisabled: true });
await page.s('Performance.enable');
await page.s('Emulation.setDeviceMetricsOverride', { width:1440, height:900, deviceScaleFactor:1, mobile:false });
await page.s('Emulation.setCPUThrottlingRate', { rate:1 });
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
  // Prevent natural ended/carousel changes during this steady-state experiment.
  const loop = () => document.querySelectorAll('video').forEach(v => v.loop = true);
  const observer = new MutationObserver(loop); observer.observe(document, {childList:true,subtree:true});
  addEventListener('DOMContentLoaded', () => { loop(); observer.disconnect(); }, {once:true});
  const b = window.__hot = {recording:false,raf:[],frames:[],tasks:[],previous:0};
  function monitor(t) { if(b.recording&&b.previous)b.raf.push(t-b.previous);b.previous=b.recording?t:0;requestAnimationFrame(monitor) } requestAnimationFrame(monitor);
  new PerformanceObserver(list => { if(b.recording)b.tasks.push(...list.getEntries().map(e=>e.duration)) }).observe({type:'longtask'});
` });
async function injectCSS(css) {
  await page.evaluate(`(()=>{const style=document.createElement('style');style.textContent=${JSON.stringify(css)};document.head.append(style)})()`);
}
const stopTrace = () => finishTrace(cdp);
let layers=[];
cdp.on(message=>{if(message.sessionId===page.sessionId&&message.method==='LayerTree.layerTreeDidChange')layers=message.params.layers||[]});
async function describeLayers() {
  const {root}=await page.s('DOM.getDocument',{depth:-1,pierce:true}),nodes={};
  function visit(node,parent=''){
    const attrs=node.attributes||[],get=name=>{const i=attrs.indexOf(name);return i<0?'':attrs[i+1]};
    const label=node.pseudoType?parent+'::'+node.pseudoType:node.nodeName+(get('id')?'#'+get('id'):'')+(get('class')?'.'+get('class').trim().replace(/\s+/g,'.'):'');
    nodes[node.backendNodeId]=label;
    for(const child of [...node.children||[],...node.pseudoElements||[],...node.shadowRoots||[]])visit(child,label);
  }
  visit(root);
  const described=[];
  for(const layer of layers) {
    let reasons={};try{reasons=await page.s('LayerTree.compositingReasons',{layerId:layer.layerId})}catch{}
    described.push({...layer,node:nodes[layer.backendNodeId],...reasons});
  }
  return {nodes,layers:described};
}
let pinned;
async function prepare(arm) {
  const offset=page.console.length;
  await page.goto(base+(arm==='bare'?'/bare-lab.html':'/'),2500);
  if(arm==='bare') {
    await page.evaluate(`(()=>{const v=document.querySelector('#bare');if(!v)throw new Error('missing bare-lab.html fixture');
      Object.assign(v.style,{left:'${pinned.rect.x}px',top:'${pinned.rect.y}px',width:'${pinned.rect.width}px',height:'${pinned.rect.height}px',objectFit:${JSON.stringify(pinned.fit)},objectPosition:${JSON.stringify(pinned.position)}});
      v.src=${JSON.stringify(pinned.src)};v.load();window.__video=v;})()`);
    await page.evaluate(`new Promise((resolve,reject)=>{if(__video.readyState>=2)return resolve();__video.addEventListener('loadeddata',resolve,{once:true});setTimeout(()=>reject(new Error('bare video load timeout')),7000)})`);
  } else {
    await page.evaluate('document.fonts.ready');
    await page.evaluate(`window.__video=document.querySelector('.helios-hero [data-media-active]');document.querySelectorAll('video').forEach(v=>{if(v!==__video){v.pause();v.play=()=>Promise.resolve()}})`);
  }
  if(arm.startsWith('static-'))await injectCSS('@layer components{body[data-look="helios"] .helios-landscape .helios-possibility__stage::before,body[data-look="helios"] .helios-landscape .helios-possibilities::before{animation:none}}');
  const tweaks={
    'no-grade':'.helios-hero video,.helios-hero [data-media-slot="frame"] img{filter:none!important}',
    'static-no-grain':'.helios-hero [data-media-surface="fill"]::before{content:none!important}',
    'static-no-scrim':'.helios-hero [data-media-surface="fill"]::after{content:none!important}',
    'static-no-wordmark':'.helios-wordmark{display:none!important}',
  };
  if(tweaks[arm])await injectCSS(tweaks[arm]);
  if(arm==='static-no-landscape')await page.evaluate(`(()=>{const e=document.querySelector('.helios-landscape');e.style.containIntrinsicSize=e.getBoundingClientRect().height+'px';e.style.contentVisibility='hidden'})()`);
  await page.evaluate(`scrollTo({top:0,behavior:'instant'});__video.loop=true;__video.muted=true;__video.pause()`);
  const source=await page.evaluate(`({src:__video.currentSrc,width:__video.videoWidth,height:__video.videoHeight,rect:__video.getBoundingClientRect().toJSON(),filter:getComputedStyle(__video).filter,prev:Array.from(document.querySelectorAll('.helios-hero [data-media-prev]')).map(v=>({src:v.currentSrc,readyState:v.readyState,opacity:getComputedStyle(v.closest('[data-media-cell]')).opacity}))})`);
  source.landscapeGrain=await page.evaluate(`Array.from(document.querySelectorAll('.helios-landscape .helios-possibility__stage,.helios-landscape .helios-possibilities')).map(e=>({class:e.className,animation:getComputedStyle(e,'::before').animationName,mask:getComputedStyle(e,'::before').maskImage}))`);
  if(arm.startsWith('static-'))assert.ok(source.landscapeGrain.length===3&&source.landscapeGrain.every(e=>e.animation==='none'),'authored static grain rule wins the real cascade');
  assert.equal(source.src,pinned.src,'same page-selected codec and URL');
  assert.equal(source.prev.length,0,'intro arms must have no retained previous plate');
  if(arm==='no-grade')assert.equal(source.filter,'none','grade knockout must actually apply');
  assert.equal(source.width,pinned.width);assert.equal(source.height,pinned.height);
  for(const key of ['x','y','width','height'])assert.ok(Math.abs(source.rect[key]-pinned.rect[key])<1,'same displayed video box: '+key);
  assert.equal(await page.evaluate('scrollY'),0,'stationary playback, no choreography/next-scene entry');
  assert.equal(await page.evaluate('document.visibilityState'),'visible');
  // Require BOTH a successful seek and an actually presented frame at 2 seconds.
  const frame=await page.evaluate(`new Promise((resolve,reject)=>{
    const v=__video;if(v.error||!v.seekable.length||v.seekable.end(0)<2.05)return reject(new Error('range support/seekability required'));
    let seeked=false,presented=null;const timer=setTimeout(()=>reject(new Error('seek/present timeout')),5000);
    function done(){if(seeked&&presented){clearTimeout(timer);resolve({time:v.currentTime,mediaTime:presented.mediaTime,presentedFrames:presented.presentedFrames})}}
    v.addEventListener('seeked',()=>{seeked=true;done()},{once:true});
    function next(_,metadata){if(Math.abs(metadata.mediaTime-2)<.05){presented=metadata;done()}else v.requestVideoFrameCallback(next)}
    v.requestVideoFrameCallback(next);v.currentTime=2;
  })`);
  assert.ok(Math.abs(frame.time-2)<.05&&Math.abs(frame.mediaTime-2)<.05,'actual frame 2.0 presented');
  if(process.env.SHOTS) {
    await page.evaluate(`window.__grainState=document.getAnimations().filter(a=>a.animationName==='helios-grain').map(a=>({a,time:a.currentTime,state:a.playState}));__grainState.forEach(({a})=>{a.pause();a.currentTime=0});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    const image=Buffer.from((await page.s('Page.captureScreenshot',{format:'png',clip:{...pinned.rect,scale:1}})).data,'base64');
    writeFileSync(out+'/'+arm+'-frame2.png',image);source.cropSHA256=createHash('sha256').update(image).digest('hex');
    await page.evaluate(`__grainState.forEach(({a,time,state})=>{a.currentTime=time;if(state==='running')a.play()})`);
  }
  await page.evaluate(`window.__frameHook=function(_,m){const b=__hot;if(b.recording)b.frames.push({media:m.mediaTime,presented:m.presentedFrames,processingDurationSeconds:m.processingDuration,callbackFromExpectedMs:performance.now()-m.expectedDisplayTime});__video.requestVideoFrameCallback(__frameHook)};__video.requestVideoFrameCallback(__frameHook)`);
  await page.evaluate('__video.play()');await wait(350);
  assert.equal(await page.evaluate('__video.paused'),false);
  assert.deepEqual(page.console.slice(offset).filter(e=>e.type==='exception'),[]);
  return source;
}
async function measure(arm,trial,traced=false) {
  const source=await prepare(arm);
  const othersBefore=await page.evaluate(`Array.from(document.querySelectorAll('video')).filter(v=>v!==__video).map(v=>v.getVideoPlaybackQuality().totalVideoFrames)`);
  if(traced){layers=[];await page.s('LayerTree.enable');await wait(100);}
  const before=await metrics();
  if(traced)await cdp.send('Tracing.start',{categories:'devtools.timeline,blink,blink.user_timing,cc,gpu,viz,media',transferMode:'ReturnAsStream'});
  await page.evaluate(`__hot.raf=[];__hot.frames=[];__hot.tasks=[];__hot.previous=0;__hot.quality=__video.getVideoPlaybackQuality();__hot.start=performance.now();performance.mark('hero-window-start');__hot.recording=true`);
  await wait(windowMs);
  const sample=await page.evaluate(`(()=>{performance.mark('hero-window-end');__hot.recording=false;const q=__video.getVideoPlaybackQuality();return {...__hot,elapsedMs:performance.now()-__hot.start,quality:{total:q.totalVideoFrames-__hot.quality.totalVideoFrames,dropped:q.droppedVideoFrames-__hot.quality.droppedVideoFrames},y:scrollY,src:__video.currentSrc,paused:__video.paused,others:Array.from(document.querySelectorAll('video')).filter(v=>v!==__video).map(v=>v.getVideoPlaybackQuality().totalVideoFrames)}})()`);
  const after=await metrics();
  let trace;
  if(traced){const data=await stopTrace();writeFileSync(out+'/trace-'+arm+'.json',data);trace=traceSummary(data);writeFileSync(out+'/layers-'+arm+'.json',JSON.stringify(await describeLayers(),null,2));await page.s('LayerTree.disable');}
  assert.equal(sample.y,0);assert.equal(sample.src,pinned.src);assert.equal(sample.paused,false);
  assert.deepEqual(sample.others,othersBefore,'other clips must not decode during the steady window');
  assert.ok(sample.frames.length>10,'real video presentation advances');
  const report={arm,trial,traced,source,elapsedMs:sample.elapsedMs,raf:stats(sample.raf),
    videoCallbacks:sample.frames.length,frameProcessingDurationMs:stats(sample.frames.map(f=>f.processingDurationSeconds*1000).filter(Number.isFinite)),quality:sample.quality,
    longTasks:sample.tasks,totals:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration','LayoutCount'].map(k=>[k,(after[k]-before[k])*(k==='LayoutCount'?1:1000)])),trace};
  reports.push(report);writeFileSync(out+'/samples-'+arm+'-'+trial+'.json',JSON.stringify(sample,null,2));
  writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(report));
}
try {
  await page.goto(base,2500);await page.evaluate('document.fonts.ready');
  pinned=await page.evaluate(`(()=>{const v=document.querySelector('.helios-hero [data-media-active]'),s=getComputedStyle(v);return {src:v.currentSrc,width:v.videoWidth,height:v.videoHeight,rect:v.getBoundingClientRect().toJSON(),fit:s.objectFit,position:s.objectPosition,filter:s.filter,pointerFine:matchMedia('(pointer:fine)').matches}})()`);
  assert.ok(pinned.src&&pinned.width&&pinned.height);assert.notEqual(pinned.filter,'none','desktop grade must actually be present');
  const gpu=await cdp.send('SystemInfo.getInfo');
  writeFileSync(out+'/environment.json',JSON.stringify({base,pinned,browser:await cdp.send('Browser.getVersion'),gpu,windowMs,repeats},null,2));
  for(let trial=0;trial<repeats;trial++)for(const arm of trial%2?[...arms].reverse():arms)await measure(arm,trial);
  if(process.env.TRACE)for(const arm of arms)await measure(arm,'trace',true);
} finally {
  await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId}).catch(()=>{});cdp.close();
}

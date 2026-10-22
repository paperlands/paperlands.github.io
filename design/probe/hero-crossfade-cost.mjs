// Shipped stack, opacity driver only: grades and overlay grain remain in the
// graph. No writer marks, swaps, source changes, readback or decode in the window.
// This is a fade-in over an opaque outgoing cell, not a two-layer crossfade.
// Every infinite CSS clock is paused, so it bounds this opacity driver only; it
// does not price the production writer, decode or readback path.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync,writeFileSync } from 'node:fs';
import { connect,newPage } from './cdp.mjs';
import { statistics,summarizeRenderTrace,finishTrace } from './render-window.mjs';
const base=process.env.BASE||'http://127.0.0.1:4004',out=process.env.PROBE_OUTPUT||'/tmp/helios-hotpaths/crossfade';
const expectedSHA=process.env.WRITER_SHA;
assert.match(expectedSHA||'',/^[a-f0-9]{64}$/,'set WRITER_SHA from the frozen media-carousel.js');
const writerHash=async()=>createHash('sha256').update(Buffer.from(await(await fetch(base+'/assets/js/media-carousel.js')).arrayBuffer())).digest('hex');
assert.equal(await writerHash(),expectedSHA,'writer must match the frozen baseline');
mkdirSync(out,{recursive:true});
const cdp=await connect(),page=await newPage(cdp),reports=[];
let layers=[];cdp.on(m=>{if(m.sessionId===page.sessionId&&m.method==='LayerTree.layerTreeDidChange')layers=m.params.layers||[]});
await page.s('Network.setBypassServiceWorker',{bypass:true});await page.s('Network.setCacheDisabled',{cacheDisabled:true});
await page.s('Performance.enable');await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`
const o=new MutationObserver(()=>document.querySelectorAll('video').forEach(v=>v.loop=true));o.observe(document,{childList:true,subtree:true});addEventListener('DOMContentLoaded',()=>o.disconnect(),{once:true});
const b=window.__fade={recording:false,frames:[],previous:0,presented:[0,0]};function monitor(t){if(b.recording&&b.previous)b.frames.push(t-b.previous);b.previous=b.recording?t:0;requestAnimationFrame(monitor)}requestAnimationFrame(monitor);
`});
const frame=()=>page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
const metrics=async()=>Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
async function measure(mode,trial,traced=false){
 const resting=mode==='held'?'.5':'0';
 await page.evaluate(`incoming.style.transition='none';incoming.style.opacity='${resting}'`);await frame();
 if(mode==='fade'){await page.evaluate('incoming.style.transition=authoredTransition');await frame();}
 const before=await metrics();
 if(traced){layers=[];await page.s('LayerTree.enable');await cdp.send('Tracing.start',{categories:'devtools.timeline,blink,blink.user_timing,cc,gpu,viz,media',transferMode:'ReturnAsStream'});}
 // No style/layout getter, screenshot or canvas inside this window. The two
 // media counter reads bracket the timing marks, and all frames remain paused.
 const pending=page.evaluate(`new Promise((resolve,reject)=>{
   const quality=videos.map(v=>v.getVideoPlaybackQuality().totalVideoFrames),times=videos.map(v=>v.currentTime),presented=[...__fade.presented];
   __fade.frames=[];__fade.previous=0;__fade.start=performance.now();__fade.recording=true;performance.mark('hero-window-start');
   let timer;
   function close(){clearTimeout(timer);performance.mark('hero-window-end');__fade.recording=false;incoming.removeEventListener('transitionend',ended);resolve({elapsedMs:performance.now()-__fade.start,frames:__fade.frames,qualityBefore:quality,qualityAfter:videos.map(v=>v.getVideoPlaybackQuality().totalVideoFrames),timesBefore:times,timesAfter:videos.map(v=>v.currentTime),presentedBefore:presented,presentedAfter:[...__fade.presented],paused:videos.every(v=>v.paused),y:scrollY})}
   function ended(e){if(e.target===incoming&&e.propertyName==='opacity')close()}
   if(${JSON.stringify(mode)}==='fade'){incoming.addEventListener('transitionend',ended);timer=setTimeout(()=>reject(new Error('transition end timeout')),5000);incoming.style.opacity='1'}
   else timer=setTimeout(close,1200);
 })`);
 await new Promise(r=>setTimeout(r,550));const middleLayerCount=traced?layers.length:null;
 const result=await pending,after=await metrics();let trace;
 if(traced){const data=await finishTrace(cdp);writeFileSync(out+'/trace-'+mode+'.json',data);trace=summarizeRenderTrace(data);await page.s('LayerTree.disable');}
 assert.deepEqual(result.qualityAfter,result.qualityBefore,'no decode/frame production during the window');
 assert.deepEqual(result.presentedAfter,result.presentedBefore,'no new video frame submitted during the window');
 assert.deepEqual(result.timesAfter,result.timesBefore);assert.ok(result.paused);assert.equal(result.y,0);
 const opacity=await page.evaluate('({incoming:Number(getComputedStyle(incoming).opacity),outgoing:Number(getComputedStyle(outgoing).opacity)})');
 assert.equal(opacity.outgoing,1);assert.equal(opacity.incoming,mode==='fade'?1:Number(resting));
 const report={mode,trial,traced,elapsedMs:result.elapsedMs,raf:statistics(result.frames),middleLayerCount,
  decodedFrames:0,newPresentedFrames:0,sourceTimes:result.timesAfter,totals:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(after[k]-before[k])*1000])),trace};
 reports.push(report);writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(report));
}
try{
 await page.goto(base,2500);await page.evaluate('document.fonts.ready');
 await page.evaluate(`window.videos=Array.from(document.querySelectorAll('.helios-hero video')).slice(0,2);document.querySelectorAll('video').forEach(v=>{v.loop=true;v.pause();v.play=()=>Promise.resolve()});
 window.outgoing=videos[0].closest('[data-media-cell]');window.incoming=videos[1].closest('[data-media-cell]');window.authoredTransition=getComputedStyle(outgoing).transition;
 incoming.style.transition='none';incoming.style.opacity='1';incoming.style.zIndex='2';videos[1].setAttribute('data-ready','');videos[1].style.transition='none';videos[1].style.opacity='1';`);
 for(const [index,time]of [[0,2],[1,1]]){
  const result=await page.evaluate(`new Promise((resolve,reject)=>{const v=videos[${index}],t=${time};if(!v.seekable.length||v.seekable.end(0)<t+.05)return reject(new Error('seekable range required'));let a=false,b=null;const timer=setTimeout(()=>reject(new Error('seek/present timeout')),5000);function done(){if(a&&b){clearTimeout(timer);__fade.presented[${index}]=b.presentedFrames;resolve({time:v.currentTime,media:b.mediaTime})}}v.addEventListener('seeked',()=>{a=true;done()},{once:true});function next(_,m){if(Math.abs(m.mediaTime-t)<.05){b=m;done()}else v.requestVideoFrameCallback(next)}v.requestVideoFrameCallback(next);v.currentTime=t})`);
  assert.ok(Math.abs(result.time-time)<.05&&Math.abs(result.media-time)<.05);
 }
 await page.evaluate(`document.getAnimations().forEach(a=>a.pause());videos.forEach((v,i)=>{function next(_,m){__fade.presented[i]=m.presentedFrames;v.requestVideoFrameCallback(next)}v.requestVideoFrameCallback(next)})`);
 const state=await page.evaluate('({src:videos.map(v=>v.currentSrc),time:videos.map(v=>v.currentTime),ready:videos.map(v=>v.readyState),transition:authoredTransition,rect:videos[0].getBoundingClientRect().toJSON()})');
 assert.notEqual(state.src[0],state.src[1]);assert.ok(Math.abs(state.time[0]-state.time[1])>.4);assert.ok(state.ready.every(n=>n>=2));assert.match(state.transition,/1\.2s/);
 const hashes=[];
 for(const value of ['0','1']){
  await page.evaluate(`incoming.style.opacity='${value}'`);await frame();
  const image=Buffer.from((await page.s('Page.captureScreenshot',{format:'png',clip:{x:state.rect.x,y:state.rect.y,width:state.rect.width,height:state.rect.height,scale:1}})).data,'base64');
  writeFileSync(out+'/paused-cell-'+value+'.png',image);hashes.push(createHash('sha256').update(image).digest('hex'));
 }
 assert.notEqual(hashes[0],hashes[1],'two distinct paused cell crops');
 writeFileSync(out+'/environment.json',JSON.stringify({base,state,cropSHA256:hashes,writerSHA:expectedSHA,browser:await cdp.send('Browser.getVersion'),note:'Shipped grade/grain stack with synthetic opacity driver; not the full production writer/readback/decode transition.'},null,2));
 for(let trial=0;trial<3;trial++)for(const mode of trial%2?['fade','held','single']:['single','held','fade'])await measure(mode,trial);
 if(process.env.TRACE)for(const mode of ['single','held','fade'])await measure(mode,'trace',true);
 assert.equal(await writerHash(),expectedSHA);assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
 await page.evaluate(`incoming.style.opacity='';incoming.style.transition='';incoming.style.zIndex=''`);
}finally{await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId}).catch(()=>{});cdp.close()}

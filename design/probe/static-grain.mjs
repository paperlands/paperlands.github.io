// Visibility-gated grain gate + paired grain-time-0 snapshots. The hero film
// grain and the three landscape pseudos keep the authored background-position
// animation but pause while their surface is out of view. BEFORE optionally
// points at a frozen pre-gate build. TRACE=1 adds a 3 s scroll-0 window and
// asserts zero Paint events for the offscreen landscape pseudos.
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { connect,newPage } from './cdp.mjs';
import { finishTrace } from './render-window.mjs';
const base=process.env.BASE||'http://127.0.0.1:4005',before=process.env.BEFORE,out=process.env.PROBE_OUTPUT||'/tmp/helios-hotpaths/static-gate';
mkdirSync(out,{recursive:true});const cdp=await connect(),page=await newPage(cdp),reports=[];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await page.s('Network.setBypassServiceWorker',{bypass:true});await page.s('Network.setCacheDisabled',{cacheDisabled:true});
await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`const o=new MutationObserver(()=>document.querySelectorAll('video').forEach(v=>v.loop=true));o.observe(document,{childList:true,subtree:true});addEventListener('DOMContentLoaded',()=>o.disconnect(),{once:true});`});
const styles=()=>page.evaluate(`(()=>{
 const surface=(e,pseudo)=>{const s=getComputedStyle(e,pseudo);return {animation:s.animationName,duration:s.animationDuration,timing:s.animationTimingFunction,mask:s.maskImage,opacity:s.opacity,blend:s.mixBlendMode,size:s.backgroundSize,image:s.backgroundImage.replaceAll(location.origin,'')}};
 const stages=[...document.querySelectorAll('.helios-landscape .helios-possibility__stage')];
 const possibilities=document.querySelector('.helios-possibilities');
 const surfaces=[...stages,possibilities];
 return {reduced:matchMedia('(prefers-reduced-motion:reduce)').matches,
  hero:surface(document.querySelector('.helios-hero [data-media-surface="fill"]'),'::before'),
  heroIdle:document.querySelector('.helios-hero [data-media-surface="fill"]').hasAttribute('data-grain-idle'),
  landscape:surfaces.map(e=>surface(e,'::before')),
  landscapeIdle:surfaces.map(e=>e.hasAttribute('data-grain-idle')),
  ticker:surface(document.querySelector('.helios-ticker'),'::before'),
  colophon:surface(document.querySelector('.helios-colophon'),'::before')};})()`);
async function open(url){await page.goto(url,2500);await page.evaluate('document.fonts.ready');await page.evaluate("scrollTo({top:0,behavior:'instant'})");await wait(700);return styles();}
async function snapshots(label,width){
 // Freeze the hero on its first authored clip and its own copy. The writer may
 // otherwise have advanced between the two builds, changing the title/slate and
 // the video frame; that is carousel state, not grain parity.
 await page.evaluate(`(()=>{document.querySelectorAll('video').forEach(v=>{v.pause();v.play=()=>Promise.resolve()});const cells=[...document.querySelectorAll('.helios-hero [data-media-cell]')];cells.forEach((c,i)=>{const v=c.querySelector('video');if(!v)return;v.removeAttribute('data-media-active');v.removeAttribute('data-media-prev');if(i===0)v.setAttribute('data-media-active','')});const first=cells[0];const title=document.querySelector('.helios-hero [data-media-slot="title"]'),slate=document.querySelector('.helios-hero [data-media-slot="slate"]');if(first&&title)title.textContent=first.dataset.title||'';if(first&&slate)slate.textContent=first.dataset.slate||'';window.v=first&&first.querySelector('video')})()`);
 const actual=await page.evaluate(`new Promise((resolve,reject)=>{if(!v.seekable.length||v.seekable.end(0)<2.05)return reject(new Error('seekable video required'));let a=false,b=false;const timer=setTimeout(()=>reject(new Error('seek timeout')),5000);function done(){if(a&&b){clearTimeout(timer);resolve(v.currentTime)}}v.addEventListener('seeked',()=>{a=true;done()},{once:true});function next(_,m){if(Math.abs(m.mediaTime-2)<.05){b=true;done()}else v.requestVideoFrameCallback(next)}v.requestVideoFrameCallback(next);v.currentTime=2})`);
 assert.ok(Math.abs(actual-2)<.05);
 for(const [name,selector]of [['hero','.helios-hero'],['inquiry','.helios-plate .helios-possibility__stage'],['create','.helios-create .helios-possibility__stage'],['invite','.helios-possibilities']]){
  await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect();scrollTo({top:${name==='hero'?'0':'scrollY+r.top+r.height*.5-innerHeight*.5'},behavior:'instant'})})()`);await wait(1100);
  await page.evaluate(`document.getAnimations().filter(a=>a.effect?.getTiming().iterations===Infinity).forEach(a=>{a.pause();a.currentTime=0});new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  // The carousel copy, hero video/play fill, scroll-scrub plate art and the
  // scroll-driven nav/wordmark are state, not grain. Hide them so the pair
  // measures the surface; their pose/frame can differ between builds.
  await page.evaluate(`(()=>{const c=document.querySelector('.helios-hero [data-media-slot="copy"]');if(c)c.style.visibility='hidden';document.querySelectorAll('.helios-hero .media-stack, .helios-play, .helios-possibility__art, nav, .helios-wordmark').forEach(e=>e.style.visibility='hidden')})()`);
  assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no overflow');
  const file=out+'/'+label+'-'+width+'-'+name+'.png';writeFileSync(file,Buffer.from((await page.s('Page.captureScreenshot',{format:'png'})).data,'base64'));
  reports.push({label,width,scene:name,y:await page.evaluate('scrollY')});
 }
}
try{
 for(const [width,height]of [[1440,900],[390,844]]){
  await page.s('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<850});
  let old;
  if(before){old=await open(before);assert.deepEqual(old.landscape.map(s=>s.animation),['helios-grain','helios-grain','helios-grain'],'BEFORE must reproduce the legacy grain animation');await snapshots('before',width);}
  const current=await open(base);assert.equal(current.reduced,false);
  assert.equal(current.hero.animation,'helios-grain-hero','hero film grain steps');
  assert.equal(current.hero.duration,current.landscape[0].duration,'hero grain matches the landscape cadence');
  assert.equal(current.hero.blend,'overlay','hero texture is unchanged');
  assert.equal(current.hero.opacity,'0.22');
  assert.equal(current.hero.size,'220px 220px');
  assert.equal(current.heroIdle,false,'hero grain is visible');
  assert.deepEqual(current.landscape.map(s=>s.animation),['helios-grain','helios-grain','helios-grain'],'landscape grain steps');
  assert.deepEqual(current.landscapeIdle,[true,true,true],'offscreen landscape grain is paused');
  assert.equal(current.ticker.animation,'helios-grain');assert.equal(current.colophon.animation,'helios-grain');
  const resumed=await page.evaluate(`new Promise(resolve=>{const hero=document.querySelector('.helios-hero [data-media-surface="fill"]'),e=document.querySelector('.helios-possibilities'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top+r.height*.5-innerHeight*.5,behavior:'instant'});setTimeout(()=>resolve({idle:e.hasAttribute('data-grain-idle'),state:getComputedStyle(e,'::before').animationPlayState,heroIdle:hero.hasAttribute('data-grain-idle'),heroState:getComputedStyle(hero,'::before').animationPlayState}),450)})`);
  assert.equal(resumed.idle,false,'visible landscape grain resumes');
  assert.equal(resumed.state,'running','visible landscape grain runs');
  assert.equal(resumed.heroIdle,true,'offscreen hero grain pauses');
  assert.equal(resumed.heroState,'paused','offscreen hero grain is paused');
  await page.evaluate("scrollTo({top:0,behavior:'instant'})");await wait(300);
  const heroBack=await page.evaluate(`(()=>{const e=document.querySelector('.helios-hero [data-media-surface="fill"]');return {idle:e.hasAttribute('data-grain-idle'),state:getComputedStyle(e,'::before').animationPlayState}})()`);
  assert.equal(heroBack.idle,false,'hero grain resumes');
  assert.equal(heroBack.state,'running','hero grain runs after return');
  if(old){
   const material=({animation,duration,timing,...rest})=>rest;
   assert.deepEqual(current.landscape.map(material),old.landscape.map(material),'masks, pigment, opacity and blend retained');
   assert.deepEqual(material(current.hero),material(old.hero),'hero grain pigment retained');assert.deepEqual(current.ticker,old.ticker);assert.deepEqual(current.colophon,old.colophon);
  }
  reports.push({width,styles:current});await snapshots('after',width);
  if(before)for(const name of ['hero','inquiry','create','invite']){
   const delta=JSON.parse(execFileSync('python3',['-c',`from PIL import Image,ImageChops,ImageStat
import sys,json
x=Image.open(sys.argv[1]).convert('RGB');y=Image.open(sys.argv[2]).convert('RGB');d=ImageChops.difference(x,y);print(json.dumps(dict(meanRGB=sum(ImageStat.Stat(d).mean)/3,maxChannel=max(v[1] for v in d.getextrema()))))`,out+'/before-'+width+'-'+name+'.png',out+'/after-'+width+'-'+name+'.png'],{encoding:'utf8'}));
   console.log(JSON.stringify({width,scene:name,visual:delta}));reports.push({width,scene:name,visual:delta});
   assert.ok(delta.meanRGB<.02&&delta.maxChannel<=2,'same authored initial print at '+width+'/'+name+': '+JSON.stringify(delta));
  }
 }
 if(process.env.TRACE){
  await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  await open(base);
  await page.evaluate(`document.querySelectorAll('video').forEach(v=>{v.loop=true;v.pause();v.play=()=>Promise.resolve()});scrollTo({top:0,behavior:'instant'})`);
  await wait(300);
  await cdp.send('Tracing.start',{categories:'devtools.timeline,blink,blink.user_timing,cc,gpu,viz,media',transferMode:'ReturnAsStream'});
  await wait(3000);
  const trace=JSON.parse(await finishTrace(cdp));
  const paints=trace.traceEvents.filter(e=>e.name==='Paint'&&e.ph==='X');
  const byNode={};
  for(const e of paints){const n=e.args?.data?.nodeName||'?';byNode[n]=(byNode[n]||0)+1}
  const landscape=Object.entries(byNode).filter(([n])=>/helios-possibility__stage|helios-possibilities/.test(n));
  const landscapePaints=landscape.reduce((sum,[,n])=>sum+n,0);
  reports.push({trace:{windowMs:3000,byNode,landscapePaints,totalPaint:paints.length}});
  writeFileSync(out+'/trace-compiled.json',JSON.stringify(trace));
  writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));
  console.log(JSON.stringify({trace:'compiled',totalPaint:paints.length,landscapePaints,byNode}));
  assert.ok(paints.length>=30,'trace must observe the page painting');
  assert.equal(landscapePaints,0,'offscreen landscape grain must emit no window paints');
 }
 await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const reduced=await open(base);assert.equal(reduced.reduced,true);assert.ok([reduced.hero,...reduced.landscape,reduced.ticker,reduced.colophon].every(s=>s.animation==='none'));
 assert.ok(await page.evaluate('Array.from(document.querySelectorAll("video")).every(v=>!v.currentSrc)'),'reduced motion does not attach video');
 assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
 writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));console.log('Visibility-gated grain and unchanged-material gates pass.');
}finally{await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId}).catch(()=>{});cdp.close()}

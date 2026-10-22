// Factorial attribution: same looping hero clip/path, playing vs paused and
// graded vs unfiltered. The unfiltered arm is diagnostic, NOT a shipping design.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const base=process.env.BASE||'http://127.0.0.1:4004',out=process.env.PROBE_OUTPUT||'/tmp/helios-hero-video-knockout';
mkdirSync(out,{recursive:true});
const repeats=Number(process.env.REPEATS||3),wait=ms=>new Promise(r=>setTimeout(r,ms));
const cdp=await connect(),page=await newPage(cdp),reports=[];
await page.s('Network.setBypassServiceWorker',{bypass:true});
await page.s('Performance.enable');
await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`
window.__heroBudget={recording:false,frames:[],previous:0};
function monitor(t){const b=__heroBudget;if(b.recording&&b.previous)b.frames.push(t-b.previous);b.previous=b.recording?t:0;requestAnimationFrame(monitor)}requestAnimationFrame(monitor);
`});
const metrics=async()=>Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
const variants=(process.env.VARIANTS||'play-grade,play-plain,pause-plain,pause-grade').split(',');
const grade='contrast(1.12) saturate(0.85) sepia(0.28) hue-rotate(-12deg)';
const filters={baked:'none',plain:'none',grade:'',contrast:'contrast(1.12)',matrix:'url(#grade-combined)',chain:'url(#grade-chain)',host:'none'};
try {
  await page.goto(base,2500);await page.evaluate('document.fonts.ready');
  if(process.env.GRADE_DEFS) await page.evaluate(`document.body.insertAdjacentHTML('beforeend',${JSON.stringify(JSON.parse(readFileSync(process.env.GRADE_DEFS,'utf8')).xml)})`);
  await page.evaluate(`window.__v=document.querySelector('.helios-hero [data-media-active]');__v.loop=true;window.__originalPlay=__v.play.bind(__v);
window.__distance=Math.max(1,Math.round(document.querySelector('.helios-hero').clientHeight*.8));
if(${JSON.stringify(process.env.CODEC || '')}==='h264'){__v.src=__v.dataset.src;__v.load();}`);
  await wait(1000);
  assert.ok(await page.evaluate('__v.readyState>=2'),'active hero clip must be decoded');
  const src=await page.evaluate('__v.currentSrc');
  writeFileSync(out+'/environment.json',JSON.stringify({base,browser:await cdp.send('Browser.getVersion'),src,path:await page.evaluate('({distance:__distance,from:.12,to:.78})'),repeats},null,2));
  for(let trial=0;trial<repeats;trial++)for(const name of trial%2?[...variants].reverse():variants){
    const source=name.endsWith('baked')?new URL(process.env.SOURCE_BAKED,base).href:src;
    await page.evaluate(`if(__v.currentSrc!==${JSON.stringify(source)}){__v.pause();__v.src=${JSON.stringify(source)};__v.load()}`);await wait(700);
    await page.evaluate(`__v.play=${name.startsWith('pause')?'()=>Promise.resolve()':'__originalPlay'};__v.pause();__v.currentTime=1;
__v.style.filter=${JSON.stringify(filters[name.split('-')[1]])};__v.closest('[data-media-slot="frame"]').style.filter=${JSON.stringify(name.endsWith('host')?grade:'')};scrollTo({top:__distance*.12,behavior:'instant'});`);
    await wait(700);if(name.startsWith('play'))await page.evaluate('__originalPlay()');await wait(500);
    assert.equal(await page.evaluate('__v.currentSrc'),source,'selected rendition must actually load');
    assert.equal(await page.evaluate('__v.paused'),name.startsWith('pause'),'factor arm playback state');
    assert.ok(await page.evaluate('__v.currentTime > .9'), 'the test server must support actual video seeking, not silent frame zero');
    const before=await metrics();
    const traced=Boolean(process.env.TRACE && trial===0);
    if(traced)await cdp.send('Tracing.start',{categories:'devtools.timeline,blink,cc,gpu,viz',transferMode:'ReturnAsStream'});
    await page.evaluate('__heroBudget.frames=[];__heroBudget.previous=0;__heroBudget.recording=true');
    const distance=await page.evaluate('Math.round(__distance*.66)');
    for(const sign of [-1,1]){
      const y=await page.evaluate('scrollY');
      await page.s('Input.synthesizeScrollGesture',{x:1000,y:450,yDistance:sign*distance,speed:400,gestureSourceType:'mouse'});
      await wait(80);assert.ok(Math.abs(await page.evaluate('scrollY')-y)>distance*.8,'normalized hero gesture moved');
    }
    const samples=await page.evaluate('__heroBudget.recording=false;__heroBudget.frames'),after=await metrics();
    if(traced){
      const done=new Promise(resolve=>cdp.on(m=>{if(m.method==='Tracing.tracingComplete')resolve(m.params.stream)}));
      await cdp.send('Tracing.end');const handle=await done;let data='',part;
      do{part=await cdp.send('IO.read',{handle});data+=part.base64Encoded?Buffer.from(part.data,'base64').toString():part.data}while(!part.eof);
      await cdp.send('IO.close',{handle});writeFileSync(out+'/trace-'+name+'.json',data);
    }
    const values=[...samples].sort((a,b)=>a-b),pct=p=>values[Math.floor(values.length*p)]||0;
    const report={name,trial,frames:values.length,p50:pct(.5),p95:pct(.95),max:Math.max(...values),overTwoVsync:values.filter(v=>v>34).length/values.length,
      totals:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(after[k]-before[k])*1000])),
      media:await page.evaluate('({src:__v.currentSrc,paused:__v.paused,quality:__v.getVideoPlaybackQuality().toJSON?.()||{total:__v.getVideoPlaybackQuality().totalVideoFrames,dropped:__v.getVideoPlaybackQuality().droppedVideoFrames}})')};
    assert.equal(report.media.paused,name.startsWith('pause'));reports.push(report);console.log(JSON.stringify(report));
    writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));
  }
  assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
}finally{await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId});cdp.close()}

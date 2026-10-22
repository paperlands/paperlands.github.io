// Real hero-node layout mechanism and paired 3px-strip pixel gate.
// Synthetic rAF writes are NOT a claim about real video timeupdate frequency/FPS.
import assert from 'node:assert/strict';
import { mkdirSync,writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { connect,newPage } from './cdp.mjs';
const base=process.env.BASE||'http://127.0.0.1:4001',out=process.env.PROBE_OUTPUT||'/tmp/helios-play-fill';mkdirSync(out,{recursive:true});
const cdp=await connect(),page=await newPage(cdp),reports=[];
const metrics=async()=>Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
try{
 await page.s('Network.setBypassServiceWorker',{bypass:true});await page.s('Network.setCacheDisabled',{cacheDisabled:true});await page.s('Performance.enable');
 await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await page.goto(base,2500);await page.evaluate('document.fonts.ready');
 if(process.env.CHECK_RUNTIME){
  const sample=()=>page.evaluate(`(()=>{const f=document.querySelector('[data-helios-play]'),v=document.querySelector('.helios-hero [data-media-active]');return {scale:new DOMMatrix(getComputedStyle(f).transform).a,ratio:v.currentTime/v.duration,playing:!v.paused,src:v.currentSrc}})()`);
  const before=await sample();await new Promise(r=>setTimeout(r,650));const after=await sample();
  assert.ok(before.playing&&after.playing,'native clip actually plays');
  assert.ok(Math.abs(after.scale-after.ratio)<.1,'fill tracks the native media clock');
  if(before.src===after.src&&after.ratio>before.ratio)assert.ok(after.scale>before.scale,'native playback advances the fill');
  reports.push({nativeClock:{before,after}});
 }
 await page.evaluate(`window.fill=document.querySelector('[data-helios-play]');window.video=document.querySelector('.helios-hero [data-media-active]');video.pause();video.play=()=>Promise.resolve();document.getAnimations().forEach(a=>a.pause());`);
 const frame=async()=>page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))');
 for(let trial=0;trial<2;trial++)for(const mode of trial?['transform','width','control']:['control','width','transform']){
  await page.evaluate(`fill.style.width='100%';fill.style.transform=${mode==='width'?"'translateZ(0)'":"'translateZ(0) scaleX(var(--helios-play,0))'"};fill.style.transformOrigin='0 50%';fill.style.setProperty('--helios-play','0')`);await frame();const before=await metrics();
  await page.evaluate(`new Promise(resolve=>{let n=0;function update(){if(n===120){resolve();return}const p=(++n%101)/100;${mode==='width'?"fill.style.width=(p*100)+'%'":mode==='transform'?"fill.style.setProperty('--helios-play',String(p))":''};requestAnimationFrame(update)}requestAnimationFrame(update)})`);
  await frame();const after=await metrics(),row={trial,mode,layoutCount:after.LayoutCount-before.LayoutCount,layoutMs:(after.LayoutDuration-before.LayoutDuration)*1000,styleMs:(after.RecalcStyleDuration-before.RecalcStyleDuration)*1000};
  reports.push(row);console.log(JSON.stringify(row));
 }
 assert.equal(await page.evaluate('scrollY'),0,'screenshot strip coordinates assume an unscrolled page');
 const rect=await page.evaluate('fill.parentElement.getBoundingClientRect().toJSON()');
 assert.ok(rect.y>=0&&rect.y+rect.height<=900,'entire progress strip visible');
 for(const p of [0,.001,.5,.999,1]){
  for(const mode of ['width','transform']){
   await page.evaluate(`fill.style.width=${JSON.stringify(mode==='width'?(p*100)+'%':'100%')};fill.style.transform=${JSON.stringify(mode==='width'?'translateZ(0)':`translateZ(0) scaleX(${p})`)};fill.style.transformOrigin='0 50%'`);await frame();
   writeFileSync(`${out}/${mode}-${p}.png`,Buffer.from((await page.s('Page.captureScreenshot',{format:'png',clip:{x:rect.x,y:rect.y,width:rect.width,height:rect.height,scale:1}})).data,'base64'));
  }
  const delta=JSON.parse(execFileSync('python3',['-c',`from PIL import Image,ImageChops,ImageStat
import sys,json
x=Image.open(sys.argv[1]).convert('RGB');y=Image.open(sys.argv[2]).convert('RGB');d=ImageChops.difference(x,y);print(json.dumps(dict(meanRGB=sum(ImageStat.Stat(d).mean)/3,maxChannel=max(v[1] for v in d.getextrema()))))`,`${out}/width-${p}.png`,`${out}/transform-${p}.png`],{encoding:'utf8'}));
  reports.push({p,visual:delta});console.log(JSON.stringify({p,visual:delta}));assert.ok(delta.meanRGB<.01&&delta.maxChannel<=1,'same solid progress-bar appearance');
 }
 const visibleDelta=Number(execFileSync('python3',['-c',`from PIL import Image,ImageChops,ImageStat
import sys
d=ImageChops.difference(Image.open(sys.argv[1]).convert('RGB'),Image.open(sys.argv[2]).convert('RGB'));print(sum(ImageStat.Stat(d).mean)/3)`,out+'/width-0.png',out+'/width-1.png'],{encoding:'utf8'}));
 assert.ok(visibleDelta>10,'the paired pixel gate must exercise a visible bar, not two empty images');
 reports.push({visibleBarDeltaRGB:visibleDelta});
 assert.ok(reports.filter(r=>r.mode==='width').every(r=>r.layoutCount>=115),'width updates trigger layout');
 assert.ok(reports.filter(r=>r.mode==='transform').every(r=>r.layoutCount<=1),'scale updates do not trigger layout');
 if(process.env.CHECK_RUNTIME){
  await page.evaluate(`fill.style.width='';fill.style.transform='';fill.style.transformOrigin='';fill.style.removeProperty('--helios-play');window.fakeTime=0;window.fakeDuration=video.duration;Object.defineProperty(video,'currentTime',{get:()=>fakeTime,configurable:true});Object.defineProperty(video,'duration',{get:()=>fakeDuration,configurable:true})`);
  for(const p of [0,.001,.5,.999,1]){
   await page.evaluate(`fakeTime=video.duration*${p};video.dispatchEvent(new Event('timeupdate'))`);await frame();
   const value=await page.evaluate('({width:fill.style.width,scale:new DOMMatrix(getComputedStyle(fill).transform).a,origin:getComputedStyle(fill).transformOrigin})');
   assert.equal(value.width,'');assert.ok(Math.abs(value.scale-p)<.00001,'the real timeupdate handler paints the requested scale');
  }
  for(const [duration,time,expected] of [['0','1',0],['Infinity','1',0],['5','NaN',0],['5','Infinity',0],['-1','1',0],['5','10',1],['5','-1',0]]){
   await page.evaluate(`fakeDuration=${duration};fakeTime=${time};video.dispatchEvent(new Event('timeupdate'))`);await frame();
   assert.ok(Math.abs(await page.evaluate('new DOMMatrix(getComputedStyle(fill).transform).a')-expected)<.00001,'finite bounded progress for invalid or out-of-range media times');
  }
  assert.equal(await page.evaluate(`new Promise(resolve=>{let writes=0;const observer=new MutationObserver(records=>writes+=records.length);observer.observe(fill,{attributes:true,attributeFilter:['style']});video.dispatchEvent(new Event('timeupdate'));requestAnimationFrame(()=>{observer.disconnect();resolve(writes)})})`),0,'duplicate progress does not write styles');
  await page.evaluate(`fakeDuration=5;fakeTime=2.5;video.dispatchEvent(new Event('timeupdate'));video.removeAttribute('data-media-active');video.dispatchEvent(new CustomEvent('media:carousel',{bubbles:true}))`);await frame();
  assert.equal(await page.evaluate('new DOMMatrix(getComputedStyle(fill).transform).a'),0,'clearing the active clip resets progress');
  assert.ok(await page.evaluate('Math.abs(parseFloat(getComputedStyle(fill).width)-fill.parentElement.clientWidth)<.02 && getComputedStyle(fill).transformOrigin.startsWith("0px")'),'shipped CSS keeps a fixed track width and left origin');
 }
 assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
 writeFileSync(out+'/report.json',JSON.stringify({base,reports},null,2));
}finally{await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId});cdp.close()}

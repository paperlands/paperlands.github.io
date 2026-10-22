// Injected-CSS knockout screen. Never changes authored files or the page's art.
// Serve a frozen build; CDP_PORT=9247 BASE=... node design/probe/render-knockout.mjs
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { connect, newPage } from './cdp.mjs';
const base = process.env.BASE || 'http://127.0.0.1:4004';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-render-knockout';
const repeats = Number(process.env.REPEATS || 1);
mkdirSync(out, { recursive: true });
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="none"><defs>
<radialGradient id="pigment" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(520 460) scale(560 580)"><stop stop-color="#0a0308"/><stop offset=".48" stop-color="#0a0308" stop-opacity="${179/255}"/><stop offset=".78" stop-color="#0a0308" stop-opacity="0"/></radialGradient>
<radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(520 460) scale(580 600)"><stop offset=".24" stop-color="white"/><stop offset=".60" stop-color="white" stop-opacity="${187/255}"/><stop offset=".94" stop-color="white" stop-opacity="0"/></radialGradient>
<mask id="mask" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="1000"><rect width="1000" height="1000" fill="url(#fade)"/></mask></defs><rect width="1000" height="1000" fill="url(#pigment)" mask="url(#mask)"/></svg>`;
const variants = {
  baseline: '',
  'flat-planes': '.helios-possibility__thought,.helios-possibility__body,.helios-possibility__light{transform:none}',
  'flat-body': '.helios-possibility__body{transform:none;isolation:auto}',
  'image-pool': `.helios-possibility__pool{background-image:url("data:image/svg+xml,${encodeURIComponent(svg)}");background-size:100% 100%;mask-image:none;-webkit-mask-image:none}`,
  'echo-no-filter': '.helios-possibility__echo img{filter:none}',
  'promote-atmosphere': '.helios-atmosphere::after{will-change:opacity}',
  'promote-stage': '.helios-possibility__stage{will-change:transform}',
  'paint-containment': '.helios-possibility__stage{contain:paint}',
};
const selected = (process.env.VARIANTS || Object.keys(variants).join(',')).split(',');
for (const name of selected) assert.ok(Object.hasOwn(variants, name), 'unknown variant ' + name);
const devices = (process.env.DEVICES || 'desktop,phone-4x').split(',');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const cdp = await connect(), page = await newPage(cdp), reports = [];
await page.s('Network.setBypassServiceWorker', { bypass: true });
await page.s('Performance.enable');
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__render = {recording:false,frames:[],previous:0};
  function sample(t) { const b=window.__render; if(b.recording&&b.previous)b.frames.push(t-b.previous);b.previous=b.recording?t:0;requestAnimationFrame(sample) } requestAnimationFrame(sample);
` });
const metrics = async () => Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m => [m.name,m.value]));
const jump = async () => {
  await page.evaluate(`(()=>{const e=document.querySelector('.helios-create'),r=e.getBoundingClientRect();scrollTo({top:scrollY+r.top+r.height*.25-innerHeight*.72,behavior:'instant'})})()`);
  await wait(700);
};
async function gesture(width, height, distance) {
  const y = await page.evaluate('scrollY');
  await page.s('Input.synthesizeScrollGesture', { x:Math.round(width*.7), y:Math.round(height*.55), yDistance:distance, speed:400, gestureSourceType:'mouse' });
  await wait(80);
  assert.ok(Math.abs(await page.evaluate('scrollY')-y)>30, 'gesture moved the page');
}
const shoot = async file => writeFileSync(file, Buffer.from((await page.s('Page.captureScreenshot', { format:'png' })).data,'base64'));
try {
  writeFileSync(out+'/environment.json',JSON.stringify({base,browser:await cdp.send('Browser.getVersion'),repeats,variants},null,2));
  for (const device of devices) {
    const [width,height,rate] = device === 'desktop' ? [1440,900,1] : [390,844,4];
    await page.s('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<850});
    await page.s('Emulation.setCPUThrottlingRate',{rate});
    await page.goto(base,2500); await page.evaluate('document.fonts.ready'); await jump();
    assert.equal(await page.evaluate('document.querySelectorAll("[data-scrub-ink]").length'),2);
    const distance = Math.round(await page.evaluate('document.querySelector(".helios-create").getBoundingClientRect().height*.28'));
    await page.evaluate(`window.__variant=document.createElement('style');document.head.append(__variant)`);
    for (let trial=0;trial<repeats;trial++) for (const name of trial%2 ? [...selected].reverse() : selected) {
      await page.evaluate(`__variant.textContent=${JSON.stringify(variants[name])}`); await jump();
      await gesture(width,height,-distance); await gesture(width,height,distance); // warm this treatment, including decoded ink
      await page.evaluate('window.__render.frames=[];window.__render.previous=0;window.__render.recording=true');
      const before = await metrics();
      await gesture(width,height,-distance); await gesture(width,height,distance);
      const after = await metrics(), samples = await page.evaluate('window.__render.recording=false;window.__render.frames');
      const values = [...samples].sort((a,b)=>a-b), pct=p=>values[Math.floor(values.length*p)]||0;
      const report={device,name,trial,distance,frames:values.length,p50:pct(.5),p95:pct(.95),max:Math.max(...values),
        slowRatio:values.filter(v=>v>25).length/values.length,
        totals:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration'].map(k=>[k,(after[k]-before[k])*1000]))};
      reports.push(report); console.log(JSON.stringify(report));
    }
    // Paired pixel comparison on the SAME frozen page/scroll/ink/video/animation
    // state, avoiding differences caused by independent media clocks or grain.
    await jump(); await page.evaluate(`document.querySelectorAll('video').forEach(v=>v.pause());document.getAnimations().forEach(a=>a.pause());__variant.textContent=''`); await wait(400);
    const baseline = `${out}/${device}-reference.png`; await shoot(baseline);
    for (const name of selected.filter(n=>n!=='baseline')) {
      await page.evaluate(`__variant.textContent=${JSON.stringify(variants[name])}`); await wait(150);
      assert.ok(await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'no overflow');
      const file=`${out}/${device}-${name}.png`; await shoot(file);
      const delta=JSON.parse(execFileSync('python3',['-c',`from PIL import Image,ImageChops,ImageStat
import json,sys
x=Image.open(sys.argv[1]).convert('RGB');y=Image.open(sys.argv[2]).convert('RGB');d=ImageChops.difference(x,y);s=ImageStat.Stat(d)
pixels=list(d.getdata());print(json.dumps({'meanRGB':sum(s.mean)/3,'maxChannel':max(v[1] for v in d.getextrema()),'changedOver2':sum(max(p)>2 for p in pixels)/len(pixels)}))`,baseline,file],{encoding:'utf8'}));
      console.log(JSON.stringify({device,name,visual:delta})); reports.push({device,name,visual:delta});
      await page.evaluate(`__variant.textContent=''`); await wait(150);
    }
    assert.deepEqual(page.console.filter(e=>e.type==='exception'),[],'no runtime exceptions');
    writeFileSync(out+'/report.json',JSON.stringify(reports,null,2));
  }
} finally { await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId});cdp.close(); }

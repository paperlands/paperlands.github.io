// BASE_URL=http://127.0.0.1:4022 node design/probe/experiences-tree.mjs
// One owned CDP target; evidence stays outside the published site.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { connect, newPage } from './cdp.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:4001';
const out = '/tmp/experiences-tree';
await mkdir(out, { recursive: true });
const cdp = await connect(), page = await newPage(cdp), report = [];
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let scripted = true;
const flush = () => scripted ? page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))') : wait(100);
async function visit() {
  await page.goto(`${base}/experiences.html`, 650);
  await page.evaluate('document.fonts.ready'); await flush();
}
async function place(fraction) {
  await page.evaluate(`(()=>{const b=document.querySelector('[data-stage-focus="gather"]').getBoundingClientRect();scrollTo({top:scrollY+b.top+b.height/2-innerHeight*${fraction},behavior:'instant'})})()`);
  await flush();
}
const state = () => page.evaluate(`(()=>{
  const f=document.querySelector('.experiences-seam-field'),s=getComputedStyle(f),images=[...f.querySelectorAll('img')];
  const seam=document.querySelector('.experiences-seam'),nav=document.querySelector('.experiences-jump');
  const before=[seam.offsetHeight,nav.offsetTop];f.hidden=true;const after=[seam.offsetHeight,nav.offsetTop];f.hidden=false;
  const branch=getComputedStyle(images[0]);
  const phrase=document.querySelector('[data-stage-focus="gather"]'),word=phrase.querySelector('.stage-focus__word'),ink=getComputedStyle(word);
  const bloom=+(getComputedStyle(phrase).getPropertyValue('--focus-bloom').trim()||'1');
  return {growth:+(s.getPropertyValue('--tree-growth').trim()||'1'),canopy:+getComputedStyle(images[1]).opacity,
    bloom,wordInk:ink.color,wordGlow:ink.textShadow,wordPose:phrase.style.getPropertyValue('--focus-bloom'),
    wordSize:[word.getBoundingClientRect().width,word.getBoundingClientRect().height],
    inline:f.style.cssText,display:s.display,position:s.position,layers:images.length,
    sameFrame:images.every(i=>+i.getAttribute('width')===640&&+i.getAttribute('height')===796),
    treeHeight:parseFloat(branch.height),fieldHeight:f.clientHeight,transform:branch.transform,
    words:[...document.querySelectorAll('.experiences-prelude p')].map(p=>p.textContent),before,after,
    overflow:document.documentElement.scrollWidth>innerWidth};
})()`);
async function shot(name) {
  await page.evaluate('Promise.all([...document.querySelectorAll(".experiences-seam-form")].map(i=>i.decode()))');
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
try {
  await page.s('Network.setCacheDisabled', { cacheDisabled: true });
  await page.s('Network.setBypassServiceWorker', { bypass: true });
  for (const [width,height] of [[1440,1000],[768,1024],[390,844],[375,667],[320,568],[1920,1080]]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:width<700 });
    await visit();
    assert.equal((await state()).canopy,0,'no early canopy while reading the hero');
    await place(.9); const seed=await state();
    await place(.72); const wood=await state();
    assert.equal(wood.canopy,0,'no blossoms before the phrase nears centre');
    assert.equal(wood.bloom,0,'the phrase waits for the canopy');
    assert.ok(wood.growth>seed.growth&&wood.growth<1,'wood grows first');
    if ([1440,390].includes(width)) await shot(`${width}-branches`);
    await place(.535); const budding=await state();
    assert.ok(budding.canopy>.35&&budding.canopy<.65,'canopy opens around the central reading line');
    await place(.5); const full=await state();
    assert.equal(full.growth,1); assert.equal(full.canopy,1,'complete canopy at screen centre');
    assert.equal(full.bloom,1); assert.equal(budding.bloom,budding.canopy,'word and blossoms share one clock');
    assert.notEqual(full.wordInk,wood.wordInk); assert.notEqual(full.wordGlow,wood.wordGlow);
    assert.deepEqual(full.wordSize,wood.wordSize,'light never moves or scales the words');
    assert.equal(full.layers,2,'one tree, complementary wood and leaf layers');
    assert.ok(full.sameFrame); assert.equal(full.position,'absolute');
    assert.ok(Math.abs(full.treeHeight/full.fieldHeight-.86)<.01,'smaller silhouette');
    const matrix=full.transform.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);
    assert.ok(matrix[1]<-.15&&matrix[1]>-.2,'ten-degree left tilt');
    assert.deepEqual(full.before,full.after,'art adds no layout height');
    assert.ok(!full.overflow); assert.deepEqual(full.words,seed.words);
    if ([1440,390].includes(width)) await shot(`${width}-canopy`);
    const frozen=await state(); await wait(200);
    assert.deepEqual(await state(),frozen,'no idle animation in tree or phrase');
    await place(.72); const reverse=await state();
    assert.equal(reverse.growth,wood.growth); assert.equal(reverse.canopy,0,'scrolling back retraces');
    report.push({width,seed:seed.growth,wood:wood.growth,budding:budding.canopy,full:full.canopy});
  }
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await flush(); let s=await state();
  assert.equal(s.growth,1); assert.equal(s.canopy,1); assert.equal(s.inline,'','reduced motion clears previous poses');
  assert.equal(s.bloom,1); assert.equal(s.wordPose,'','reduced motion keeps the settled gold phrase');
  await shot('reduced-motion');
  await page.s('Emulation.setEmulatedMedia',{features:[]}); await flush();
  assert.equal((await state()).canopy,0,'live preference change resumes the scroll pose');
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  await flush(); assert.equal((await state()).display,'none');
  await page.s('Emulation.setEmulatedMedia',{features:[]});
  const {identifier}=await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`if(navigator.connection)Object.defineProperty(navigator.connection,'saveData',{get:()=>true});`});
  await visit(); s=await state(); assert.equal(s.canopy,1); assert.equal(s.inline,'','Save-Data gets the complete still');
  assert.equal(s.bloom,1); assert.equal(s.wordPose,'','Save-Data keeps the settled gold phrase');
  await page.s('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  scripted=false; await page.s('Emulation.setScriptExecutionDisabled',{value:true});
  await visit(); await place(.5); s=await state();
  assert.equal(s.growth,1); assert.equal(s.canopy,1); assert.equal(s.inline,'');
  assert.equal(s.bloom,1); assert.equal(s.wordPose,'','no-JavaScript phrase is complete');
  await page.s('Emulation.setScriptExecutionDisabled',{value:false});
  assert.ok(!page.requests.some(url=>url.includes('/assets/lib/hatch/')),'no visitor-side interpreter');
  assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
  assert.deepEqual([...page.responses].filter(([url,status])=>url.startsWith(base)&&status>=400),[]);
  await writeFile(`${out}/report.json`,JSON.stringify({passed:true,report},null,2));
  console.log(JSON.stringify({passed:true,report,evidence:out},null,2));
} finally { await page.s('Page.close'); cdp.close(); }

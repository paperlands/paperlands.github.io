// BASE_URL=http://127.0.0.1:4001 node design/probe/experiences-focus.mjs
// Owns one browser target. Evidence is written only to /tmp.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { connect, newPage } from './cdp.mjs';
const base = process.env.BASE_URL || 'http://127.0.0.1:4001';
const out = '/tmp/experiences-focus';
await mkdir(out, { recursive: true });
const cdp = await connect(), page = await newPage(cdp);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
function check(ok, name) { assert.ok(ok, name); checks.push(name); }
let scripted = true;
const flush = () => scripted ? page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))') : Promise.resolve();
async function visit() {
  await page.goto(`${base}/experiences.html`, 1000);
  await page.evaluate('document.fonts.ready');
  await flush();
}
async function shot(name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function place(kind, line = .52) {
  await page.evaluate(`(() => {
    const b = document.querySelector('[data-stage-focus="${kind}"]').getBoundingClientRect();
    scrollTo({top:scrollY + b.top + b.height*.5 - innerHeight*${line}, behavior:'instant'});
  })()`);
  await wait(180); await flush();
}
async function state() {
  return page.evaluate(`(() => ({
    overflow:document.documentElement.scrollWidth > innerWidth,
    hero:!!document.querySelector('h1 em') && !document.querySelector('h1 [data-stage-focus]'),
    letter:(() => {
      const el=document.querySelector('.experiences-prelude'), ps=[...el.querySelectorAll('p')];
      const first=getComputedStyle(ps[0]), body=getComputedStyle(ps[1]);
      const spark=el.querySelector('.experiences-letter-ember'), life=el.querySelector('.stage-focus__word');
      return {copy:ps.map(p=>p.textContent.replace(/\\s+/g,' ').trim()),
        firstStyle:first.fontStyle,firstSize:parseFloat(first.fontSize),
        bodyStyle:body.fontStyle,bodySize:parseFloat(body.fontSize),bodyGlow:body.textShadow,
        lifeGlow:getComputedStyle(life).textShadow,
        readable:ps.every(p=>getComputedStyle(p).opacity==='1'),
        contained:ps.every(p=>{const b=p.getBoundingClientRect();return b.left>=-1 && b.right<=innerWidth+1;}),
        sparkDecorative:!spark || spark.getAttribute('aria-hidden')==='true',
        sparkDisplay:spark?getComputedStyle(spark).display:'none',
        attached:getComputedStyle(el).paddingTop==='0px' && el.firstElementChild===ps[0] && Math.abs(ps[0].getBoundingClientRect().top-el.previousElementSibling.getBoundingClientRect().bottom)<1,
        foldBottom:ps[0].getBoundingClientRect().bottom+scrollY};
    })(),
    words:[...document.querySelectorAll('[data-stage-focus]')].map(el => {
      const s=getComputedStyle(el), w=el.querySelector('.stage-focus__word'), svg=el.querySelector('svg'), b=w.getBoundingClientRect();
      return {kind:el.dataset.stageFocus,text:w.textContent,ink:+s.getPropertyValue('--focus-progress'),heat:+s.getPropertyValue('--focus-heat'),
        pool:+s.getPropertyValue('--focus-pool'),dry:+s.getPropertyValue('--focus-dry'),inline:el.style.cssText,
        readable:getComputedStyle(w).opacity==='1' && getComputedStyle(w).color!=='rgba(0, 0, 0, 0)',
        contained:b.left>=-1 && b.right<=innerWidth+1,
        decorative:svg.getAttribute('aria-hidden')==='true' && svg.getAttribute('focusable')==='false' && getComputedStyle(svg).pointerEvents==='none',
        inkColor:getComputedStyle(svg).color,key:s.getPropertyValue('--light-key').trim(),svgDisplay:getComputedStyle(svg).display};
    }),
    passages:[...document.querySelectorAll('[data-stage-passage]')].map(el => ({heat:el.style.getPropertyValue('--passage-heat'),inline:el.style.cssText})),
    jumps:[...document.querySelectorAll('.experiences-jump a')].map(a=>getComputedStyle(a).color)
  }))()`);
}
try {
  await page.s('Network.setCacheDisabled', {cacheDisabled:true});
  await page.s('Network.setBypassServiceWorker', {bypass:true});
  for (const [width,height] of [[1440,900],[768,1024],[430,932],[390,844],[375,667],[360,740],[320,640],[640,360]]) {
    await page.s('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
    await page.s('Emulation.setEmulatedMedia',{features:[]});
    await visit();
    let s=await state();
    check(s.hero,`${width}: independent hero Stage`);
    // The page owns copy and movement order; this probe owns motion hooks.
    // Editorial changes must not masquerade as rendering regressions.
    assert.deepEqual(s.words.map(w=>w.kind).sort(),['create','explore','gather','invite','lead']);
    check(s.words.every(w=>w.text.trim().length>0),`${width}: authored focus words are present`);
    check(s.words.every(w=>w.decorative && w.readable && w.contained) && !s.overflow,`${width}: silent ink, intact readable words, no overflow`);
    check(s.words.every(w=>w.key==='#f6c87e'),`${width}: one practical pigment`);
    check(s.jumps.every(c=>c==='rgb(255, 153, 51)'),`${width}: orange reserved for actions`);
    if ([1440,390,375,320].includes(width)) await shot(`${width}-hero`);
    const authoredCopy=[...s.letter.copy];
    check(authoredCopy.length===4 && authoredCopy.every(text=>text.length>10),`${width}: all four authored paragraphs are present`);
    check(s.letter.copy[3].trim().endsWith('life.'),`${width}: the authored invitation still ends in life`);
    if (width<=700 && height>=600) check(s.letter.foldBottom<=height-16,`${width}×${height}: the whole opening thought is visible in the mobile hero`);
    check(s.letter.firstStyle==='italic' && s.letter.firstSize>s.letter.bodySize && s.letter.attached && s.letter.bodyStyle==='normal',`${width}: letter has an intimate opening and clear upright prose`);
    check(s.letter.readable && s.letter.contained && s.letter.sparkDecorative && s.letter.bodyGlow==='none' && s.letter.lifeGlow!=='none',`${width}: letter stays crisp; life catches light without moving the opening`);
    await page.evaluate(`(() => {
      const b=document.querySelector('.experiences-prelude').getBoundingClientRect();
      scrollTo({top:scrollY+b.top+b.height*.5-innerHeight*.52,behavior:'instant'});
    })()`);
    await wait(180); await flush();
    if ([1440,390,320].includes(width)) await shot(`${width}-letter`);
    for (const kind of ['invite','gather','explore','create','lead']) {
      await place(kind);
      s=await state(); const word=s.words.find(w=>w.kind===kind);
      check(word.heat>.2 && word.heat<=.24 && word.ink>.8,`${width}: ${kind} catches a restrained reading light`);
      check(s.words.filter(w=>w.heat>0).length===1,`${width}: ${kind} is the sole word in key`);
      check(s.passages.filter(p=>+p.heat>0).length<=1,`${width}: at most one practical leads`);
      check(!s.overflow && s.words.every(w=>w.contained && w.readable),`${width}: ${kind} never moves or hides the copy`);
      assert.deepEqual(s.letter.copy,authoredCopy,'scroll styling never rewrites the authored letter');
      const frozen=JSON.stringify(s);
      await wait(240);
      check(JSON.stringify(await state())===frozen,`${width}: ${kind} ink has no idle animation`);
      if (width===1440 || width===390) await shot(`${width}-${kind}`);
    }
    await place('explore',.5); const late=(await state()).words.find(w=>w.kind==='explore');
    await place('explore',.8); const early=(await state()).words.find(w=>w.kind==='explore');
    check(early.ink<late.ink && early.dry<late.dry && early.pool<late.pool,`${width}: pressure and dry edge retrace with scroll`);
  }
  await page.s('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await visit(); await place('explore');
  let s=await state();
  check(s.words.every(w=>w.ink===1 && w.heat===.12 && w.pool===1 && w.dry===1 && !w.inline), 'reduced motion: authored still, no runtime pose');
  check(s.passages.every(p=>!p.inline),'reduced motion: static room');
  await shot('reduced-motion');
  await page.s('Emulation.setEmulatedMedia',{features:[]}); await flush();
  check((await state()).words.some(w=>w.inline),'live preference change resumes');
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]}); await flush();
  check((await state()).words.every(w=>!w.inline),'live preference change clears all previous poses');
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'forced-colors',value:'active'}]});
  await visit(); s=await state();
  check(s.words.every(w=>w.readable && w.svgDisplay==='none' && !w.inline),'forced colours: solid system ink, no decoration');
  check(s.letter.sparkDisplay==='none' && s.letter.lifeGlow==='none' && s.letter.readable,'forced colours: the letter sheds all glow, not its words');
  await shot('forced-colors');
  await page.s('Emulation.setEmulatedMedia',{features:[]});
  const {identifier}=await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`if(navigator.connection)Object.defineProperty(navigator.connection,'saveData',{get:()=>true});`});
  await visit(); await place('lead'); s=await state();
  check(s.words.every(w=>!w.inline) && s.passages.every(p=>!p.inline),'Save-Data: no runtime pose writes');
  await page.s('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  scripted = false;
  await page.s('Emulation.setScriptExecutionDisabled',{value:true});
  await visit(); await place('gather'); s=await state();
  check(s.words.length===5 && s.words.every(w=>w.readable && w.ink===1 && !w.inline) && !s.overflow,'no JS: complete resting drawing and all words');
  await shot('no-js');
  await page.s('Emulation.setScriptExecutionDisabled',{value:false});
  const failures=[...page.responses].filter(([url,status])=>url.startsWith(base)&&status>=400);
  assert.deepEqual(failures,[]); assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
  await writeFile(`${out}/report.json`,JSON.stringify({passed:true,checks},null,2));
  console.log(JSON.stringify({passed:true,checks:checks.length,evidence:out},null,2));
} finally { await page.s('Page.close'); cdp.close(); }

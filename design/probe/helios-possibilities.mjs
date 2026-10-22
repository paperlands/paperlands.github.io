// CDP_PORT=9235 node design/probe/helios-possibilities.mjs
// The field is invariant across automatic folds; only a deliberate navigation
// may call scrollTo. Screenshots show the actual hatch, never a stand-in SVG.
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const base = process.env.PROBE_BASE || 'http://127.0.0.1:4001/';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-folds';
mkdirSync(out, { recursive: true });
const cdp = await connect();
const page = await newPage(cdp);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const checks = [];
function check(condition, name) { assert.ok(condition, name); checks.push(name); console.log('PASS', name); }
async function shoot(name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function state() {
  return page.evaluate(`(() => {
    const root=document.querySelector('[data-possibilities]');
    const scene=root.querySelector('[data-current]');
    const folds=root.querySelector('.helios-possibilities__chapters');
    const open=root.querySelector('[data-chapter][open]');
    const box=folds.getBoundingClientRect(), surface=root.querySelector('.helios-possibilities__surface').getBoundingClientRect();
    return {open:open?.dataset.chapter, scene:scene?.dataset.life, ready:scene?.hasAttribute('data-drawing-ready'),
      canvas:root.querySelector('canvas')?.closest('[data-life]')?.dataset.life,
      light:scene?.style.getPropertyValue('--ink-light'), spiral:scene?.style.getPropertyValue('--spiral'),
      growth:scene?.style.getPropertyValue('--growth'), drawing:scene?.dataset.drawing,
      height:document.documentElement.scrollHeight,y:scrollY,overflow:document.documentElement.scrollWidth>innerWidth,
      headerTop:open?.querySelector('summary').getBoundingClientRect().top,
      foldTop:box.top, fieldTop:surface.top,fieldBottom:surface.bottom,
      closed:[...root.querySelectorAll('[data-chapter]:not([open]) summary')].map(s=>s.getBoundingClientRect().top),
      calls:window.__scrollCalls};
  })()`);
}
async function link(id) {
  await page.evaluate(`document.querySelector('[data-who-card] [data-possibility-link="${id}"]').scrollIntoView({block:'center',behavior:'instant'})`);
  await sleep(400);
  await page.evaluate(`document.querySelector('[data-who-card] [data-possibility-link="${id}"]').click()`);
  await sleep(1800);
  for(let i=0;i<60;i++) {
    if(await page.evaluate(`!!document.querySelector('[data-life="${id}"][data-current][data-drawing-ready]')`)) return;
    await sleep(150);
  }
  throw new Error('The chosen becoming identity did not settle: '+id);
}
let visits = 0;
async function visit(hash='', wait=1500) {
  // A new document, not Page.navigate's same-fragment no-op: Save-Data and
  // no-JS assertions must actually exercise startup.
  const url = new URL(base);
  url.searchParams.set('probe', `${Date.now()}-${++visits}`);
  url.hash = hash;
  await page.goto(url.href, wait);
  for(let i=0;i<80;i++) {
    if(await page.evaluate(`document.readyState==='complete' && !!document.querySelector('[data-possibilities]')`)) {
      await page.evaluate(`document.fonts.ready`);
      return;
    }
    await sleep(100);
  }
  throw new Error('Possibilities document did not load: '+JSON.stringify(Object.fromEntries(page.responses)));
}
async function step(index, local=.08) {
  const target = await page.evaluate(`(() => {
    const j=document.querySelector('[data-fold-journey]'),f=document.querySelector('.helios-possibilities__chapters');
    const y=scrollY+j.getBoundingClientRect().top-(parseFloat(getComputedStyle(f).top)||0)+(j.offsetHeight-f.offsetHeight)*(${index}+${local})/3;
    window.dispatchEvent(new WheelEvent('wheel')); // A real scroll interrupts click navigation.
    (window.__nativeScrollTo||window.scrollTo.bind(window))({top:y,behavior:'instant'});return y;
  })()`);
  await sleep(600);
  await page.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  return target;
}
async function ready() {
  for(let i=0;i<120 && !(await state()).ready;i++) await sleep(300);
  check((await state()).ready,'Live drawing settles');
  await sleep(700);
}
try {
  await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await visit();
  check((await state()).open==='creators','Creators open initially');
  check(!page.requests.some(url=>url.includes('/assets/lib/hatch/')),'Hatch remains lazy above the field');
  check(await page.evaluate(`!document.querySelector('.helios-possibility__thought img')`),'No preview image in the drawing plane');
  check(await page.evaluate(`(()=>{const d=id=>document.querySelector('[data-chapter="'+id+'"]'),g=id=>d(id).dataset;return !g('creators').grows && !!g('inquiry').grows && !!g('leaders').grows && +g('inquiry').growsFrom<+g('inquiry').growsTo && +g('leaders').growsFrom<+g('leaders').growsTo && d('leaders').hasAttribute('data-grows-wide') && !d('inquiry').hasAttribute('data-grows-wide')})()`),'Each scene declares its own growth in the data: the line, the two ends, and whether it needs the wide runway');
  check(await page.evaluate(`(()=>{const s=document.querySelector('[data-experience-seam]');return !document.querySelector('.helios-possibilities__bridge') && s.querySelectorAll('h2').length===1 && s.querySelectorAll('p,ul,ol,li').length===0 && s.nextElementSibling.matches('[data-fold-journey]')})()`),'The transition is one thought, not another explanatory section');
  check(await page.evaluate(`document.querySelector('#possibilities-title').textContent.replace(/\\s+/g,' ').trim()==='Math is to be experienced. Shared in common.'`),'Shared in common is the new invitation');
  check(await page.evaluate(`getComputedStyle(document.querySelector('.helios-possibilities__electric')).color==='rgb(255, 153, 51)' && getComputedStyle(document.querySelector('.helios-possibilities__sharing em')).color==='rgb(255, 234, 195)'`),'Experienced is classic orange; in common inherits the brilliant warm light');
  await page.evaluate(`const s=document.querySelector('[data-experience-seam]');scrollTo({top:scrollY+s.getBoundingClientRect().top-400,behavior:'instant'})`);
  await sleep(1000);await shoot('desktop-becoming-transition');
  check(await page.evaluate(`document.querySelectorAll('[data-experience-seam] svg[aria-hidden="true"]').length===2`),'The two hand-drawn gestures are decorative, not extra controls');
  await link('creators');
  await ready();
  const first=await state();
  check(first.scene==='creators' && first.canvas==='creators','One real canvas lives behind the creative students');
  check(Math.abs(first.headerTop-first.foldTop)<2,'Open header anchors at the top');
  check(first.closed.every(top=>top>=first.fieldBottom-2),'Unopened headers wait below the field');
  await shoot('desktop-creators');
  await page.evaluate(`window.__scrollCalls=[];window.__nativeScrollTo=window.scrollTo.bind(window);
    window.scrollTo=(...a)=>{window.__scrollCalls.push('scrollTo');window.__nativeScrollTo(...a)};
    const by=window.scrollBy.bind(window);window.scrollBy=(...a)=>{window.__scrollCalls.push('scrollBy');by(...a)};`);
  await step(0,.5);
  const lit=await state();
  if(Math.abs(lit.fieldTop-first.fieldTop)>=1) console.log('Anchor diagnostics',JSON.stringify({first,lit}));
  check(lit.light!==first.light && lit.spiral!==first.spiral,'Scroll changes the ink ladder and the slow spiral');
  check(Math.abs(lit.fieldTop-first.fieldTop)<1,'Canvas field stays anchored while passing');
  await shoot('desktop-creators-light');
  for(const [index,id] of [[1,'inquiry'],[2,'leaders'],[1,'inquiry']]) {
    const requested=await step(index);
    const current=await state();
    check(current.scene===id,'Scroll unfolds '+id);
    check(current.height===first.height,'Fold preserves document height');
    check(Math.abs(current.y-requested)<2,'No scroll compensation at the fold');
    check(Math.abs(current.fieldTop-first.fieldTop)<1,'Field remains at the same screen position');
    check(current.closed.every(top=>top>=current.fieldBottom-2),'Unopened folds remain at the foot');
    await ready();
    await shoot('desktop-'+id);
  }
  check((await state()).calls.length===0,'Automatic folds never call scrollTo or scrollBy');
  check(await page.evaluate(`getComputedStyle(document.querySelector('[data-current] canvas')).animationName==='helios-ink-glint'`),'Glint is on the drawing itself');
  await step(2,.08);await ready();
  const seed=await state();await shoot('desktop-leaders-seed');
  await step(2,.93);await ready();
  const grown=await state();await shoot('desktop-leaders-grown');
  check(seed.drawing==='leaders:2' && grown.drawing==='leaders:6' && +grown.growth>+seed.growth,'The live spiral and its light grow outward with passage');
  check(grown.height===seed.height && Math.abs(grown.fieldTop-seed.fieldTop)<1,'Growth leaves the field and the people anchored');
  await step(1,.08);await ready();
  const before=(await state()).height;
  await page.evaluate(`document.querySelector('#become-inquiry summary').click()`);
  await sleep(400);
  check(!(await state()).open && (await state()).height<before-2000,'All folds closed removes the entire empty runway');
  check(await page.evaluate(`document.querySelector('[data-fold-journey]').offsetHeight<240 && document.querySelector('.helios-possibilities__chapters').getBoundingClientRect().top>0`),'The closed stack returns to the becoming seam');
  await shoot('desktop-all-closed');
  check(await page.evaluate(`document.querySelectorAll('.helios-possibility__mark[aria-hidden="true"] img').length===3 && [...document.querySelectorAll('.helios-possibility__mark img')].every(i=>i.complete&&i.naturalWidth>0)`),'All three closed signatures resolve and stay outside the accessible control name');
  check(await page.evaluate(`getComputedStyle(document.querySelector('.helios-possibility__mark')).pointerEvents==='none'`),'The signatures never intercept the fold click');
  await page.evaluate(`scrollBy({top:80,behavior:'instant'})`);await sleep(400);
  check(!(await state()).open,'Passing the closed stack does not reopen it');
  await page.s('Page.bringToFront');
  await page.evaluate(`document.querySelector('#become-inquiry summary').focus({preventScroll:true})`);
  await page.s('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await page.s('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await sleep(1300);
  check((await state()).scene==='inquiry','Keyboard unfolds the same composition');
  await page.s('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  await page.s('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
  check(await page.evaluate(`document.activeElement.matches('.helios-possibility__more') && document.activeElement.closest('[data-life]').dataset.life==='inquiry'`),'Tab follows the open header into its actual story');
  check(await page.evaluate(`[...document.querySelector('.helios-possibilities__chapters').children].map(n=>n.id||'field').join(',')==='become-inquiry,field,become-leaders,become-creators'`),'Reading order matches the visible folds');
  await link('leaders');
  check((await state()).scene==='leaders','Becoming identity still enters its corresponding life');
  await page.evaluate(`document.querySelector('.helios-possibilities__opening').scrollIntoView({behavior:'instant'})`);
  await sleep(700);await shoot('desktop-invitation');
  check(!(await state()).overflow,'Desktop has no horizontal overflow');

  await page.s('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await visit('',1400);await link('creators');await ready();
  const mobile=await state();
  check(mobile.headerTop<90 && mobile.closed.every(top=>top>=mobile.fieldBottom-2),'Mobile keeps open header above and closed folds below');
  check(mobile.closed.every(top=>top<844),'Mobile fold controls fit inside the viewport');
  await shoot('mobile-creators');
  await step(1);check((await state()).scene==='inquiry','Mobile scroll unfolds Inquiry');
  await ready();await shoot('mobile-inquiry');
  check(!(await state()).overflow,'Mobile has no horizontal overflow');
  await page.evaluate(`document.querySelector('#become-inquiry summary').click()`);await sleep(500);
  check(await page.evaluate(`!document.querySelector('[data-chapter][open]') && document.querySelector('[data-fold-journey]').offsetHeight<180`),'Mobile closing removes the pinned field too');
  await shoot('mobile-all-closed');
  await link('inquiry');check((await state()).scene==='inquiry','A closed mobile stack can unfold again');
  await page.s('Emulation.setDeviceMetricsOverride',{width:320,height:640,deviceScaleFactor:1,mobile:true});
  await link('leaders');await ready();await shoot('narrow-mobile-leaders');
  check(!(await state()).overflow,'Narrow mobile has no horizontal overflow');
  check((await state()).closed.every(top=>top<640),'Narrow mobile fold controls remain visible');
  check((await state()).drawing==='leaders','Without the runway a declared growth keeps the settled programme, at the count it names');

  await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await visit('become-leaders');await ready();
  check((await state()).scene==='leaders' && Math.abs((await state()).foldTop-60.8)<2,'A fresh direct Leaders address arrives in its runway, after native fragment scrolling');
  check(await page.evaluate(`document.querySelector('[data-life="leaders"] .helios-possibility__body img').getAttribute('src').endsWith('/leaders-group.webp')`),'Fellowship restores the supplied group, with no generated people');
  await shoot('desktop-leaders-direct');
  await page.s('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await visit('become-leaders');await ready();
  check((await state()).scene==='leaders','A fresh mobile Leaders address settles too');
  await shoot('mobile-leaders-direct');
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await visit('become-inquiry');await ready();
  check((await state()).scene==='inquiry','Reduced motion deep link opens Inquiry');
  check(await page.evaluate(`getComputedStyle(document.querySelector('.helios-possibilities__chapters')).position==='relative'`),'Reduced motion has no pinned runway');
  check(await page.evaluate(`getComputedStyle(document.querySelector('[data-current] canvas')).animationName==='none'`),'Reduced motion has a real settled drawing with no glint animation');
  check(await page.evaluate(`getComputedStyle(document.querySelector('.helios-possibilities__electric path')).animationName==='none'`),'The seam respects reduced motion too');
  const {identifier}=await page.s('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator.connection,'saveData',{get:()=>true})`});
  const requests=page.requests.length;
  await visit('become-creators');
  check(!page.requests.slice(requests).some(url=>url.includes('/assets/lib/hatch/')),'Save-Data never fetches Hatch');
  check((await state()).scene==='creators','Save-Data keeps people, echoes and the poem');
  await page.s('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  await page.s('Emulation.setScriptExecutionDisabled',{value:true});
  await visit('',1200);
  check(await page.evaluate(`document.querySelector('#become-creators').open && !document.querySelector('[data-possibilities-enhanced]')`),'No-JS native folds remain readable');
  const errors=page.console.filter(m=>['exception','error'].includes(m.type));
  check(errors.length===0,'No runtime exceptions');
  writeFileSync(out+'/report.json',JSON.stringify({checks,errors,responses:Object.fromEntries(page.responses)},null,2));
  console.log('Evidence:',out);
} finally {
  await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId});
  cdp.close();
}

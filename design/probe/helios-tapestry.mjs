// CDP_PORT=9241 PROBE_BASE=http://127.0.0.1:4011/ node design/probe/helios-tapestry.mjs
// Tests only the closed-fold cloth. No live-player, photo or scroll rewrite.
import {connect,newPage} from './cdp.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const base=process.env.PROBE_BASE || 'http://127.0.0.1:4001/';
const out='/tmp/helios-tapestry';
mkdirSync(out,{recursive:true});
const c=await connect(),p=await newPage(c);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const checks=[];
function check(value,name){assert.ok(value,name);checks.push(name);console.log('PASS',name)}
async function wait(expression){for(let i=0;i<80;i++){if(await p.evaluate(expression))return;await sleep(100)}throw Error('Not ready: '+expression)}
async function visit(label){await p.goto(base+'?tapestry='+Date.now()+'-'+label,1200);await wait(`!!document.querySelector('[data-possibilities-enhanced]')`);await p.evaluate('document.fonts.ready')}
async function shot(label){const{data}=await p.s('Page.captureScreenshot',{format:'png'});writeFileSync(out+'/'+label+'.png',Buffer.from(data,'base64'))}
async function close(){await p.evaluate(`document.querySelector('[data-chapter][open] summary').click()`);await wait(`!!document.querySelector('[data-folds-closed]')`);await sleep(700);await wait(`[...document.querySelectorAll('.helios-possibility__mark img')].every(i=>i.complete&&i.naturalWidth>0)`)}
try{
  await p.s('Page.bringToFront');
  await p.s('Page.addScriptToEvaluateOnNewDocument',{source:`Object.defineProperty(navigator.connection,'saveData',{get:()=>true})`});
  for(const[w,h]of[[1440,900],[1024,768],[390,844],[320,640]]){
    await p.s('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<851});
    await visit(w);await close();
    const state=await p.evaluate(`(()=>{const f=document.querySelector('[data-fold-journey]');return{overflow:document.documentElement.scrollWidth>innerWidth,height:f.offsetHeight,rows:[...document.querySelectorAll('[data-chapter] summary')].map(s=>{const m=s.querySelector('.helios-possibility__mark'),i=m.querySelector('img');return{height:s.getBoundingClientRect().height,width:s.getBoundingClientRect().width,cloth:m.getBoundingClientRect().width,clipped:getComputedStyle(s).overflow==='hidden',passive:getComputedStyle(m).pointerEvents==='none',decorative:m.getAttribute('aria-hidden')==='true'&&i.alt==='',native:i.naturalWidth}})}})()`);
    check(!state.overflow,w+'px: no horizontal page overflow');
    check(state.height<(w<851?180:240),w+'px: the closed stack stays compact');
    check(state.rows.every(r=>r.clipped&&r.passive&&r.decorative&&r.native===1200),w+'px: cloth crops inside the header, never inside its control name');
    check(state.rows.every(r=>r.cloth>r.width*.65),w+'px: a broad field, not a stretched badge');
    await shot('closed-'+w);
    const before=await p.evaluate(`document.querySelector('[data-chapter="creators"] summary').getBoundingClientRect().height`);
    await p.evaluate(`document.querySelector('[data-chapter="creators"] summary').click()`);
    await sleep(800);
    check(await p.evaluate(`getComputedStyle(document.querySelector('[data-chapter="creators"] .helios-possibility__mark')).opacity==='0'`),w+'px: the chosen tapestry withdraws');
    check(await p.evaluate(`Math.abs(document.querySelector('[data-chapter="creators"] summary').getBoundingClientRect().height-${before})<1`),w+'px: opening does not enlarge the header');
    await close();
  }
  await p.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await visit('keyboard');await close();
  await p.evaluate(`document.querySelector('#become-inquiry summary').focus({preventScroll:true})`);
  await p.s('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
  await p.s('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  await sleep(800);
  check(await p.evaluate(`document.querySelector('#become-inquiry').open`),'Keyboard enters the same fold');
  await p.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await visit('reduced');await close();
  check(await p.evaluate(`[...document.querySelectorAll('.helios-possibility__mark')].every(m=>getComputedStyle(m).animationName==='none')`),'Reduced motion: no drifting or animated cloth');
  await p.s('Emulation.setScriptExecutionDisabled',{value:true});
  await p.goto(base+'?tapestry-native='+Date.now(),1200);
  await wait(`document.querySelectorAll('[data-chapter]').length===3`);
  check(await p.evaluate(`!document.querySelector('[data-possibilities-enhanced]') && document.querySelector('#become-creators').open`),'No-JS: the original native fold remains available');
  await p.evaluate(`document.querySelector('#become-inquiry').open=true;document.querySelector('#become-inquiry').scrollIntoView({behavior:'instant'})`);
  await sleep(700);
  check(await p.evaluate(`getComputedStyle(document.querySelector('#become-inquiry .helios-possibility__mark')).opacity==='0'`),'No-JS: opening also withdraws the cloth');
  const errors=p.console.filter(m=>['exception','error'].includes(m.type));
  check(!errors.length,'No runtime errors');
  writeFileSync(out+'/report.json',JSON.stringify({checks,errors,responses:Object.fromEntries(p.responses)},null,2));
  console.log('Evidence:',out);
}finally{await c.send('Target.closeTarget',{targetId:(await p.s('Target.getTargetInfo')).targetInfo.targetId});c.close()}

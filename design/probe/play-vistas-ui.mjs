import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const cdp = await connect(), page = await newPage(cdp);
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8813/design/iterations/16-play-vistas.html';
const output = process.env.PROBE_OUTPUT || '/tmp/play-vistas-evidence';
mkdirSync(output, {recursive:true}); let checks = 0;
const check = (value, label) => { checks++; if (!value) throw new Error(label); };
const click = s => page.evaluate(`document.querySelector(${JSON.stringify(s)}).click()`);
const waitFinished = async () => {
  for (let n = 0; n < 140; n++) {
    const result = await page.evaluate(`({status:document.querySelector('#execution-status').textContent,error:document.querySelector('#fault').hidden?null:document.querySelector('#fault').textContent})`);
    if (result.error) throw new Error(result.error);
    if (result.status.includes('finished')) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Native UI drawing did not finish');
};
try {
  await page.s('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  await page.goto(base);
  check(await page.evaluate(`!document.querySelector('#runtime').hasAttribute('src')`),'no autoplay/runtime import');
  for (const key of ['halfway','dance','room','word']) {
    await click(`.vistas a[href="#${key}"]`);
    check(await page.evaluate(`document.querySelector('#definition').value.startsWith('def ')`),`${key}: real definition`);
    check(await page.evaluate(`document.documentElement.scrollWidth<=innerWidth && document.documentElement.scrollHeight<=innerHeight+1`),`${key}: desktop one-screen containment`);
    for (const mode of [0,1,2]) {
      await click(`[data-mode="${mode}"]`); await click('#say'); await waitFinished();
      check(await page.evaluate(`document.querySelector('#runtime').classList.contains('ready')`),`${key}/${mode}: native canvas shown`);
      check(await page.evaluate(`document.querySelector('#executed').textContent.includes(document.querySelector('#definition').value)`),`${key}/${mode}: visible definition in exact source`);
      const shot=await page.s('Page.captureScreenshot',{format:'png'});
      writeFileSync(`${output}/${key}-${mode}-desktop.png`,Buffer.from(shot.data,'base64'));
    }
  }
  await click('.vistas a[href="#halfway"]'); await click('[data-mode="0"]'); await waitFinished();
  const original=await page.evaluate(`document.querySelector('#call').value`);
  await page.evaluate(`document.querySelector('#call').focus();document.querySelector('#call').value=${JSON.stringify('halfway 80 120\nspeck')};document.querySelector('#call').dispatchEvent(new Event('input',{bubbles:true}));`);
  check(await page.evaluate(`!document.querySelector('#runtime').classList.contains('ready')`),'edited source retires previous output');
  await click('#keep'); await click('#begin');
  check(await page.evaluate(`document.querySelectorAll('#kept button').length===1`),'begin does not erase kept spell');
  await click('#undo'); await waitFinished();
  check(await page.evaluate(`document.querySelector('#call').value===${JSON.stringify('halfway 80 120\nspeck')}`),'undo restores child call');
  await click('#undo'); await waitFinished();
  check(await page.evaluate(`document.querySelector('#call').value===${JSON.stringify(original)}`),'edit is one undoable state');
  await click('#source-button');
  check(await page.evaluate(`document.querySelector('#source').open && document.activeElement.closest('#source')!==null`),'source dialog contains focus');
  await page.s('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27}); await page.s('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await new Promise(r=>setTimeout(r,120));
  check(await page.evaluate(`!document.querySelector('#source').open`),'Escape closes dialog');
  await page.evaluate(`document.querySelector('#call').focus();document.querySelector('#call').value='noSuchIncantation 12';document.querySelector('#call').dispatchEvent(new Event('input',{bubbles:true}));`);
  await click('#say'); await new Promise(r=>setTimeout(r,1200));
  check(await page.evaluate(`!document.querySelector('#fault').hidden && !document.querySelector('#runtime').classList.contains('ready')`),'invalid incantation is an explicit error, not a substitute picture');
  await click('#undo'); await waitFinished();
  check(await page.evaluate(`document.querySelector('#fault').hidden`),'recover from error');
  for(let i=0;i<10;i++) await click('#keep');
  check(await page.evaluate(`document.querySelectorAll('#kept button').length===8 && document.querySelector('#keep').disabled`),'bounded pocket never silently overwrites a kept spell');
  await page.s('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const key of ['halfway','dance','room','word']) {
    await page.goto(`${base}?view=phone&vista=${key}#${key}`); await page.evaluate('document.fonts.ready');
    const size=await page.evaluate(`({w:document.documentElement.scrollWidth,h:document.documentElement.scrollHeight,vw:innerWidth,vh:innerHeight})`);
    console.log(key,'phone',JSON.stringify(size));
    check(size.w<=size.vw,`${key}: phone width`); check(size.h<=size.vh+1,`${key}: first phone encounter fits`);
    await click('#say');await waitFinished();
    const shot=await page.s('Page.captureScreenshot',{format:'png'});writeFileSync(`${output}/${key}-phone.png`,Buffer.from(shot.data,'base64'));
  }
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await page.goto(base);
  check(await page.evaluate(`document.querySelector('#trace').disabled && !document.querySelector('#runtime').hasAttribute('src')`),'reduced motion explicit opt-in');
  await page.s('Emulation.setScriptExecutionDisabled',{value:true});await page.goto(base);
  check(await page.evaluate(`document.querySelector('noscript').textContent.includes('real Paperlang')`),'no-JS source and reading fallback');
  await page.s('Emulation.setScriptExecutionDisabled',{value:false});
  check(!page.console.some(x=>x.type==='exception'),JSON.stringify(page.console));
  writeFileSync(`${output}/ui-report.json`,JSON.stringify({checks,console:page.console,failed:page.failed},null,2));
  console.log(`Passed ${checks} UI assertions`);
}finally{cdp.close();}

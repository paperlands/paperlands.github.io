// Typography is measured as the browser sets it: letterforms, ink and lines.
// BASE_URL=http://127.0.0.1:4001 node design/probe/experiences-type.mjs
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { connect, newPage } from './cdp.mjs';
const base=process.env.BASE_URL || 'http://127.0.0.1:4012';
const cdp=await connect(), page=await newPage(cdp);
const report=[];
try {
  await page.s('Network.setCacheDisabled',{cacheDisabled:true});
  await page.s('Network.setBypassServiceWorker',{bypass:true});
  await page.s('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  for(const width of [1440,1024,768,390,320,1920]) {
    await page.s('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<700});
    await page.goto(`${base}/experiences.html`,900);
    await page.evaluate('document.fonts.ready');
    const state=await page.evaluate(`(() => {
      function lines(element) {
        const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
        const result=[]; let node;
        while(node=walker.nextNode()) for(const match of node.textContent.matchAll(/\\S+/g)) {
          const range=document.createRange(); range.setStart(node,match.index); range.setEnd(node,match.index+match[0].length);
          const rect=range.getBoundingClientRect();
          let line=result.find(line=>Math.abs(line.top-rect.top)<parseFloat(getComputedStyle(element).fontSize)*.25);
          if(!line) { line={top:rect.top,words:[]}; result.push(line); }
          line.words.push(match[0]);
        }
        return result.map(line=>line.words.join(' '));
      }
      const root=document.querySelector('.experiences');
      const headings=[...root.querySelectorAll('.experiences-movement h3')];
      const headingStyles=headings.map(e=>({font:getComputedStyle(e).fontFamily,style:getComputedStyle(e).fontStyle,ink:getComputedStyle(e).color,lines:lines(e),size:parseFloat(getComputedStyle(e).fontSize)}));
      const emphases=[...root.querySelectorAll('.experiences-movement h3 em,.experiences-seam h2 em,.experiences-support h2 em,.experiences-routes h3 em')].map(e=>({ink:getComputedStyle(e).color,style:getComputedStyle(e).fontStyle}));
      const text=[...root.querySelectorAll('.experiences-possibilities :is(h2,h3,p,figcaption,span,em)')].filter(e=>!e.closest('a'));
      const inks=[...new Set(text.map(e=>getComputedStyle(e).color))];
      const labels=[...root.querySelectorAll('.experiences-label')].map(e=>parseFloat(getComputedStyle(e).fontSize));
      return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,headings:headingStyles,emphases,inks,labels,
        seam:lines(document.querySelector('.experiences-seam-lead')),
        actions:[...root.querySelectorAll('.experiences-jump>a,.experiences-cta')].map(e=>getComputedStyle(e).color),
        prose:root.innerText.replace(/\\s+/g,' ').trim()};
    })()`);
    assert.equal(state.overflow,false);
    assert.equal(state.inks.length,2,'one ivory and one quiet neutral for non-action text');
    assert.ok(state.headings.every(h=>h.font.includes('Cormorant Garamond')&&h.style==='normal'));
    assert.ok(state.emphases.every(e=>e.style==='italic'&&e.ink===state.headings[0].ink),'italic emphasis, identical ink');
    assert.ok(state.labels.every(size=>size>=11),'small capitals remain readable');
    assert.deepEqual(state.headings.map(h=>h.lines),[
      ['Find your own','Why.'],['What I cannot create','I do not understand'],['By students','for students']
    ],`phrases are deliberately set at ${width}px`);
    assert.deepEqual(state.seam,['The Stage takes on many'],'the lead is an intact phrase');
    assert.ok(state.actions.every(ink=>ink==='rgb(255, 153, 51)'),'orange is reserved for actions');
    if(width===1440) await writeFile('/tmp/experiences-type-copy-after.json',JSON.stringify(state.prose));
    if(width===1440||width===390||width===320) for(const id of ['possibilities','symposium','festival','workshops']) {
      await page.evaluate(`document.getElementById('${id}').scrollIntoView({behavior:'instant'})`);
      await new Promise(resolve=>setTimeout(resolve,150));
      const {data}=await page.s('Page.captureScreenshot',{format:'png'});
      await writeFile(`/tmp/experiences-type-after-${width}-${id}.png`,Buffer.from(data,'base64'));
    }
    const {prose,...summary}=state; report.push(summary);
  }
  assert.deepEqual(page.console.filter(e=>e.type==='exception'),[]);
  console.log(JSON.stringify({passed:true,viewports:report},null,2));
} finally {await page.s('Page.close');cdp.close();}

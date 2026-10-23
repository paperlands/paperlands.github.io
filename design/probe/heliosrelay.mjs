// Static repository server on 8765; Chromium CDP on CDP_PORT. No dependencies.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.RELAY_ORIGIN || 'http://127.0.0.1:8765';
const route = '/design/iterations/12-heliosrelay.html';
const settle = () => page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
const shot = async name => {
  const image = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`/tmp/heliosrelay-${name}.png`, Buffer.from(image.data, 'base64'));
};
const enter = async (waitForFrames = true) => {
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  if (waitForFrames) await settle();
};
const transforms = () => page.evaluate(`Object.fromEntries([...document.querySelectorAll('#relay-inquiry [data-plane]')].map(el => [el.className, {plane:el.dataset.plane, x:parseFloat(el.style.getPropertyValue('--dx'))||0, y:parseFloat(el.style.getPropertyValue('--dy'))||0}]))`);
try {
  await page.s('Page.bringToFront');
  // Load the inherited 04 carousel in poster mode, then enable motion for the
  // new controller. This tests the relay without downloading the video masters.
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + route + '#parallel-lives', 1800);
  await page.evaluate('document.fonts.ready');
  assert.equal(await page.evaluate('document.querySelector("#reel").nextElementSibling.id'), 'parallel-lives', 'Inserted immediately after becoming');
  assert.equal(await page.evaluate('document.querySelectorAll("#stage .slide").length'), 5, 'Original hero retained');
  assert.equal(await page.evaluate('document.querySelectorAll("#track .reel-set article").length'), 12, 'Original becoming reel retained');
  assert.ok(await page.evaluate('new Set([...document.querySelectorAll("[id]")].map(el => el.id)).size === document.querySelectorAll("[id]").length'), 'Unique IDs');
  assert.equal(await page.evaluate('document.querySelector(".helios-relay").dataset.motion'), 'still');
  assert.equal(await page.evaluate('document.querySelector(".hr-motion").disabled'), true);
  await page.s('Emulation.setEmulatedMedia', { features: [] });
  await settle();
  assert.equal(await page.evaluate('document.querySelector(".helios-relay").dataset.motion'), 'live');

  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await page.evaluate('document.querySelector("#parallel-lives").scrollIntoView({behavior:"instant"})');
    await settle();
    if ([1440,390].includes(width)) await shot(`overture-${width}`);
    for (const id of ['inquiry', 'creators', 'leaders']) {
      await page.evaluate(`document.querySelector('.hr-chapters a[href="#relay-${id}"]').click()`);
      await settle();
      assert.deepEqual(await page.evaluate('[...document.querySelectorAll(".hr-chapter[open]")].map(el => el.id)'), [`relay-${id}`]);
      assert.equal(await page.evaluate('document.querySelector(".hr-chapters [aria-current]").hash'), `#relay-${id}`);
      await page.evaluate(`Promise.all([...document.querySelectorAll('#relay-${id} img')].map(img=>img.decode()))`);
      assert.ok(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#relay-${id} h3, #relay-${id} h4, #relay-${id} .hr-description, #relay-${id} .hr-inline, .hr-controls')].every(el=>{const b=el.getBoundingClientRect();return b.left>=0&&b.right<=innerWidth;})`), `Content fits at ${width}/${id}`);
      assert.ok(await page.evaluate(`(()=>{const copy=document.querySelector('#relay-${id} .hr-copy').getBoundingClientRect(); const stage=document.querySelector('#relay-${id} .hr-stage').getBoundingClientRect(); const cta=document.querySelector('#relay-${id} .hr-copy .hr-inline').getBoundingClientRect(); return cta.bottom<=stage.bottom&&copy.top>=stage.top;})()`), `Copy not clipped at ${width}/${id}`);
      if ([1440,390].includes(width)) {
        if (width === 1440) {
          await page.evaluate(`scrollBy({top:document.querySelector('#relay-${id} .hr-passage').getBoundingClientRect().top-120,behavior:'instant'})`);
          await settle();
        }
        await shot(`${id}-${width}`);
      }
    }
  }
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.evaluate('document.querySelector(".hr-chapters a").click()');
  await settle();
  await page.evaluate('scrollBy({top:document.querySelector("#relay-inquiry .hr-passage").getBoundingClientRect().top-80,behavior:"instant"})');
  await settle();
  const before = await transforms();
  const top = await page.evaluate('document.querySelector("#relay-inquiry .hr-stage").getBoundingClientRect().top');
  await page.evaluate('scrollBy({top:220,behavior:"instant"})');
  await settle();
  const after = await transforms();
  const delta = plane => {const key=Object.keys(before).find(key=>before[key].plane===plane);return Math.abs(after[key].y-before[key].y);};
  assert.equal(delta('body'), 0, 'Body is anchored');
  assert.ok(delta('far') < 2, 'Far field barely moves');
  assert.ok(delta('thought') > delta('memory') && delta('memory') > delta('far'), 'Movement expresses the layer relationship');
  assert.ok(delta('near') > delta('thought') * 2.5, 'Only the near fragment moves substantially');
  assert.equal(await page.evaluate('document.querySelector("#relay-inquiry .hr-stage").getBoundingClientRect().top'), top, 'Canvas holds during scroll');
  console.log('Layer deltas over 220px scroll:', Object.fromEntries(['far','memory','body','thought','near'].map(name=>[name,delta(name)])));
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector("#grain")).animationPlayState'), 'paused', 'Inherited grain settles in relay');
  const heightBeforePause = await page.evaluate('document.querySelector("#relay-inquiry .hr-passage").offsetHeight');
  await page.evaluate('document.querySelector(".hr-motion").click()');
  await settle();
  assert.equal(await page.evaluate('document.querySelector(".helios-relay").dataset.motion'), 'paused');
  assert.equal(await page.evaluate('document.querySelector("#relay-inquiry .hr-passage").offsetHeight'), heightBeforePause, 'Pause does not change the canvas geometry');
  const paused = await transforms();
  await page.evaluate('scrollBy({top:100,behavior:"instant"})');
  await settle();
  assert.deepEqual(await transforms(), paused, 'Pause freezes all planes');
  await page.evaluate('document.querySelector(".hr-motion").click()');
  await settle();
  assert.equal(await page.evaluate('document.querySelector(".helios-relay").dataset.motion'), 'live');
  await page.evaluate('document.querySelector("#relay-creators summary").focus()');
  await enter();
  assert.equal(await page.evaluate('document.querySelector("#relay-creators").open'), true, 'Keyboard opens chapter');
  assert.equal(await page.evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid', 'Visible keyboard focus');
  await enter();
  assert.equal(await page.evaluate('document.querySelectorAll(".hr-chapter[open]").length'), 0, 'All chapters may be collapsed');
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.goto(base + route + '#relay-leaders');
  assert.equal(await page.evaluate('document.querySelector("#relay-leaders").open'), true, 'Incoming deep link opens chapter');
  assert.ok(await page.evaluate('[...document.querySelectorAll(".hr-plane")].every(el=>getComputedStyle(el).transform==="none")'), 'Reduced motion is completely still');
  assert.equal(await page.evaluate('document.querySelector(".helios-relay").dataset.motion'), 'still');
  await page.s('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto(base + route + '#parallel-lives');
  await page.evaluate('document.querySelector("#relay-creators summary").focus()');
  await enter(false);
  assert.equal(await page.evaluate('document.querySelector("#relay-creators").open'), true, 'Native no-JS disclosure works');
  assert.equal(await page.evaluate('document.querySelector(".hr-motion").hidden'), true, 'No dead motion control without JS');
  await page.s('Emulation.setScriptExecutionDisabled', { value: false });
  await page.s('Page.addScriptToEvaluateOnNewDocument', { source: 'if (navigator.connection) Object.defineProperty(navigator.connection,"saveData",{get:()=>true});' });
  await page.s('Emulation.setEmulatedMedia', { features: [] });
  await page.goto(base + route + '#relay-inquiry');
  assert.equal(await page.evaluate('document.querySelector(".helios-relay").dataset.motion'), 'still', 'Save-data keeps a still field');
  assert.deepEqual(page.console.filter(item=>item.type==='exception'), [], 'No JavaScript exceptions');
  assert.deepEqual([...page.responses].filter(([url,status])=>url.startsWith(base)&&status>=400), [], 'No local asset failures');
  console.log('PASS: inherited opening, order, five planes, five viewport widths, no clipped copy, native/keyboard disclosure, no-JS, motion budget, sticky canvas, pause geometry, reduced motion, save-data, deep links and local assets. Screenshots /tmp/heliosrelay-*.png');
} finally { cdp.close(); }

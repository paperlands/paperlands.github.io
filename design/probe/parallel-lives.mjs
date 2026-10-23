// Serve the repository root on 8765; start Chromium with CDP_PORT (default 9222).
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.PARALLEL_ORIGIN || 'http://127.0.0.1:8765';
const routes = ['09-living-inheritance', '10-charged-interval', '11-unfinished-relay'];
const settle = () => page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
const screenshot = async name => {
  const shot = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`/tmp/parallel-${name}.png`, Buffer.from(shot.data, 'base64'));
};
try {
  for (const route of routes) {
    await page.goto(`${base}/design/iterations/${route}.html`);
    await page.evaluate('document.fonts.ready');
    assert.equal(await page.evaluate('document.querySelectorAll("h1").length'), 1);
    assert.ok(await page.evaluate('new Set([...document.querySelectorAll("[id]")].map(el => el.id)).size === document.querySelectorAll("[id]").length'), 'Unique IDs');
    assert.ok(await page.evaluate('[...document.links].filter(a => a.getAttribute("href").startsWith("#")).every(a => document.getElementById(a.hash.slice(1)))'), 'Local anchors exist');
    for (const width of [1440, 768, 390, 320]) {
      await page.s('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
      await page.evaluate('scrollTo({top:0,behavior:"instant"})');
      await settle();
      assert.ok(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `${route}: no overflow at ${width}`);
      if ([1440, 390].includes(width)) await screenshot(`${route}-${width}`);
      for (const id of ['inquiry', 'creators', 'leaders']) {
        await page.evaluate(`(() => {const el = document.getElementById('${id}'); if (el.tagName === 'DETAILS') el.open = true; el.scrollIntoView({behavior:'instant'});})()`);
        await settle();
        await page.evaluate(`Promise.all([...document.querySelectorAll('#${id} img')].map(img => img.decode()))`);
        assert.ok(await page.evaluate(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#${id} h2, #${id} .description, #${id} .text-link')].every(el => {const r=el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth;})`), `${route}/${id}: content fits at ${width}`);
        if (width === 1440 || width === 390) await screenshot(`${route}-${id}-${width}`);
      }
    }
    await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
    await page.evaluate('document.querySelector(".coda .text-link").focus()');
    assert.equal(await page.evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid', `${route}: visible keyboard focus`);
    await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    assert.equal(await page.evaluate('getComputedStyle(document.documentElement).scrollBehavior'), 'auto');
    await page.s('Emulation.setEmulatedMedia', { features: [] });
  }
  const relay = `${base}/design/iterations/11-unfinished-relay.html`;
  await page.goto(`${relay}#creators`);
  assert.deepEqual(await page.evaluate('[...document.querySelectorAll("details[open]")].map(el => el.id)'), ['creators'], 'Deep-link reveals the right chapter');
  await page.evaluate('document.querySelector("#leaders summary").focus()');
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await settle();
  assert.deepEqual(await page.evaluate('[...document.querySelectorAll("details[open]")].map(el => el.id)'), ['leaders'], 'Keyboard opens one chapter');
  assert.equal(await page.evaluate('location.hash'), '#leaders', 'Selection can be shared');
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await settle();
  assert.equal(await page.evaluate('document.querySelectorAll("details[open]").length'), 0, 'Keyboard closes the chapter');
  assert.equal(await page.evaluate('location.hash'), '', 'Closed chapter is not kept in URL');
  await page.s('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto(relay);
  await page.evaluate('document.querySelector("#creators summary").focus()');
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  assert.equal(await page.evaluate('document.querySelector("#creators").open'), true, 'Native interaction works without JS');
  assert.deepEqual(page.console.filter(item => item.type === 'exception'), [], 'No JS exceptions');
  assert.deepEqual([...page.responses].filter(([url, status]) => url.startsWith(base) && status >= 400), [], 'Local assets resolve');
  console.log('PASS: three studies, 1440/768/390/320px, all chapters, image decoding, anchors, unique IDs, focus, reduced motion, keyboard disclosure, deep links, no-JS disclosure, no local 404s or JS exceptions. Screenshots: /tmp/parallel-*.png');
} finally {
  cdp.close();
}

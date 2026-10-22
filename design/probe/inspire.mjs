// Static server on 8765; Chromium CDP on CDP_PORT (default 9222).
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.CINEMA_ORIGIN || 'http://127.0.0.1:8765';
const route = '/design/iterations/06-helioscinemascape.html#inspire';
const settle = () => page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
try {
  await page.goto(base + route, 2000);
  assert.equal(await page.evaluate('document.querySelector("#anyone").nextElementSibling.id'), 'inspire');
  assert.equal(await page.evaluate('document.querySelectorAll(".inspire-scene").length'), 3);
  assert.equal(await page.evaluate('new Set([...document.querySelectorAll("[id]")].map(el => el.id)).size === document.querySelectorAll("[id]").length'), true, 'Unique IDs');
  for (const width of [1440, 768, 390, 320]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const chapter of ['leaders', 'creators', 'inquirers']) {
      await page.evaluate(`document.querySelector('#inspire-${chapter}').scrollIntoView({behavior:'instant', block:'start'})`);
      await settle();
      assert.equal(await page.evaluate('document.querySelector(".inspire-chapters [aria-current]").hash'), `#inspire-${chapter}`);
      assert.ok(await page.evaluate('[...document.querySelectorAll(".inspire-copy, .inspire-plate, .inspire-chapters, #inspire-title")].every(el => {const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth;})'), `Content fits at ${width}px`);
      assert.ok(await page.evaluate('[...document.querySelectorAll(".inspire-chapters a")].every(el => {const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44;})'), 'Chapter targets fit');
      assert.ok(await page.evaluate('document.querySelector("#wordmark").getBoundingClientRect().right < document.querySelector(".folio-nav .plates").getBoundingClientRect().left'), 'Header links do not overlap identity');
      const top = await page.evaluate('document.querySelector(".inspire-chapters").getBoundingClientRect().top');
      assert.ok(top >= 50 && top <= 65, 'Chapters stick below the header');
      if (width === 1440 || width === 390) {
        const image = await page.s('Page.captureScreenshot', { format: 'png' });
        writeFileSync(`/tmp/heliosinspire-${chapter}-${width}.png`, Buffer.from(image.data, 'base64'));
      }
    }
  }
  await page.evaluate('document.querySelector(".inspire-link").focus()');
  assert.equal(await page.evaluate('getComputedStyle(document.activeElement).outlineStyle'), 'solid', 'Visible keyboard focus');
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.equal(await page.evaluate('getComputedStyle(document.documentElement).scrollBehavior'), 'auto');
  assert.deepEqual(page.console.filter(item => item.type === 'exception'), [], 'No JS exceptions');
  assert.deepEqual([...page.responses].filter(([url, status]) => url.startsWith(base) && status >= 400 && !url.endsWith('/favicon.ico')), [], 'Local assets resolve');
  await page.s('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto(base + route);
  assert.equal(await page.evaluate('[...document.querySelectorAll(".inspire-chapters a")].every(a => document.querySelector(a.hash))'), true, 'No-JS chapter navigation');
  assert.equal(await page.evaluate('document.querySelectorAll(".inspire-link[href]").length'), 3, 'No-JS programme links');
  console.log('PASS: programme mappings, unique IDs, 1440/768/390/320px layouts, chapter tracking, sticky navigation, keyboard focus, reduced motion, no-JS links, local assets, no JS exceptions.');
} finally {
  cdp.close();
}

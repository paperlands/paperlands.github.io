// Run with a static server on 8765 and Chromium's CDP on CDP_PORT (default 9222).
// Example: node design/probe/cinemascape.mjs
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';

const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.CINEMA_ORIGIN || 'http://127.0.0.1:8765';
const route = '/design/iterations/06-helioscinemascape.html';
const settle = () => page.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');
const scrollTo = async selector => {
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant', block:'center'})`);
  await settle();
};
const frames = () => page.evaluate('document.querySelectorAll(".cinema iframe").length');
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + route, 2000);
  assert.equal(await frames(), 0);
  await scrollTo('#film-thinking');
  assert.equal(await frames(), 0);
  assert.equal(page.requests.filter(url => /youtube|ytimg|googlevideo/.test(url)).length, 0, 'No YouTube connections before intent');
  assert.equal(await page.evaluate('document.querySelector("#reel").nextElementSibling.id'), 'anyone');
  const heat = await page.evaluate('getComputedStyle(document.querySelector(".cinema")).getPropertyValue("--cinema-heat")');
  const desktop = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync('/tmp/helioscinemascape-desktop.png', Buffer.from(desktop.data, 'base64'));
  await page.evaluate('document.querySelector(".cinema-launch").click()');
  assert.equal(await frames(), 1);
  assert.equal(await page.evaluate('document.activeElement.className'), 'cinema-close');
  assert.match(await page.evaluate('document.querySelector(".cinema iframe").src'), /youtube-nocookie\.com\/embed\/osUu4Tak3Yw/);
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  assert.equal(await frames(), 0);
  assert.equal(await page.evaluate('document.activeElement.className'), 'cinema-launch');
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space' });
  assert.equal(await frames(), 1, 'Space opens a focused film');
  await scrollTo('#film-play');
  assert.equal(await frames(), 0, 'Offscreen film released');
  await page.evaluate('document.querySelector("#film-play .cinema-launch").click()');
  assert.equal(await frames(), 1);
  await page.evaluate('document.querySelector("#film-art .cinema-launch").click()');
  assert.equal(await frames(), 1, 'Only one player at once');
  await page.evaluate('document.querySelector("#film-art .cinema-close").click()');
  await scrollTo('#film-art');
  assert.notEqual(await page.evaluate('getComputedStyle(document.querySelector(".cinema")).getPropertyValue("--cinema-heat")'), heat);
  assert.equal(await page.evaluate('document.querySelector(".cinema-chapters [aria-current]").hash'), '#film-art');
  const navTop = await page.evaluate('document.querySelector(".cinema-chapters").getBoundingClientRect().top');
  assert.ok(navTop > 50 && navTop < 70, 'Chapter nav is sticky below folio nav');
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await settle();
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".cinema")).getPropertyValue("--cinema-heat")'), '198 89 30');
  assert.equal(await page.evaluate('getComputedStyle(document.querySelector(".cinema-sun")).transform'), 'none');
  await page.s('Emulation.setEmulatedMedia', { features: [] });
  for (const width of [320, 390, 768]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: false });
    await scrollTo('#film-thinking .cinema-film');
    assert.ok(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), `No page overflow at ${width}px`);
    assert.ok(await page.evaluate('[...document.querySelectorAll(".cinema-copy, .cinema-film, #cinema-title, .cinema-chapters")].every(el => {const r = el.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth})'), `Content fits at ${width}px`);
    assert.ok(await page.evaluate('document.querySelector("#wordmark").getBoundingClientRect().right < document.querySelector(".folio-nav .plates").getBoundingClientRect().left'), `Header identity and links do not overlap at ${width}px`);
    if (width === 390) {
      const mobile = await page.s('Page.captureScreenshot', { format: 'png' });
      writeFileSync('/tmp/helioscinemascape-mobile.png', Buffer.from(mobile.data, 'base64'));
    }
  }
  const errors = page.console.filter(item => item.type === 'exception');
  assert.deepEqual(errors, [], 'No uncaught JavaScript exceptions');
  const localFailures = [...page.responses].filter(([url, status]) => url.startsWith(base) && status >= 400 && !url.endsWith('/favicon.ico'));
  assert.deepEqual(localFailures, [], 'Local assets resolve');
  await page.s('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto(base + route + '#anyone');
  assert.equal(await frames(), 0);
  assert.equal(await page.evaluate('document.querySelector(".cinema-launch").getAttribute("href")'), 'https://www.youtube.com/shorts/osUu4Tak3Yw');
  console.log('PASS: lazy embeds, close/Escape/Space, single player, offscreen teardown, scroll hues, sticky chapters, reduced motion, 320/390/768px layouts, no-JS links, local assets, JS exceptions.');
  console.log('Screenshots: /tmp/helioscinemascape-{desktop,mobile}.png');
} finally {
  cdp.close();
}

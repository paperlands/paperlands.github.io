// Real controls and native runs; annotations must not become another value owner.
// PROBE=fourth-turn-readouts.mjs bash design/probe/fourth-turn.sh
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const cdp = await connect();
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-readouts';
mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html';
const results = [];
async function wait(page, expression) {
  for (let i = 0; i < 200; i++) { if (await page.evaluate(expression)) return; await sleep(80); }
  throw Error(`Timed out: ${expression}`);
}
async function open(width = 1280, reduced = false) {
  const page = await newPage(cdp);
  await page.s('Emulation.setDeviceMetricsOverride', { width, height: width < 650 ? 844 : 800, deviceScaleFactor: 1, mobile: width < 650 });
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
  await page.goto(base.replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html'));
  await wait(page, '!!window.fourthTurn?.ready && window.fourthTurn.settled');
  await page.evaluate('window.ft=window.fourthTurn; ft.played(); ft.gather(); ft.name(); ft.generalise()');
  await sleep(reduced ? 50 : 1200);
  return page;
}
async function state(page) {
  return page.evaluate(`(() => ({
    values:ft.values, reveal:document.querySelector('.fourth-turn').dataset.readout ?? null,
    annotations:[...document.querySelectorAll('[data-reveal]')].map(el=>({
      text:el.textContent, axis:el.dataset.reveal, shown:el.classList.contains('is-revealed'),
      opacity:+getComputedStyle(el).opacity, transition:getComputedStyle(el).transitionDuration,
      hidden:el.getAttribute('aria-hidden')
    })),
    constantBadges:document.querySelectorAll('.tok-value[data-for="len"]').length,
    call:document.querySelector('[data-id="call"]').textContent,
    control:document.querySelector('.tok-argument.is-active')?.getAttribute('aria-valuenow'),
    layout:[...document.querySelectorAll('.source-row')].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];})
  }))()`);
}
async function point(page, selector) {
  return page.evaluate(`(() => {const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
}
async function mouse(page, type, point) {
  await page.s('Input.dispatchMouseEvent', { type, ...point, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, ...(type === 'mouseMoved' ? {} : { clickCount: 1 }) });
}
async function key(page, key) {
  for (const type of ['keyDown', 'keyUp']) await page.s('Input.dispatchKeyEvent', { type, key, code: key });
}
async function shot(page, name) {
  const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
function check(ok, label) { assert(ok, label); results.push(label); console.log(`PASS ${label}`); }
function unchangedLayout(a, b) {
  return a.layout.length === b.layout.length && a.layout.every((rect, index) => rect.every((n, axis) => Math.abs(n - b.layout[index][axis]) < 0.2));
}
try {
  const page = await open();
  const quiet = await state(page);
  check(quiet.annotations.length === 3 && quiet.annotations.every(a => a.opacity === 0 && a.hidden === 'true'), 'At rest the two parameter values and derived angle are quiet, aria-hidden annotations');
  check(quiet.constantBadges === 0 && quiet.call === 'polygon 250 4', 'The unrelated constant has no badge; actual call arguments remain visible');
  const grip = await point(page, '#grip');
  await mouse(page, 'mousePressed', grip);
  await sleep(220);
  const held = await state(page);
  check(held.annotations.every(a => a.shown && a.opacity >= 0.59), 'Taking hold reveals the count and its derived angle');
  check(unchangedLayout(quiet, held), 'Revealing values does not move or wrap the recipe');
  await sleep(900);
  check((await state(page)).annotations.every(a => a.shown), 'Readouts stay visible for the whole hold, not just a timed flash');
  // Take the count handle to the third native-model notch (five sides).
  const notch = await page.evaluate(`(() => {const line=document.querySelectorAll('#rail .rail-landmark')[2];const r=document.querySelector('#figure').getBoundingClientRect();return {x:r.x+(+line.getAttribute('x1')+(+line.getAttribute('x2')))/2,y:r.y+(+line.getAttribute('y1')+(+line.getAttribute('y2')))/2};})()`);
  await mouse(page, 'mouseMoved', notch);
  await sleep(180);
  const changed = await state(page);
  check(changed.values.side === 5 && changed.annotations.slice(0,2).every(a => a.text === '5') && changed.annotations[2].text === ' = 72°', 'The held readouts update in place from the one authored count');
  check(changed.annotations.every(a => a.shown) && unchangedLayout(held, changed), `Changing values neither flashes nor shifts the source: ${JSON.stringify({before:held.layout,after:changed.layout,reveal:changed.reveal})}`);
  await shot(page, 'desktop-held');
  await mouse(page, 'mouseReleased', notch);
  await sleep(300);
  check((await state(page)).annotations.every(a => a.shown), 'Release leaves a short reading rest');
  await sleep(700);
  const released = await state(page);
  check(released.annotations.every(a => a.opacity === 0) && released.call === 'polygon 250 5', 'The annotations fade away; the new call remains');
  await shot(page, 'desktop-rest');

  await page.evaluate('ft.setValue("side",3); document.querySelector("#grip").focus()');
  await key(page, 'ArrowRight');
  await sleep(200);
  let keyboard = await state(page);
  check(keyboard.values.side === 4 && keyboard.annotations.every(a => a.shown), 'Keyboard adjustment reveals the same dependent values');
  await key(page, 'Escape');
  keyboard = await state(page);
  check(keyboard.values.side === 3 && keyboard.control === '3' && keyboard.annotations[2].text === ' = 120°', 'Escape restores the input, accessible value, and ephemeral derived readout together');
  await sleep(1000);
  check((await state(page)).annotations.every(a => a.opacity === 0), 'Keyboard readouts also return to quiet');

  const argument = await point(page, '.tok-argument.is-active');
  await mouse(page, 'mousePressed', argument);
  await mouse(page, 'mouseMoved', { x: argument.x + 24, y: argument.y });
  check((await state(page)).values.side === 4, 'The manuscript scrubber uses the same reveal and state');
  await page.evaluate('document.querySelector(".tok-argument.is-active").dispatchEvent(new PointerEvent("pointercancel",{pointerId:1,bubbles:true}))');
  check((await state(page)).values.side === 3, 'Pointer cancellation restores the starting count');
  await mouse(page, 'mouseReleased', argument);
  await key(page, 'ArrowRight');
  await page.evaluate('ft.stepBack()');
  check(await page.evaluate('!document.querySelector(".fourth-turn").hasAttribute("data-readout") && !document.querySelector(".is-revealed")'), 'Changing description clears ephemeral evidence immediately');
  check(!page.console.some(entry => entry.type === 'exception'), 'Desktop handling raises no browser exception');

  const reduced = await open(1280, true);
  await mouse(reduced, 'mousePressed', await point(reduced, '#grip'));
  const instant = await state(reduced);
  check(instant.annotations.every(a => a.opacity >= 0.59 && a.transition.split(',').every(t => parseFloat(t) === 0)), 'Reduced motion reveals values instantly, with no fade or travel');
  await mouse(reduced, 'mouseReleased', await point(reduced, '#grip'));
  await sleep(700);
  check((await state(reduced)).annotations.every(a => a.opacity === 0), 'Reduced motion still honours the reading rest and returns to quiet');

  const phone = await open(390);
  const phoneQuiet = await state(phone);
  const touch = await point(phone, '.tok-argument.is-active');
  await phone.s('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...touch, id: 7 }] });
  await phone.s('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touch.x + 24, y: touch.y, id: 7 }] });
  await sleep(220);
  const phoneHeld = await state(phone);
  check(phoneHeld.values.side === 5 && phoneHeld.annotations.every(a => a.shown), 'Touch handling reveals and changes the same values on a phone');
  check(unchangedLayout(phoneQuiet, phoneHeld), 'The phone recipe keeps its layout during touch handling');
  await shot(phone, 'phone-held');
  await phone.s('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await sleep(1000);
  check((await state(phone)).annotations.every(a => a.opacity === 0), 'Touch release fades the annotations, not the call arguments');
  writeFileSync(`${out}/report.json`, JSON.stringify({ checks: results }, null, 2));
} finally { cdp.close(); }

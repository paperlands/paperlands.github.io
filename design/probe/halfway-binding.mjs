import assert from 'node:assert/strict';
import { connect, newPage } from './cdp.mjs';

const cdp = await connect();
const base = 'http://127.0.0.1:' + (process.env.HTTP_PORT || 8814);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function until(page, expression, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await page.evaluate(expression)) return;
    await sleep(40);
  }
  throw new Error('timed out: ' + expression);
}

try {
  const page = await newPage(cdp);
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + '/design/iterations/19-halfway.html', 400);
  await until(page, `document.querySelector('#operand-vx')?.textContent === '120' && document.querySelector('#operand-vy')?.textContent === '100'`);

  const stepped = await page.evaluate(`(() => {
    document.querySelector('[data-binding="vx"] [data-step="1"]').click();
    const operand = document.querySelector('#operand-vx');
    return {
      operand: operand.textContent,
      rail: document.querySelector('[data-rail-value="vx"]').textContent,
      row: operand.dataset.row,
      name: operand.dataset.operand,
      vy: document.querySelector('#operand-vy').textContent,
      controls: document.querySelector('[data-rail-value="vx"]').getAttribute('aria-controls'),
    };
  })()`);
  assert.equal(stepped.operand, '121');
  assert.equal(stepped.rail, '121');
  assert.equal(stepped.row, 'call');
  assert.equal(stepped.name, 'vx');
  assert.equal(stepped.vy, '100');
  assert.equal(stepped.controls, 'operand-vx');

  const keyed = await page.evaluate(`(() => {
    const operand = document.querySelector('#operand-vx');
    operand.focus();
    operand.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    return {
      operand: document.querySelector('#operand-vx').textContent,
      rail: document.querySelector('[data-rail-value="vx"]').textContent,
    };
  })()`);
  assert.equal(keyed.operand, '120');
  assert.equal(keyed.rail, '120');

  await page.evaluate(`window.__drag = (dx, selector) => {
    const el = document.querySelector(selector);
    const box = el.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const at = (cx) => ({ bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerId: 1, button: 0 });
    el.dispatchEvent(new PointerEvent('pointerdown', at(x)));
    window.dispatchEvent(new PointerEvent('pointermove', at(x + dx)));
    const midway = {
      operand: document.querySelector('#operand-vx').textContent,
      held: document.querySelector('#operand-vx').classList.contains('is-held'),
    };
    window.dispatchEvent(new PointerEvent('pointerup', at(x + dx)));
    return { midway, after: document.querySelector('#operand-vx').textContent, rail: document.querySelector('[data-rail-value="vx"]').textContent };
  }`);
  const word = await page.evaluate(`window.__drag(4, '#operand-vx')`);
  assert.equal(word.midway.operand, '121');
  assert.equal(word.after, '121');
  assert.equal(word.rail, '121');
  const railNudge = await page.evaluate(`window.__drag(4, '[data-rail-value="vx"]')`);
  assert.equal(railNudge.after, '121');
  const railStep = await page.evaluate(`window.__drag(24, '[data-rail-value="vx"]')`);
  assert.equal(railStep.after, '122');
  assert.equal(railStep.rail, '122');

  const owned = await page.evaluate(`(() => {
    const el = document.querySelector('#operand-vx');
    const box = el.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const at = (id, cx) => ({ bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerId: id, button: 0 });
    el.dispatchEvent(new PointerEvent('pointerdown', at(11, x)));
    window.dispatchEvent(new PointerEvent('pointermove', at(11, x + 40)));
    const along = el.textContent;
    window.dispatchEvent(new PointerEvent('pointermove', at(12, x + 80)));
    const stranger = el.textContent;
    window.dispatchEvent(new PointerEvent('pointerup', at(12, x + 80)));
    const afterStrangerUp = { value: el.textContent, held: el.classList.contains('is-held') };
    window.dispatchEvent(new PointerEvent('pointercancel', at(11, x + 40)));
    const cancelled = { value: el.textContent, held: el.classList.contains('is-held'), rail: document.querySelector('[data-rail-value="vx"]').textContent };
    window.dispatchEvent(new PointerEvent('pointermove', at(12, x + 80)));
    return { along, stranger, afterStrangerUp, cancelled, later: el.textContent };
  })()`);
  assert.equal(owned.along, '132');
  assert.equal(owned.stranger, '132');
  assert.deepEqual(owned.afterStrangerUp, { value: '132', held: true });
  assert.deepEqual(owned.cancelled, { value: '122', held: false, rail: '122' });
  assert.equal(owned.later, '122');

  const point = await page.evaluate(`(() => {
    const operand = document.querySelector('#operand-vx');
    window.__operand = operand;
    const box = operand.getBoundingClientRect();
    return { x: Math.round(box.x + box.width / 2), y: Math.round(box.y + box.height / 2) };
  })()`);
  const press = (type, x, buttons) => page.s('Input.dispatchMouseEvent', {
    type, x, y: point.y, button: 'left', buttons, clickCount: type === 'mouseMoved' ? 0 : 1,
  });
  await press('mousePressed', point.x, 1);
  await press('mouseMoved', point.x + 40, 1);
  const during = await page.evaluate(`({
    focus: document.activeElement && document.activeElement.id,
    same: document.activeElement === window.__operand,
    captured: window.__operand.hasPointerCapture(1),
    value: window.__operand.textContent,
    held: window.__operand.classList.contains('is-held'),
  })`);
  assert.equal(during.focus, 'operand-vx');
  assert.equal(during.same, true);
  assert.equal(during.captured, true);
  assert.equal(during.value, '132');
  assert.equal(during.held, true);
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await press('mouseReleased', point.x + 40, 0);
  const escaped = await page.evaluate(`(() => {
    const operand = document.querySelector('#operand-vx');
    return {
      focus: document.activeElement && document.activeElement.id,
      same: document.activeElement === window.__operand,
      value: operand.textContent,
      rail: document.querySelector('[data-rail-value="vx"]').textContent,
      row: operand.dataset.row,
      held: operand.classList.contains('is-held'),
      captured: operand.hasPointerCapture(1),
      vy: document.querySelector('[data-rail-value="vy"]').textContent,
    };
  })()`);
  assert.equal(escaped.focus, 'operand-vx');
  assert.equal(escaped.same, true);
  assert.equal(escaped.value, '122');
  assert.equal(escaped.rail, '122');
  assert.equal(escaped.row, 'call');
  assert.equal(escaped.held, false);
  assert.equal(escaped.captured, false);
  assert.equal(escaped.vy, '100');

  await page.s('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await sleep(50);
  const stacked = await page.evaluate(`(() => {
    const word = document.querySelector('.manuscript').getBoundingClientRect();
    const rail = document.querySelector('.rails').getBoundingClientRect();
    document.querySelector('[data-binding="vy"] [data-step="1"]').click();
    return {
      stacked: rail.top >= word.bottom - 1,
      vy: document.querySelector('#operand-vy').textContent,
      rail: document.querySelector('[data-rail-value="vy"]').textContent,
    };
  })()`);
  assert.equal(stacked.stacked, true);
  assert.equal(stacked.vy, '101');
  assert.equal(stacked.rail, '101');

  const torn = await page.evaluate(`(() => {
    const root = document.querySelector('[data-halfway]');
    const el = document.querySelector('#operand-vx');
    const box = el.getBoundingClientRect();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    const at = (cx) => ({ bubbles: true, cancelable: true, clientX: cx, clientY: y, pointerId: 7, button: 0 });
    const before = el.textContent;
    el.dispatchEvent(new PointerEvent('pointerdown', at(x)));
    window.dispatchEvent(new PointerEvent('pointermove', at(x + 40)));
    const during = el.textContent;
    root.study.dispose();
    window.dispatchEvent(new PointerEvent('pointermove', at(x + 80)));
    document.querySelector('[data-binding="vx"] [data-step="1"]').click();
    root.study.dispose();
    return {
      before, during,
      after: document.querySelector('#operand-vx').textContent,
      held: document.querySelector('#operand-vx').classList.contains('is-held'),
    };
  })()`);
  assert.equal(torn.during, String(Number(torn.before) + 10));
  assert.equal(torn.after, torn.before);
  assert.equal(torn.held, false);
  const errors = page.console.filter((entry) => entry.type === 'exception' || entry.type === 'error');
  assert.deepEqual(errors, []);
  console.log('ok halfway bindings share one destination');
} finally {
  cdp.close();
}

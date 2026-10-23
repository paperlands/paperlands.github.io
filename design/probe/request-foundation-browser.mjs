import assert from 'node:assert/strict';
import { connect, newPage } from './cdp.mjs';
const cdp = await connect();
const base = 'http://127.0.0.1:' + (process.env.HTTP_PORT || 8814);
const site = process.env.SITE_BASE;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(page, expression, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { if (await page.evaluate(expression)) return; await sleep(80); }
  throw new Error('timed out: ' + expression);
}
try {
  const page = await newPage(cdp);
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + '/design/iterations/17-fourth-turn.html', 500);
  await until(page, 'window.fourthTurn?.ready && window.fourthTurn?.settled');
  const replay = await page.evaluate(`(() => {
    const ft = window.fourthTurn; ft.played();
    for (let i = 0; i < 8 && ft.representation !== 'explicit'; i++) ft.stepBack();
    const old = ft.run.presented;
    ft.play();
    return { old, submitted: ft.run.submitted };
  })()`);
  assert.equal(replay.old.source, replay.submitted.source);
  assert.equal(replay.old.presentation, replay.submitted.presentation);
  assert.notEqual(replay.old.replayNonce, replay.submitted.replayNonce);
  await until(page, 'window.fourthTurn.run.disposition === "idle"');
  const provenance = await page.evaluate('document.querySelector("#provenance").textContent');
  assert.match(provenance, /^request [1-9]\d*/m);
  assert.match(provenance, /^pin \/assets\/lib\/hatch\/hatch-v1\./m);
  assert.match(provenance, /^observed end-to-end ms \d+/m);
  assert.match(provenance, /^accepted commands \d+/m);
  assert.match(provenance, /^completion commands \d+/m);
  assert.match(provenance, /^fault absent$/m);
  assert.equal(provenance.includes('executionMs'), false);
  console.log('ok opening replay has equal source/presentation and a fresh request nonce');

  const delivery = await page.evaluate(`(async () => {
    const ft = window.fourthTurn, frame = document.querySelector('#runtime');
    ft.played(); ft.play(); const failed = ft.run.submitted.id;
    ft.play(); const queued = ft.run.desired.replayNonce;
    window.dispatchEvent(new MessageEvent('message', {
      source: frame.contentWindow, origin: location.origin,
      data: { channel: 'fourth-turn-stage', kind: 'fault', id: failed,
        fault: { message: 'injected rejection', kind: 'walk', span: { line: 2 } },
        visibility: { presented: false, beatSent: false } },
    }));
    for (let i = 0; i < 8; i++) await Promise.resolve();
    return { failed, queued, state: ft.run, ready: ft.ready };
  })()`);
  assert.equal(delivery.state.failure.fault.span.line, 2);
  assert.equal(delivery.state.submitted.replayNonce, delivery.queued);
  assert.ok(delivery.state.submitted.id > delivery.failed);
  assert.equal(delivery.state.disposition, 'running');
  assert.equal(delivery.ready, true);
  console.log('ok actual page handler preserves rejection and queued desire in microtask order');
  await until(page, 'window.fourthTurn.run.disposition === "idle"');

  const obsolete = await page.evaluate(`(() => {
    const ft = window.fourthTurn, frame = document.querySelector('#runtime');
    ft.played(); ft.play(); const old = ft.run.submitted.id;
    window.dispatchEvent(new Event('pagehide'));
    ft.play(); const next = ft.run.submitted.id;
    window.dispatchEvent(new MessageEvent('message', { source: frame.contentWindow, origin: location.origin,
      data: { channel: 'fourth-turn-stage', kind: 'fault', id: old, fault: { message: 'obsolete failure' } } }));
    return { old, next, state: ft.run, ready: ft.ready };
  })()`);
  assert.ok(obsolete.next > obsolete.old);
  assert.equal(obsolete.state.submitted.id, obsolete.next);
  assert.equal(obsolete.ready, true);
  console.log('ok obsolete page fault cannot cancel the following request');

  const visibility = await page.evaluate(`(async () => {
    const frame = document.createElement('iframe');
    frame.src = '/design/iterations/17-fourth-turn-stage.html';
    document.body.appendChild(frame);
    const messages = [];
    window.addEventListener('message', event => {
      if (event.source === frame.contentWindow && event.data?.channel === 'fourth-turn-stage') messages.push(event.data);
    });
    const wait = async predicate => {
      for (let i = 0; i < 400; i++) { const message = messages.find(predicate); if (message) return message; await new Promise(r => setTimeout(r, 25)); }
      throw new Error('stage timeout');
    };
    await wait(message => message.kind === 'ready');
    const post = (id, program, mode) => frame.contentWindow.postMessage({ channel: 'fourth-turn-host', kind: 'play', id, program, mode }, location.origin);
    const front = () => [...frame.contentDocument.querySelectorAll('.frame')].find(element => !element.classList.contains('back')).id;
    post(101, 'fw 1', 'swap'); await wait(message => message.id === 101 && message.kind === 'finished');
    const before = front();
    post(102, 'nope', 'swap'); const swap = await wait(message => message.id === 102 && message.kind === 'fault');
    const retained = before === front();
    post(103, 'nope', 'draw'); const draw = await wait(message => message.id === 103 && message.kind === 'fault');
    frame.remove();
    return { swap, draw, retained };
  })()`);
  assert.deepEqual(visibility.swap.visibility, { presented: false, beatSent: false });
  assert.equal(visibility.retained, true);
  assert.deepEqual(visibility.draw.visibility, { presented: true, beatSent: false });
  console.log('ok real stage reports retained front versus replaced-empty, without inventing partial ink');

  if (!site) throw new Error('SITE_BASE must name a freshly built site');
  const interval = await newPage(cdp);
  await interval.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await interval.goto(site + '/helios-interval', 500);
  await until(interval, 'document.querySelector("[data-helios-interval]")?.paperlangRun?.()?.outcome?.ok === true');
  const state = await interval.evaluate('document.querySelector("[data-helios-interval]").paperlangRun()');
  assert.match(state.presented.pin, /hatch-v1\./);
  assert.equal(typeof state.outcome.accepted.commands, 'number');
  assert.equal(typeof state.outcome.completion.commandCount, 'number');
  assert.equal(typeof state.outcome.beat.time, 'number');
  assert.equal(typeof state.outcome.observedEndToEndMs, 'number');
  assert.equal('executionMs' in state.outcome, false);
  assert.equal(await interval.evaluate('document.querySelectorAll("iframe").length'), 0);
  console.log('ok interval proves direct performer, beat time, separate counts, pin and observed duration');
  const errors = interval.console.filter(entry => entry.type === 'exception');
  assert.deepEqual(errors, []);
} finally { cdp.close(); }

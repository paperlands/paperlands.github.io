// Does a retention now answer to two artifacts? Waits for the send, which a synchronous read cannot see.
import { connect, newPage } from './cdp.mjs';
const cdp = await connect(), page = await newPage(cdp);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(expression, ms = 8000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await page.evaluate(expression)) return true; await sleep(60); }
  return false;
}
await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
const base = process.env.PROBE_BASE || `http://127.0.0.1:${process.env.HTTP_PORT || 8814}/design/probe/fourth-turn.html`;
await page.goto(base.replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html'));
await until('window.fourthTurn?.ready && window.fourthTurn.settled', 15000);
await page.evaluate('window.ft = window.fourthTurn');
const status = () => page.evaluate('document.querySelector("#status").textContent');

// A: 88° — the walk in hand has not come home, so the rule must be executed, not assumed.
await page.evaluate('ft.played(); ft.gather(); ft.setValue("turn", 88)');
await until('ft.run.presented?.done && ft.run.presented.context?.turn === 88 && ft.run.disposition === "idle"');
const before88 = await page.evaluate('ft.stagePosts');
await page.evaluate('ft.played(); ft.name(); ft.generalise()');
const sent88 = await until('ft.run.presented?.done && ft.run.presented.context?.rep === "polygon" && ft.run.disposition === "idle"');
const after88 = await page.evaluate('ft.stagePosts');
console.log(JSON.stringify({
  at88: { postsBefore: before88, postsAfter: after88, sent: after88 > before88, presentedRep: await page.evaluate('ft.run.presented?.context?.rep'), values: await page.evaluate('JSON.stringify(ft.values)'), status: (await status()).slice(0, 170) },
}, null, 1));

// B: the authored square — the loop's walk and the generalisation's placement are one figure.
await page.evaluate('ft.played(); ft.stepBack(); ft.setValue("turn", 90)');
await until('ft.run.presented?.done && ft.run.disposition === "idle"');
const before90 = await page.evaluate('ft.stagePosts');
await page.evaluate('ft.played(); ft.name(); ft.generalise()');
await sleep(1600);
const after90 = await page.evaluate('ft.stagePosts');
console.log(JSON.stringify({
  authoredSquare: { postsBefore: before90, postsAfter: after90, sent: after90 > before90, status: (await status()).slice(0, 170) },
}, null, 1));

// C: backwards from the pentagon across a placement change — must be presented again.
await page.evaluate('ft.played(); ft.setValue("side", 5)');
await until('ft.run.presented?.done && ft.run.presented.context?.rep === "polygon" && ft.run.presented.context?.side === 5 && ft.run.disposition === "idle"');
const beforeBack = await page.evaluate('ft.stagePosts');
await page.evaluate('ft.played(); ft.stepBack()');
const republished = await until('ft.run.presented?.done && ft.run.presented.context?.rep === "defined" && ft.run.disposition === "idle"');
const afterBack = await page.evaluate('ft.stagePosts');
console.log(JSON.stringify({
  backFromPentagon: { postsBefore: beforeBack, postsAfter: afterBack, sent: afterBack > beforeBack, representation: await page.evaluate('ft.representation'), presentedRep: await page.evaluate('ft.run.presented?.context?.rep'), republished, status: (await status()).slice(0, 170) },
}, null, 1));
cdp.close();

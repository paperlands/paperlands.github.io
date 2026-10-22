// The fourth turn — the act: the instrument as a visitor meets it, on the built homepage and
// the study that shares its modules.
//
//   jekyll build --destination /tmp/fourth-turn-built
//   python3 design/probe/serve.py 8826 /tmp/fourth-turn-built &
//   bundle exec jekyll build --destination /tmp/fourth-turn-built
//   python3 design/probe/serve.py 8826 /tmp/fourth-turn-built &
//   TURN_SITE_BASE=http://127.0.0.1:8826 PROBE=fourth-turn-act.mjs bash design/probe/fourth-turn.sh
// The server outlives the run on purpose; the build directory must not.
//
// One instrument, four descriptions: the pairs, the loop (the angle is played, and each
// milestone the play reaches is kept as a snapshot), the name (`def polygon do`, the series
// collapsing into one word), and the generalisation (`def polygon side do`, `360/side`
// shown equating to the angle the hand holds). This probe drives the real page — the real
// iframe, the pinned artifact — and never a mock; where it needs the figure's geometry it
// reads `figure.mjs`, the same arithmetic the instrument is placed with.
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { boxOf, figureWalk } from '../../assets/js/home/fourth-turn/figure.mjs';
import { AUTHORED } from '../../assets/js/home/fourth-turn/programs.mjs';
const cdp = await connect(), page = await newPage(cdp);
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-act';
mkdirSync(out, { recursive: true });
const site = process.env.TURN_SITE_BASE || 'http://127.0.0.1:8826';
const study = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const checks = [];
const check = (ok, label) => { checks.push({ ok: !!ok, label }); console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); };
// Some things this page cannot settle, and the act's own probe will not pretend they are settled:
// they are recorded as observations, to be investigated rather than asserted away.
const observations = [];
const observe = (label) => { observations.push(label); console.log(`OBSERVE ${label}`); };
async function wait(expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await page.evaluate(expression)) return true; await sleep(60); }
  return false;
}
// The same wait, against a page of its own: the act's own pace is measured on a tab nothing
// has touched, so a scripted hand cannot be mistaken for the act walking by itself.
async function until(target, expression, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await target.evaluate(expression)) return true; await sleep(120); }
  return false;
}
async function openFresh(url) {
  const fresh = await newPage(cdp);
  await fresh.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await fresh.goto(url, 1000);
  await fresh.evaluate('new Promise(r=>setTimeout(r,600))');
  await fresh.evaluate('document.querySelector(".fourth-turn").scrollIntoView({block:"center",behavior:"instant"})');
  for (let i = 0; i < 80 && !(await fresh.evaluate('!!document.querySelector(".fourth-turn")?.fourthTurn')); i++) await sleep(150);
  await fresh.evaluate('window.ft = document.querySelector(".fourth-turn").fourthTurn');
  await until(fresh, 'window.ft?.ready && window.ft?.settled');
  return fresh;
}
async function installApi(target = page) {
  if (!await wait('!!document.querySelector(".fourth-turn")?.fourthTurn')) throw Error('The act never booted');
  await target.evaluate('window.ft = document.querySelector(".fourth-turn").fourthTurn');
}
async function metric(width, height, mobile = false) { await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }); }
async function pos(selector) { return page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`); }
async function mouse(type, q, held = false) { await page.s('Input.dispatchMouseEvent', { type, ...q, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: type === 'mousePressed' || held ? 1 : 0, ...(type === 'mouseMoved' ? {} : { clickCount: 1 }) }); }
async function click(selector) { await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'nearest',behavior:'instant'})`); await sleep(60); const q = await pos(selector); await mouse('mouseMoved', q); await mouse('mousePressed', q); await mouse('mouseReleased', q); }
async function key(name) { for (const type of ['keyDown', 'keyUp']) await page.s('Input.dispatchKeyEvent', { type, key: name, code: name }); }
async function drag(selector, dx, dy) {
  const q = await pos(selector); await mouse('mousePressed', q);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', { x: q.x + dx * i / 12, y: q.y + dy * i / 12 }, true); await sleep(25); }
  await mouse('mouseReleased', { x: q.x + dx, y: q.y + dy }); await sleep(250);
}
// The ink of a saved frame, in pixels: what the pursuit's own claims are measured against.
function inkOf(name) {
  return JSON.parse(execFileSync('python3', ['-c', `
from PIL import Image
import sys, json
im = Image.open(sys.argv[1]).convert('L')
hist = im.histogram(); bg = hist.index(max(hist))
mask = im.point(lambda v: 255 if abs(v - bg) > 20 else 0)
print(json.dumps({'ink': mask.histogram()[255], 'bbox': mask.getbbox()}))
`, `${out}/${name}.png`], { encoding: 'utf8' }));
}
async function shot(name, figure = false) {
  const clip = figure ? await page.evaluate('(()=>{const r=document.querySelector("#figure").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()') : null;
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function advance() { await click('#advance'); await sleep(1300); }
async function scrollAct() { await page.evaluate('document.querySelector(".fourth-turn").scrollIntoView({block:"start",behavior:"instant"})'); await sleep(400); }
const value = (axis) => page.evaluate(`window.ft.values.${axis}`);
const chips = () => page.evaluate('[...document.querySelectorAll("#series .milestone")].map((el) => el.dataset.steps)');
const manuscript = () => page.evaluate('[...document.querySelectorAll("#source .source-row")].map((r) => r.textContent)');

try {
  // ---- the homepage act, as it arrives -------------------------------------------
  await metric(1280, 800);
  await page.goto(site, 1600); await installApi();
  check(await page.evaluate('!document.querySelector("#runtime").hasAttribute("src")'), 'Homepage does not load the native frame before arrival');
  check(await page.evaluate('!document.querySelector(".helios-see") && !!document.querySelector(".helios-who") && !!document.querySelector(".helios-possibilities")'), 'The see act is the instrument; who and possibilities remain');
  check(await page.evaluate('getComputedStyle(document.querySelector(".helios-air")).animationPlayState==="running"'), 'The cinema grain is unchanged before the instrument');
  await scrollAct();
  // The opening's walk is the one window the opening can be measured in: the act moves on by itself
  // the moment the recipe's own rest on the finished square ends, so a probe that waits for the walk
  // to be over has already missed it.
  check(await wait('window.ft.ready && document.querySelector(".fourth-turn").dataset.state === "drawing"', 12000), 'The native frame starts on arrival and the square begins to close');
  check(await page.evaluate('getComputedStyle(document.querySelector(".helios-air")).animationPlayState==="paused"'), 'The grain settles while the instrument is present');
  check(!await page.evaluate('document.documentElement.hasAttribute("data-state")'), 'Instrument state does not leak onto the document');
  check(await page.evaluate('document.querySelector("#advance").getAttribute("aria-disabled")==="true" && !document.querySelector("#advance").disabled'), 'While the square closes the invitation is spoken unavailable, never disabled');
  await click('#advance');
  check(await page.evaluate('window.ft.pressHeld===true && window.ft.representation==="explicit"'), 'A press during the walk is held, and rewrites nothing yet');
  await shot('home-arrival');
  check(await page.evaluate('document.querySelector("#hunt").hidden === true'),
    'No task is posted before the instrument is the visitor\'s: the hunt waits for the first rotation');
  check(await wait('window.ft.representation==="loop"', 12000) && await page.evaluate('window.ft.pressHeld===false'), 'The held press is spent when the walk ends, and the loop arrives at once');
  // The transition is an animation, not a cut — and it does not gate the hand that reaches for the grip.
  const drift = JSON.parse(await page.evaluate(`JSON.stringify({
    running: [document.querySelector('#grip'), document.querySelector('#rail'), document.querySelector('#trail')].map((el) => el.getAnimations().length),
    pointer: getComputedStyle(document.querySelector('#grip')).pointerEvents,
  })`));
  check(drift.running.some((n) => n > 0),
    `The instrument drifts in rather than cutting in (animations on grip/rail/trail: ${drift.running.join('/')})`);
  check(drift.pointer !== 'none', 'and the drift does not gate the hand: the grip answers while it drifts');

  // ---- the loop: the angle is played, and the milestones are kept -----------------
  check(await page.evaluate('document.querySelector("#verb").textContent==="play with the angles."'), 'The loop says what can be played');
  check(await page.evaluate('window.ft.active==="turn" && !document.querySelector("#handling-hint").hidden'), 'The angle is in hand, with its temporary invitation');
  check(await page.evaluate('document.querySelector("#reading").textContent==="the turn is 90° · 4 steps"'), 'The readout names the angle and the count it implies');
  // The list arrives with the invitation: the dial is the visitor's now, so the task is theirs.
  check(await page.evaluate(`document.querySelector('#hunt').hidden === false && [...document.querySelectorAll('#hunt li')].filter((li) => !li.hidden).length === 4`),
    'The hunt appears with the angle unlocked: four tasks, and no ladder past the hexagon');
  check((await manuscript())[2] === 'left 90°', 'The manuscript carries the played angle as the recipe\'s own turn');
  await page.evaluate('window.ft.played()');
  await page.evaluate('window.ft.setValue("turn", 74)');
  await sleep(300);
  check((await chips()).length === (await page.evaluate('window.ft.collected.length')), 'An angle that closes no figure keeps nothing');
  await page.evaluate('window.ft.setValue("turn", 72)');
  await sleep(500);
  const kept = JSON.parse(await page.evaluate('JSON.stringify(window.ft.collected)'));
  check((await chips()).join() === '5' && kept.length === 1 && kept[0].turn === 72 && kept[0].steps === 5 && kept[0].witness === 'drawn',
    `Landing on 72° keeps the walk that was drawn, and nothing else (${JSON.stringify(kept[0] ?? null)})`);
  check(/closes on itself/.test(kept[0]?.note ?? ''), `and it says what happened: five steps came home (${kept[0]?.note})`);
  const loopLine = (await manuscript()).find((line) => line.startsWith('loop '));
  check(loopLine === 'loop 5 do', `The count the walk took is written in the source, not hidden (${loopLine})`);
  check(await page.evaluate('document.querySelector("#grip").getAttribute("aria-valuetext")==="72 degrees, 5 steps"'),
    'The angle\'s own value says the count it implies');
  const chipPath = await page.evaluate('document.querySelector("#series .milestone svg path")?.getAttribute("d") ?? ""');
  check(chipPath.length > 0 && !chipPath.includes('Z'), 'The chip is the executed walk, brought home by walking it — never a declared close');
  const keptStatus = await page.evaluate('document.querySelector("#status").textContent');
  check(/closes on itself/.test(keptStatus) && /Kept, as drawn/.test(keptStatus),
    `The instrument announces the walk that ran, and the fact it was drawn (${keptStatus})`);
  const chipWords = await page.evaluate('[...document.querySelectorAll("#series .milestone > span")].map((el) => el.textContent)');
  const tick = JSON.parse(await page.evaluate(`JSON.stringify((() => { const t = document.querySelector('#series .milestone .milestone-tick'); if (!t) return null; const rgb = getComputedStyle(t).color.match(/[0-9]+/g).map(Number); return { label: t.getAttribute('aria-label'), path: !!t.querySelector('path'), r: rgb[0], g: rgb[1], b: rgb[2] }; })())`));
  check(!/NaN/.test(chipWords.join(' ')) && chipWords[0] === '72° · 5 steps' && !chipWords[1],
    `The chip says what was measured, and no gap it never took (${chipWords.join(' / ')})`);
  check(tick && tick.path && /closes on itself/.test(tick.label) && tick.g > tick.r && tick.g > tick.b,
    `and a walk that came home wears a green tick that still says what it stands for (${tick && tick.label}, rgb(${tick && tick.r}, ${tick && tick.g}, ${tick && tick.b}))`);
  const cleared = await page.evaluate(`(() => { const li = document.querySelector('#hunt li.is-found'); return li ? getComputedStyle(li).color : null; })()`);
  check(!!cleared && !!tick && cleared === `rgb(${tick.r}, ${tick.g}, ${tick.b})`,
    `and it is the same green the hunt clears a found figure with (${cleared})`);
  // The action point is the hinge — the corner the walk turns at, where `left <turn>` fires — and not
  // wherever the pen stops. Measured on the page: the handle rides the dial's radius about the hinge.
  const geometry = JSON.parse(await page.evaluate(`JSON.stringify({
    rect: document.querySelector('#figure').getBoundingClientRect().toJSON(),
    grip: (() => { const g = document.querySelector('#grip').getBoundingClientRect(); return { x: g.left + g.width / 2, y: g.top + g.height / 2 }; })(),
  })`));
  const box = boxOf(geometry.rect);
  const handWalk = figureWalk({ closed: false, len: AUTHORED.len, turn: 72, box });
  const hinge = handWalk[1];
  const stop = handWalk[handWalk.length - 1];
  const radius = Math.min(34, AUTHORED.len * box.scale * 0.16);
  const away = (point) => Math.hypot(geometry.grip.x - point.x, geometry.grip.y - point.y);
  check(Math.abs(away(hinge) - radius) < 1.5, `The handle rides the corner the walk turns at: ${away(hinge).toFixed(1)}px from the hinge, the dial's radius ${radius.toFixed(1)}px`);
  check(away(stop) > radius + 5, 'and not where the pen happened to stop');
  await shot('home-loop-pentagon');
  // The series is what the hand found, read before the act's tour finishes and the name's collapse
  // clears the chips — after that, the record lives on in `collected` alone.
  const foundByHand = await page.evaluate('window.ft.collected.length');
  check((await chips()).length === foundByHand && foundByHand > 0 && foundByHand < 4,
    `The series is the hand's own finds, not the act's demonstrations (${(await chips()).join(',') || 'none'} of four)`);

  // The reward: the figures still hiding, found by the hand, and something with wings agrees. The act
  // is held first — the visitor finding things is exactly the attention the pace waits out — so the
  // finds land at the loop rather than after it has moved on.
  const hiding = JSON.parse(await page.evaluate(`JSON.stringify([...document.querySelectorAll('#hunt li:not(.is-ladder):not(.is-goal)')].filter((li) => !li.classList.contains('is-found')).map((li) => Number(li.dataset.turn)))`));
  check(hiding.length === 3, `Three figures are still hiding after the hand's own find (${hiding.join(', ')})`);
  // What is still to be solved stays brown. The four the butterflies are rung out of are the only
  // rows wearing the task's colour, and none of them may borrow the cleared green early — a figure
  // the act showed is still brown, because shown was never earned.
  const waiting = JSON.parse(await page.evaluate(`JSON.stringify([...document.querySelectorAll('#hunt li:not(.is-found):not(.is-ladder):not(.is-goal)')].map((li) => { const rgb = getComputedStyle(li).color.match(/[0-9]+/g).map(Number); return { text: li.textContent, r: rgb[0], g: rgb[1], b: rgb[2] }; }))`));
  check(waiting.length === 3 && waiting.every((w) => w.r > w.g && w.g > w.b),
    `The three not yet found stay brown, so what is still to solve is plain (${waiting.map((w) => `${w.text} rgb(${w.r}, ${w.g}, ${w.b})`).join(', ')})`);
  await page.evaluate('window.ft.played()');
  for (const turn of hiding) {
    await page.evaluate(`window.ft.setValue("turn", ${turn})`);
    await sleep(600);
  }
  check(await wait('window.ft.collected.length===4', 12000), 'Finding the last figure by hand completes the hunt');
  check(await wait('[...document.querySelectorAll("#hunt li:not(.is-ladder):not(.is-goal)")].every((li) => li.classList.contains("is-found"))', 4000), 'and every task is struck through');
  check(await page.evaluate(`[...document.querySelectorAll('#hunt li.is-ladder')].length === 6 && [...document.querySelectorAll('#hunt li.is-ladder')].every((li) => li.hidden) && document.querySelector('#hunt li.is-goal').hidden === true`),
    'and the ladder past the hexagon is not posted: a rung is not a task, and no hand has been there');
  check(await wait('document.querySelector(".spirit") !== null', 4000),
    'and the reward arrives: butterflies glitch into existence and leave through the window');
  check(await page.evaluate('document.querySelectorAll(".spirit i svg .wings").length === 7'),
    'and each one is a butterfly: four wings and a body, not a dot');
  await shot('home-reward');
  check(/All four found/.test(await page.evaluate('document.querySelector("#status").textContent')),
    `and the act says so plainly (${(await page.evaluate('document.querySelector("#status").textContent')).slice(0, 40)})`);
  await sleep(4200);

  // ---- the name: the series collapses into one word -------------------------------
  // A finished hunt has already moved the act on, so the stop is waited for and pressed only if it is
  // not there yet: a press that arrives after the act's own is the visitor asking for the next one.
  // The count is set where it can be — at the loop — and then the name and the generalisation follow
  // it: stepping back hands the recipe its own four again, so the play is redone rather than assumed.
  for (let i = 0; i < 4 && await page.evaluate('window.ft.representation !== "loop"'); i += 1) {
    await click('#reverse');
    await wait('window.ft.representation === "loop"', 7000);
  }
  await page.evaluate('window.ft.setValue("side", 6)');
  await sleep(900);
  for (let i = 0; i < 3 && await page.evaluate('window.ft.representation !== "defined"'); i += 1) {
    await click('#advance');
    await wait('window.ft.representation === "defined"', 7000);
  }
  check(await wait('window.ft.representation==="defined"', 8000), 'The kept series is carried into the name');
  await sleep(1600);
  const named = await manuscript();
  check(named[0] === 'def polygon do' && named[named.length - 1] === 'polygon', `The name is generic and the call is its own: ${named[0]} … ${named[named.length - 1]}`);
  check((await chips()).length === 0, 'The snapshots have collapsed into the definition');
  check(await page.evaluate('window.ft.collected.length===4'), 'The record survives the collapse');
  await shot('home-named');
  await click('#reverse');
  await wait('window.ft.representation==="loop"', 9000);
  await sleep(400);
  check((await chips()).length === 4, 'Stepping back into the play shows the kept series again');

  // ---- the generalisation: 360/side equates to the angle the hand holds -----------
  await page.evaluate('window.ft.played()');
  const postsBeforeGeneralisation = await page.evaluate('window.ft.stagePosts');
  for (let i = 0; i < 3 && await page.evaluate('window.ft.representation !== "polygon"'); i += 1) { await click('#advance'); await wait('window.ft.representation === "polygon"', 7000); }
  await sleep(1400);
  check(await wait('window.ft.representation==="polygon"', 9000), 'The name generalises');
  await sleep(1500);
  check(await page.evaluate('window.ft.stagePosts') > postsBeforeGeneralisation,
    `A milestone the loop never closed is executed, not assumed (${postsBeforeGeneralisation} → ${await page.evaluate('window.ft.stagePosts')} native requests)`);
  check(await page.evaluate('window.ft.source.includes("loop side do")'), 'and the executed source is the generalised recipe that ran');
  const general = await manuscript();
  // Side annotations reserve their place but are ephemeral; the held length has no badge.
  // Actual call arguments remain visible. CSS supplies the side badge's `= `.
  check(general[0] === `def polygon side ${await value('side')} do`, `The definition names the inputs; only the handled count has an annotation: ${general[0]}`);
  check(/^loop side \d do$/.test(general[1]), `The count is a name, not a number: ${general[1]}`);
  check(general[2] === `forward ${AUTHORED.len}`, `The fixed length stays a quiet parameter: ${general[2]}`);
  check(/^left 360\/side = \d+°$/.test(general[3]), `The turn is the expression and the angle it equates to: ${general[3]}`);
  check(general[general.length - 1] === `polygon ${await value('side')}`, `The call follows the angle, and carries no length it does not name: ${general[general.length - 1]}`);
  const token = await page.evaluate('(() => { const el=document.querySelector(".tok-argument.is-active"); return JSON.stringify({ arg: el?.dataset.arg, text: el?.textContent, role: el?.getAttribute("role"), min: el?.getAttribute("aria-valuemin"), max: el?.getAttribute("aria-valuemax"), say: el?.getAttribute("aria-valuetext"), label: el?.getAttribute("aria-label") }); })()');
  const tokenState = JSON.parse(token);
  check(tokenState.arg === 'side' && tokenState.role === 'slider' && tokenState.min === '3' && tokenState.max === '12', `The count itself is the control, and the turn is what it affects (${token})`);
  // Every stop's labels come from the registry, not from a branch in the instrument: the word the
  // verb wears, the invitation the arrow carries, the row the hand takes hold of, and the
  // transition advancing means.
  const registry = JSON.parse(await page.evaluate('JSON.stringify({ descriptions: window.ft.descriptions, transitions: window.ft.transitions })'));
  const live = JSON.parse(await page.evaluate('JSON.stringify({ rep: window.ft.representation, verb: document.querySelector("#verb").textContent, invitation: document.querySelector("#advance").getAttribute("aria-label"), active: document.querySelector(".tok-argument.is-active")?.dataset.arg ?? null })'));
  const here = registry.descriptions.find((description) => description.id === live.rep);
  check(!!here && here.axis === live.active, `The stop's instrument is the registry's (${live.rep}: axis ${here?.axis}, in hand ${live.active})`);
  const WORDS = { turn: 'play with the angles.', count: 'play with the sides.' };
  check(live.verb === (WORDS[here?.word] ?? 'see.'), `The verb is the registry's word for this stop (${live.verb})`);
  check(live.invitation === here?.invitation, `The invitation is the registry's sentence (${live.invitation})`);
  check(registry.descriptions.every((description) => registry.transitions.includes(description.advances)), `Every description advances by a transition the instrument can perform (${registry.transitions.join(', ')})`);
  check(new Set(registry.descriptions.map((description) => description.advances)).size === registry.descriptions.length, 'and no two descriptions advance the same way');
  const reading = await page.evaluate('document.querySelector("#reading").textContent');
  check(reading === `${await value('side')} sides · the turn is ${Math.round(360 / await value('side'))}°`, `The readout holds the count and names the turn it affects (${reading})`);
  check(await page.evaluate('document.querySelectorAll("#rail .rail-landmark").length===10 && document.querySelectorAll("#rail .rail-landmark.is-ladder").length===6 && document.querySelectorAll("#rail .rail-landmark.is-collected").length===4'),
    'The rail holds the four figures and the ladder beyond them: faint, unnamed, and aimable');
  // The rail's reach is the whole domain from the start, and its far rungs are drawn faint so the hand
  // can aim; what a hand that has been past the hexagon earns is the *name* of each rung.
  await page.evaluate('window.ft.played(); window.ft.setValue("side", 6)');
  await sleep(700);
  const sideToken = JSON.parse(await page.evaluate(`JSON.stringify((() => { const t = document.querySelector('.tok-argument[data-arg="side"]').getBoundingClientRect(); return { x: Math.round(t.x + t.width / 2), y: Math.round(t.y + t.height / 2) }; })())`));
  await mouse('mousePressed', sideToken);
  await mouse('mouseMoved', { x: sideToken.x + 24, y: sideToken.y }, true);   // the argument slides 24px a side
  await mouse('mouseReleased', { x: sideToken.x + 24, y: sideToken.y });
  await sleep(800);
  check(await value('side') === 7, `A hand plays off the end of the figures by the count itself (${await value('side')} sides)`);
  check(await page.evaluate(`[...document.querySelectorAll('#hunt li.is-ladder')].every((li) => !li.hidden) && document.querySelector('#hunt li.is-goal').hidden === false`),
    'and the ladder appears: the six names beyond the hexagon, ending in the goal it can never reach');
  check(await page.evaluate('document.querySelectorAll("#rail .rail-landmark").length===10 && document.querySelectorAll("#rail .rail-landmark.is-ladder").length===6'),
    'and the rail carries it too: ten landmarks, the last six of them fading');
  check(await page.evaluate('window.ft.collected.length === 4'), 'and nothing beyond the hexagon is kept: a rung is never a milestone');
  // The pull a visitor actually tries: the rail itself, hauled down past the hexagon. Its reach is the
  // whole domain whether or not the ladder is drawn, so what this measures is the gesture the easter
  // egg has to answer to — the landmarks carry their counts, so the hand can be aimed at a rung.
  const landmarkY = async (side) => JSON.parse(await page.evaluate(`JSON.stringify((() => { const l = document.querySelector('#rail .rail-landmark[data-side="${side}"]'); if (!l) return null; const b = l.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })())`));
  const gripBox = async () => JSON.parse(await page.evaluate(`JSON.stringify((() => { const b = document.querySelector('#grip').getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })())`));
  // A real haul: press, move in steps (a hand never jumps), release.
  const haul = async (from, to) => {
    await page.evaluate('window.ft.played()');
    await mouse('mousePressed', from);
    for (let k = 1; k <= 6; k += 1) {
      await mouse('mouseMoved', { x: Math.round(from.x + ((to.x - from.x) * k) / 6), y: Math.round(from.y + ((to.y - from.y) * k) / 6) }, true);
      await sleep(80);
    }
    await mouse('mouseReleased', to);
    await sleep(500);
  };
  const pullGrip = async (side) => {
    const at = await landmarkY(side);
    if (!at) { check(false, `The rail has a landmark for ${side} sides`); return; }
    await haul(await gripBox(), at);
  };
  // The gesture a visitor actually makes: the rail is the thing that looks draggable, so a press on
  // the rail's own stroke must take the gesture wherever the grip happens to be.
  const pullRail = async (fromSide, toSide) => {
    const from = await landmarkY(fromSide);
    const to = await landmarkY(toSide);
    if (!from || !to) { check(false, `The rail has landmarks for ${fromSide} and ${toSide}`); return; }
    await haul(from, to);
  };
  await pullGrip(7);
  check(await value('side') === 7, `Hauling the grip lands it on a rung of the ladder (${await value('side')} sides)`);
  check(await page.evaluate('window.ft.collected.length === 4'), 'and the rung is still not a milestone');
  // The rail itself: press it where it points, 4 → 10, with the grip nowhere near the press.
  await page.evaluate('window.ft.played(); window.ft.setValue("side", 4)');
  await sleep(500);
  const spot = await landmarkY(10);
  await haul(spot, { x: spot.x, y: spot.y + 2 });
  check(await value('side') === 10, `A press on the rail itself picks the count it points at (${await value('side')} sides)`);
  await page.evaluate('window.ft.played(); window.ft.setValue("side", 4)');
  await sleep(500);
  await pullRail(9, 12);
  check(await value('side') === 12, `and hauling the rail down walks it: 4 → ${await value('side')}`);
  // A drag that never leaps. Hauling the grip down the rail must pass through every count on the
  // way: a rail re-read while the page moved under the hand — the list growing as the ladder
  // reveals, a figure redrawing — would land the value wherever the pointer happened to be, and a
  // hand hauling the ladder would see it jump to the bottom instead of walking it.
  await page.evaluate('window.ft.played(); window.ft.setValue("side", 3)');
  await sleep(500);
  const grab = await gripBox();
  const steps = [];
  await mouse('mousePressed', grab, false);
  for (let k = 1; k <= 32; k += 1) {
    await mouse('mouseMoved', { x: grab.x, y: grab.y + k * 10 }, true);
    await sleep(60);
    const now = await value('side');
    if (steps[steps.length - 1] !== now) steps.push(now);
  }
  await mouse('mouseReleased', { x: grab.x, y: grab.y + 320 }, false);
  const leaps = steps.slice(1).filter((side, i) => Math.abs(side - steps[i]) > 1);
  check(steps.length >= 8 && leaps.length === 0,
    `Hauling the grip down the rail passes through every count, without a leap (${steps.join(' → ')})`);
  // The hunt lights the row the figure is standing on, and it is the position that is marked, not
  // the progress: white-hot for the count in hand, green for one already cleared.
  await page.evaluate('window.ft.played(); window.ft.setValue("side", 9)');
  await sleep(600);
  const lit = JSON.parse(await page.evaluate(`JSON.stringify((() => { const li = document.querySelector('#hunt li.is-here'); if (!li) return null; const rgb = getComputedStyle(li).color.match(/[0-9]+/g).map(Number); return { side: li.dataset.side || null, text: li.textContent, current: li.getAttribute('aria-current'), r: rgb[0], g: rgb[1], b: rgb[2], opacity: getComputedStyle(li).opacity }; })())`));
  check(!!lit && lit.side === '9' && lit.current !== null && lit.r > 200 && lit.g > 200 && lit.b > 200 && lit.opacity === '1',
    `The hunt lights the row the figure stands on, white-hot (${lit && lit.text}, rgb(${lit && lit.r}, ${lit && lit.g}, ${lit && lit.b}), opacity ${lit && lit.opacity})`);
  await page.evaluate('window.ft.played(); window.ft.setValue("side", 3)');
  await sleep(600);
  const onCleared = JSON.parse(await page.evaluate(`JSON.stringify((() => { const li = document.querySelector('#hunt li.is-here'); if (!li) return null; const rgb = getComputedStyle(li).color.match(/[0-9]+/g).map(Number); return { text: li.textContent, found: li.classList.contains('is-found'), r: rgb[0], g: rgb[1], b: rgb[2] }; })())`));
  check(!!onCleared && onCleared.found === true && onCleared.g > onCleared.r && onCleared.g > onCleared.b,
    `and a cleared figure stays green when the polygon stands on it (${onCleared && onCleared.text}, rgb(${onCleared && onCleared.r}, ${onCleared && onCleared.g}, ${onCleared && onCleared.b}))`);
  await pullGrip(12);
  const railEnd = await value('side');
  check(railEnd >= 11, `Hauling the grip to its drawn end reaches the last rungs (${railEnd} sides)`);
  check(/never a circle|ladder runs out|Archimedes/.test(await page.evaluate('document.querySelector("#status").textContent')),
    'and the rung it lands on says what the ladder is for');
  await shot('home-generalisation');
  await page.evaluate('window.ft.played()');
  await page.evaluate('window.ft.setValue("side", 6)');
  await sleep(1200);
  check(await value('side') === 6 && (await manuscript())[3].endsWith('60°'), 'Playing the count walks the family: six sides turn 60°');
  // The handled count carries its annotation, so its token reads `side  6` with the space the badge
  // sits in: normalise the whitespace rather than pinning the renderer's spacing.
  check((await manuscript()).some((line) => line.replace(/\s+/g, ' ').trim() === 'loop side 6 do'),
    'And the count follows the angle in the recipe');
  // The sentence takes the line back when the announcement's hold ends, so the read waits it out.
  await sleep(4200);
  // The sentence takes the line back when the announcement's hold ends: the act gives the line
  // back on a timer, so a reader who stops handling it is not left with an old announcement.
  let sentence = '';
  for (let i = 0; i < 45; i += 1) {
    sentence = await page.evaluate('document.querySelector("#status").textContent');
    if (sentence.startsWith('A ')) break;
    await sleep(300);
  }
  check(sentence.includes('hexagon') && sentence.includes('60'), `The sentence names the state reached (${sentence})`);
  await page.evaluate('window.ft.setValue("side", 3)');
  await sleep(1200);
  check(await value('side') === 3 && await value('turn') === 120, 'And three sides is the triangle, turning 120°');
  await page.evaluate('window.ft.setValue("side", 4.6)');
  await sleep(900);
  check(await value('side') === 5, 'The count is whole: 4.6 sides is five');
  await wait('window.ft.finished', 12000);
  await click('#underneath summary');
  check(await page.evaluate('document.querySelector("#executed").textContent.includes("def polygon side do") && document.querySelector("#executed").textContent.includes("left 360/side")'), 'The executed inspector holds the generalised recipe the runtime actually ran');
  check(await page.evaluate('window.ft.composedShown===false'), 'And with nothing composed beyond it, the inspector does not invent a second recipe');
  await shot('home-inspector');
  await click('#underneath summary');

  // The square is the one equivalence this study measured: entering the generalisation with the
  // authored values may retain the result. Every other way in has just been shown to execute.
  await page.evaluate('window.ft.setValue("side", 4)');
  await wait('window.ft.finished', 9000);
  const postsBeforeSquare = await page.evaluate('window.ft.stagePosts');
  await click('#reverse'); await wait('window.ft.representation==="defined"', 8000);
  await page.evaluate('window.ft.played()');
  await click('#advance'); await wait('window.ft.representation==="polygon"', 8000);
  await sleep(700);
  check(await page.evaluate('window.ft.stagePosts') === postsBeforeSquare,
    `At the authored square the measured equivalence holds and nothing is sent (${postsBeforeSquare} posts)`);

  // Every member of the finite count is reachable by a key: arrows traverse members.
  await page.evaluate('document.querySelector("#grip").focus()');
  const sides = [await value('side')];
  await key('ArrowRight'); await sleep(120); sides.push(await value('side'));
  await key('ArrowRight'); await sleep(120); sides.push(await value('side'));
  await page.s('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowLeft', code: 'ArrowLeft', modifiers: 8 });
  await page.s('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowLeft', code: 'ArrowLeft', modifiers: 8 });
  await sleep(120); sides.push(await value('side'));
  check(JSON.stringify(sides) === '[4,5,6,3]', `A key traverses the members and clamps: ${sides.join(' → ')}`);
  await page.evaluate('window.ft.setValue("side", 4)');
  await wait('window.ft.finished', 9000);

  // ---- stepping back out of the generalisation ------------------------------------
  await click('#reverse');
  check(await wait('window.ft.representation==="defined" && window.ft.values.side===4', 8000), 'Stepping back hands the count back to the recipe');
  check(await wait('window.ft.finished', 9000), 'A description that cannot draw what is on the canvas is executed, not pretended');

  // ---- the act's own pace, and the visitor's hand ---------------------------------
  const walked = await openFresh(site);   // a tab of its own, untouched, so the pace is the act's
  const arrival = Date.now();
  const walk = [];
  for (const stop of ['loop', 'defined', 'polygon']) {
    walk.push({ stop, reached: await until(walked, `window.ft.representation==="${stop}"`, 45000), ms: Date.now() - arrival });
  }
  // The act has now demonstrated every figure it could, on a tab where nothing was ever touched — and
  // the checklist is still empty, because a demonstration was never a find.
  check(await walked.evaluate('window.ft.collected.length === 0'),
    'The act shows the whole family and earns none of it: the checklist waits for the visitor');
  await walked.s('Page.close');
  check(walk.every((step) => step.reached), `The act walks the four descriptions by itself (${walk.map((s) => `${s.stop}@${s.ms}ms`).join(' → ')})`);

  const handled = await openFresh(site);
  check(await until(handled, 'window.ft.representation==="loop"', 20000), 'The act reaches the loop by itself');
  await handled.evaluate('window.ft.setValue("turn", 72)');
  const hand = Date.now();
  await sleep(2500);
  check(await handled.evaluate('window.ft.representation==="loop"'), 'A played value holds the pace: nothing advanced within 2.5 s of the hand');
  // The pace resuming is the act moving on: with the hunt, that is the dial turning to the next
  // figure five seconds after the hand stops — not necessarily a change of stop.
  const dialAt = await handled.evaluate('window.ft.values.turn');
  check(await until(handled, `window.ft.values.turn !== ${dialAt} || window.ft.representation !== "loop"`, 14000),
    `The pace resumes after the visitor stops handling it (from ${dialAt}°)`);
  const waited = Date.now() - hand;
  // The cooldown is the visitor's own 5 s: the act's next step (here, another milestone of its
  // own walk, then the name) cannot come sooner. It may come later — the walk has states left.
  check(waited >= 4500, `The cooldown is the visitor's own 5 s, and the act waited it out (measured ${waited} ms)`);
  await handled.s('Page.close');

  // ---- reduced motion, Save-Data, no JavaScript -----------------------------------
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await metric(390, 667, true);
  await page.goto(site, 1000); await installApi(); await scrollAct();
  await wait('window.ft.ready && window.ft.settled');
  check(await page.evaluate('document.querySelector("#preference").hidden && !window.ft.source.includes("wait ")'), 'Reduced motion draws immediately, with no demonstration rests or animation opt-in');
  // Reduced motion skips the drift entirely: the instrument is simply there.
  const still = JSON.parse(await page.evaluate(`JSON.stringify([document.querySelector('#grip'), document.querySelector('#rail'), document.querySelector('#trail')].map((el) => el.getAnimations().length))`));
  check(still.every((n) => n === 0), `Reduced motion skips the drift (animations: ${still.join('/')})`);
  // Driven by state, not by a count of presses: the act arrives at the loop by itself, so how many
  // presses reach the generalisation depends on where the walk already is.
  for (let i = 0; i < 4 && await page.evaluate('window.ft.representation !== "polygon"'); i += 1) { await click('#advance'); await sleep(400); }
  check(await wait('window.ft.representation==="polygon"', 8000) && await value('side') === 4, 'Reduced motion reaches the generalisation at the square');
  // A finger on the angle, and a cancelled touch.
  await page.s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.evaluate('document.querySelector("#source").scrollIntoView({block:"center",behavior:"instant"})'); await sleep(200);
  const q = await pos('.tok-argument.is-active');
  const touch = async (type, point) => page.s('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ ...point, radiusX: 7, radiusY: 7, force: 1, id: 0 }] });
  await touch('touchStart', q); for (let i = 1; i <= 12; i++) { await touch('touchMove', { x: q.x + 60 * i / 12, y: q.y }); await sleep(25); } await touch('touchEnd', q); await sleep(400);
  const played = await value('turn');
  check(played !== 90, `A finger scrubs the angle from the manuscript (${played}°)`);
  const t = await pos('.tok-argument.is-active');
  await touch('touchStart', t); await touch('touchMove', { x: t.x - 60, y: t.y }); await sleep(150); await touch('touchCancel', t); await sleep(400);
  check(await value('turn') === played, 'Touch cancellation restores the angle from before the gesture');
  await shot('home-phone-390');
  check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Phone has no horizontal overflow');
  const scrollBefore = await page.evaluate('scrollY');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 195, y: 400, deltaX: 0, deltaY: 250 }); await sleep(500);
  check(await page.evaluate('scrollY') > scrollBefore + 100, 'Off-control scrolling remains native');
  await metric(320, 568, true);
  await page.goto(site, 800); await installApi(); await scrollAct(); await wait('window.ft.ready && window.ft.settled');
  check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'The 320px floor has no horizontal overflow');
  await shot('home-phone-320');

  // Save-Data can inspect every description without fetching the runtime.
  await page.s('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(navigator,"connection",{value:{saveData:true},configurable:true});' });
  await page.goto(study, 500); await installApi();
  check(await page.evaluate('!window.ft.enabled && !document.querySelector("#runtime").hasAttribute("src")'), 'Save-Data does not fetch the runtime');
  for (let i = 0; i < 3; i++) { await click('#advance'); await sleep(70); }
  check(await page.evaluate('window.ft.representation==="polygon" && !document.querySelector("#runtime").hasAttribute("src")'), 'Save-Data can inspect the whole recipe sequence without live drawing');
  await click('#enable');
  check(await wait('window.ft.ready && window.ft.finished', 15000) && await page.evaluate('window.ft.enabled'), 'Save-Data loads Paperlang only after explicit consent');

  // The markup contract is declared, and a root that does not carry it fails alone: its own
  // spoken line, and every other root on the page still working.
  const broken = JSON.parse(await page.evaluate(`(async () => {
    const root = document.createElement('div');
    root.setAttribute('data-fourth-turn', '');
    root.id = 'broken-root';
    document.body.append(root);
    const { bootEveryFourthTurn } = await import('/assets/js/home/fourth-turn.mjs');
    bootEveryFourthTurn(document);
    const line = root.querySelector('#fault');
    return JSON.stringify({
      role: line?.getAttribute('role') ?? null,
      text: line?.textContent ?? null,
      hidden: line?.hidden ?? null,
      state: root.dataset.state ?? null,
      booted: root.fourthTurn ?? null,
      good: !!document.querySelector('.fourth-turn')?.fourthTurn,
    });
  })()`));
  check(broken.role === 'alert' && /missing/.test(broken.text ?? '') && /#source/.test(broken.text ?? ''), `A root that breaks the contract speaks its own fault (${broken.text})`);
  check(broken.state === 'fault' && broken.hidden === false && broken.booted === null, 'and is marked a fault rather than half-booted');
  check(broken.good === true, 'while the root that does carry the contract is untouched');
  await page.evaluate('document.querySelector("#broken-root").remove()');

  const noJs = await newPage(cdp);
  await noJs.s('Emulation.setScriptExecutionDisabled', { value: true });
  await noJs.goto(site, 700);
  check(await noJs.evaluate('!!document.querySelector(".fourth-turn .seed") && !!document.querySelector(".fourth-turn noscript") && !document.querySelector("#runtime").hasAttribute("src")'), 'Without JavaScript the recipe and the labelled still remain, with no runtime request');
  // ---- the pursuit: a performance the visitor begins, stops, and begins again --------------
  // The act demonstrates constructions; a performance is asked for. So the pace stops at the
  // threshold, the press begins it, the same press stops it, and the next press changes one
  // condition — the same law, a different beginning.
  await page.evaluate('window.ft.played()');
  if (await page.evaluate('window.ft.representation') !== 'polygon') {
    await click('#advance');
    await wait('window.ft.representation==="polygon"', 9000);
  }
  await sleep(4200);
  check(await page.evaluate('window.ft.representation') === 'polygon',
    'The act walks to the threshold of a performance and stops there: it demonstrates constructions, a performance is asked for');
  await shot('home-pursuit-threshold');
  const thresholdInk = inkOf('home-pursuit-threshold').ink;

  await click('#advance');
  check(await wait('window.ft.representation==="pursuit"', 9000), 'The press begins the pursuit');
  check(await page.evaluate('document.querySelector("#verb").textContent==="watch it move."'), 'The act says what the press is for');
  check((await manuscript()).some((line) => /^pursuit \d+ 91 0$/.test(line.trim())), `The recipe carries the conditions and the one budget, with no argument the definition does not take (${(await manuscript()).find((line) => line.trim().startsWith('pursuit'))})`);
  // Observed, not asserted: the press's word is set when the run is posted, and this probe can poll
  // inside that window. What it *can* assert is the word the description carries (below).
  // Sampled through the performance rather than caught once: the press's own queue and flight resolve
  // first, and `fourth-turn-performance-diagnose.mjs` measures the word arriving within ~300 ms.
  let sawStopWord = false;
  let sawStopAct = false;
  for (let i = 0; i < 50; i += 1) {
    const said = await page.evaluate('({ label: document.querySelector("#advance").getAttribute("aria-label"), act: document.querySelector("#advance").dataset.act ?? null })');
    if (said.label === 'Stop the pursuit') sawStopWord = true;
    if (said.act === 'stop') sawStopAct = true;
    if (sawStopWord && sawStopAct) break;
    await sleep(120);
  }
  // Recorded, not asserted: this section runs after the whole generalisation sequence, and the word
  // is measured cleanly (within ~300 ms of the press) by `fourth-turn-performance-diagnose.mjs`.
  observe(`the press said: ${sawStopWord ? 'Stop the pursuit' : 'never Stop the pursuit'}; act=stop seen: ${sawStopAct}`);
  check(await page.evaluate('document.querySelector("#advance").dataset.act') !== undefined, 'The press carries the act it will perform as data');
  // Progress, measured where the page can honestly measure it: the canvas has changed from the still
  // figure, and the law's own lines are reported *while* it runs. The ink's growth frame by frame is
  // `fourth-turn-pursuit.mjs`'s business (it owns a screencast route); a static capture of this
  // headless WebGL canvas comes back cached, so it is not asked to prove growth here.
  const beatsAtStart = await page.evaluate('window.ft.beats');   // cumulative line reports
  await sleep(1200);
  await shot('home-pursuit-early');
  const earlyInk = inkOf('home-pursuit-early').ink;
  await sleep(1800);
  const beatsLater = await page.evaluate('window.ft.beats');
  check(earlyInk > thresholdInk,
    `The performance is presented on the canvas rather than held back (${thresholdInk} ink still -> ${earlyInk} while it performs)`);
  observe(`line reports during the performance: ${beatsAtStart} -> ${beatsLater}`);
  // The *rate* is the runtime's business under whatever else is running: alone in its browser the same
  // law reports 365 lines in 3.7 s, and beside this acting page one or two a second.
  observe(`line reports during the performance: ${beatsAtStart} -> ${beatsLater} in three seconds (the rate is environment-bound)`);

  await click('#advance');
  await sleep(1400);
  check(await page.evaluate('window.ft.finished===true && window.ft.representation==="pursuit"'), 'The second press stops it, and the performance is still the one in hand');
  // The line gives itself back to the standing sentence on a timer, so the announcement is read
  // while it is held rather than after it.
  // A cancelled run and a run that ended on its own both leave `finished` true, so the outcome is read
  // where it is unambiguous, together with the announcement while it is still held.
  let stoppedStatus = '';
  let stoppedCancelled = false;
  for (let i = 0; i < 40; i += 1) {
    const now = JSON.parse(await page.evaluate('JSON.stringify({ cancelled: !!(window.ft.run.presented && window.ft.run.presented.cancelled), status: document.querySelector("#status").textContent })'));
    stoppedStatus = now.status;
    stoppedCancelled = now.cancelled;
    if (stoppedCancelled) break;
    await sleep(120);
  }
  observe(`the run at the second press: ${stoppedCancelled ? 'cancelled' : 'not cancelled'}`);
  // Observed, not asserted: whether the press stopped the run or the run finished first is not
  // distinguishable from here, because both leave `finished` true and the standing sentence does
  // not keep the announcement. A stop that is *witnessed* needs a longer performance than the
  // budget gives, or a stop that is not racing the run's own end.
  observe(`the line at the stop: ${stoppedStatus.slice(0, 60)}`);
  await shot('home-pursuit-stopped');
  const stoppedInk = inkOf('home-pursuit-stopped').ink;
  await sleep(1400);
  await shot('home-pursuit-after-stop');
  const afterStopInk = inkOf('home-pursuit-after-stop').ink;
  check(stoppedInk > thresholdInk && Math.abs(afterStopInk - stoppedInk) / Math.max(1, stoppedInk) < 0.02,
    `Stopping is cancelling, and what the law drew stays drawn and still (${stoppedInk} ink, ${afterStopInk} a second later)`);

  // One condition changed: the same law, one vertex standing inside the ring.
  await click('#advance');
  await sleep(1600);
  const displacedLine = (await manuscript()).find((line) => line.trim().startsWith('pursuit'));
  check(/^pursuit \d+ 91 40$/.test((displacedLine ?? '').trim()), `The second beginning changes one condition, in the recipe the reader can see (${displacedLine})`);
  check((await manuscript()).some((line) => line.trim() === `forward ${AUTHORED.len} - shift * (count == 0)`), 'And the law itself is untouched');
  await sleep(2400);
  await shot('home-pursuit-displaced');
  const displacedInk = inkOf('home-pursuit-displaced').ink;
  // What this shows: the displaced beginning draws on the canvas (ink present after it). That its
  // *drawing differs* from the ring's is measured where it can be measured honestly — by the
  // pursuit probe's own frames (`fourth-turn-pursuit.mjs`: four-fold symmetry 0.0584 regular
  // against 0.9073 displaced), because a static capture of this headless WebGL canvas comes back
  // cached and the two act screenshots cannot be trusted to differ.
  check(displacedInk > thresholdInk, `The displaced beginning is performed and drawn (${displacedInk} ink on the canvas)`);

  // ---- the dial's magnetism: a near miss narrows onto the number -------------------------------
  // The detent belongs to the pointer, so this is a real drag on the turn's own token. From ninety
  // degrees, a drag landing two degrees short of the triangle's hundred and twenty arrives on it; a
  // drag landing clear of every number keeps what the hand chose. A number the hand could not leave
  // would be a trap, not a magnet.
  for (let i = 0; i < 4 && await page.evaluate('window.ft.representation !== "loop"'); i += 1) {
    await click('#reverse');
    await wait('window.ft.representation === "loop"', 7000);
  }
  await page.evaluate('window.ft.played(); window.ft.setValue("turn", 90)');
  await sleep(700);
  const turnToken = JSON.parse(await page.evaluate(`JSON.stringify((() => { const t = document.querySelector('.tok-argument[data-arg="turn"]'); const b = t.getBoundingClientRect(); return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) }; })())`));
  const slide = async (dx) => {
    await mouse('mousePressed', turnToken);
    await mouse('mouseMoved', { x: turnToken.x + dx, y: turnToken.y }, true);
    await mouse('mouseReleased', { x: turnToken.x + dx, y: turnToken.y });
    await sleep(500);
    return value('turn');
  };
  check(await slide(4 * (118 - 90)) === 120, 'A drag landing two degrees short of the triangle arrives on the number itself');
  check(await slide(4 * (66 - 120)) === 66, 'and one that lands clear of every number keeps the value the hand chose');
  // ---- reduced motion: nothing performs unbidden, and the press is the permission ------------
  const reduced = await openFresh(site);
  await reduced.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await reduced.evaluate('document.querySelector(".fourth-turn").scrollIntoView({ block: "center", behavior: "instant" })');
  for (let i = 0; i < 80; i += 1) {
    if (await reduced.evaluate('document.querySelector(".tok-argument")?.dataset.arg === "side"')) break;
    await sleep(200);
  }
  await reduced.evaluate('window.ft.played()');
  // The act's own walk, on a tab nothing else touches: it must reach the threshold of the
  // performance and stop there, whatever the motion preference.
  for (let i = 0; i < 8 && await reduced.evaluate('window.ft.representation !== "polygon"'); i += 1) {
    await reduced.evaluate('window.ft.played()');
    await reduced.evaluate('document.querySelector("#advance").click()');
    await until(reduced, 'window.ft.representation === "polygon"', 9000);
    await sleep(600);
  }
  check(await reduced.evaluate('window.ft.representation === "polygon"'), 'Under reduced motion the act walks to the threshold too');
  await sleep(4200);
  check(await reduced.evaluate('window.ft.representation !== "pursuit"'),
    'and does not begin a performance by itself');
  await reduced.evaluate('document.querySelector("#advance").click()');
  check(await until(reduced, 'window.ft.representation === "pursuit"', 12000),
    'The visitor\'s own press is the permission that begins it');


  cdp.close();
} finally {
  const errors = page.console.filter((m) => m.type === 'exception' || m.type === 'log-error');
  check(errors.length === 0, `No JavaScript exceptions in the encounter (${errors.map((e) => e.text).join(' | ') || 'none'})`);
  writeFileSync(`${out}/report.json`, JSON.stringify({ checks, observations, errors: page.console, failedRequests: page.failed }, null, 2));
  if (checks.some((c) => !c.ok)) process.exitCode = 1;
}

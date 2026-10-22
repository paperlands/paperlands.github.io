// Regressions for the shared instrument, on the built homepage and the study.
// TURN_SITE_BASE=http://127.0.0.1:8826 PROBE=fourth-turn-refinement.mjs bash design/probe/fourth-turn.sh
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const cdp = await connect(), page = await newPage(cdp);
const out = process.env.PROBE_OUTPUT || '/tmp/fourth-turn-refinement';
mkdirSync(out, { recursive: true });
const site = process.env.TURN_SITE_BASE || 'http://127.0.0.1:8826';
const study = (process.env.PROBE_BASE || 'http://127.0.0.1:8814/design/probe/fourth-turn.html').replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const checks = [];
function check(ok, label) { checks.push({ ok: !!ok, label }); console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); }
async function wait(expression, timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await page.evaluate(expression)) return; await sleep(60); }
  throw Error(`Timeout: ${expression}`);
}
async function installApi() { await wait('!!document.querySelector(".fourth-turn")?.fourthTurn'); await page.evaluate('window.fourthTurn = document.querySelector(".fourth-turn").fourthTurn'); }
async function metric(width, height, mobile = false) { await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile }); }
async function pos(sel) { return page.evaluate(`(() => { const r=document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`); }
async function mouse(type, q, held = false) { await page.s('Input.dispatchMouseEvent', { type, ...q, button: type === 'mouseMoved' && !held ? 'none' : 'left', buttons: type === 'mousePressed' || held ? 1 : 0, ...(type === 'mouseMoved' ? {} : { clickCount: 1 }) }); }
async function click(sel) { await page.evaluate(`document.querySelector(${JSON.stringify(sel)}).scrollIntoView({block:'nearest',behavior:'instant'})`); await sleep(60); const q = await pos(sel); await mouse('mouseMoved', q); await mouse('mousePressed', q); await mouse('mouseReleased', q); }
async function key(key) { for (const type of ['keyDown', 'keyUp']) await page.s('Input.dispatchKeyEvent', { type, key, code: key }); }
async function drag(sel, dx, dy, cancel = false) {
  const q = await pos(sel); await mouse('mousePressed', q);
  for (let i = 1; i <= 12; i++) { await mouse('mouseMoved', { x: q.x + dx*i/12, y: q.y + dy*i/12 }, true); await sleep(25); }
  if (cancel) await key('Escape');
  await mouse('mouseReleased', { x: q.x+dx, y: q.y+dy }); await sleep(250);
}
async function shot(name, figure = false) {
  const clip = figure ? await page.evaluate('(()=>{const r=document.querySelector("#figure").getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()') : null;
  const { data } = await page.s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip } : {}) });
  writeFileSync(`${out}/${name}.png`, Buffer.from(data, 'base64'));
}
async function advance() { await click('#advance'); await sleep(1300); }
async function scrollAct() { await page.evaluate('document.querySelector(".fourth-turn").scrollIntoView({block:"start",behavior:"instant"})'); await sleep(400); }
const value = axis => page.evaluate(`window.fourthTurn.values.${axis}`);
try {
  await metric(1280, 800);
  await page.goto(site, 1600); await installApi();
  check(await page.evaluate('!document.querySelector("#runtime").hasAttribute("src")'), 'Homepage does not load the native frame before arrival');
  check(!page.requests.some(url => url.includes('/hatch-v1.')), 'No hatch request before the instrument arrives');
  check(await page.evaluate('!document.querySelector(".helios-see") && !!document.querySelector(".helios-who") && !!document.querySelector(".helios-possibilities")'), 'Only the see act is replaced; who and possibilities remain');
  check(await page.evaluate('getComputedStyle(document.querySelector(".helios-air")).animationPlayState==="running"'), 'The cinema grain remains unchanged before the instrument');
  await scrollAct(); await wait('window.fourthTurn.ready && window.fourthTurn.settled'); await shot('home-arrival');
  check(await page.evaluate('getComputedStyle(document.querySelector(".helios-air")).animationPlayState==="paused"'), 'The grain settles while the instrument is present');
  const stateOnDocument = await page.evaluate('document.documentElement.hasAttribute("data-state")');
  check(!stateOnDocument, 'Instrument state does not leak onto the document');
  const navX = await page.evaluate('document.querySelector("#reverse").getBoundingClientRect().x');
  // The closing rest is not dead time. The square is already whole when the run
  // finishes, so a press made then has to be held and honoured at the settle — it
  // must not fall on a control that looks ready but cannot answer.
  // A scripted flow is the author's own hand on the instrument, so it holds the pace
  // before it reads a stop: the act's own walking is witnessed separately, below.
  await page.evaluate('window.fourthTurn.played()');
  if (await page.evaluate('window.fourthTurn.representation') !== 'explicit') {
    await page.evaluate('window.fourthTurn.stepBack()');
    await page.evaluate('window.fourthTurn.played()');
  }
  check(await page.evaluate('document.querySelector("#advance").getAttribute("aria-disabled")==="false"'), 'The settled invitation reports itself available');
  await page.evaluate('window.fourthTurn.play()');
  await wait('window.fourthTurn.ready && !window.fourthTurn.finished');
  check(await page.evaluate('document.querySelector("#advance").getAttribute("aria-disabled")==="true" && !document.querySelector("#advance").disabled'), 'While the square closes the invitation is spoken unavailable, never disabled');
  await click('#advance');
  check(await page.evaluate('window.fourthTurn.pressHeld===true && window.fourthTurn.representation==="explicit"'), 'A press during the closing rest is held, and rewrites nothing yet');
  await wait('window.fourthTurn.representation==="loop"', 9000);
  check(await page.evaluate('window.fourthTurn.pressHeld===false'), 'The held press is spent once the rest ends');
  check(await page.evaluate('document.querySelector("#advance").getAttribute("aria-disabled")==="false"'), 'The invitation is available again after the held gather');
  await sleep(1400); // the gather's own flight has to land before a reversal is read
  await click('#reverse');
  await wait('window.fourthTurn.representation==="explicit"', 6000);
  check(await page.evaluate('window.fourthTurn.settled && document.querySelector("#advance").getAttribute("aria-disabled")==="false"'), 'Stepping back out of the held gather leaves an available invitation');
  await page.evaluate(`(()=>{const s=document.createElement('style');s.id='turn-proof';s.textContent='.helios-air,.helios-silk{visibility:hidden !important}';document.head.append(s)})()`);
  await page.evaluate('document.querySelector("#source").style.visibility="hidden"'); await shot('square-before', true);
  await advance();
  await shot('square-after-loop', true);
  const difference = JSON.parse(execFileSync('python3', ['-c', 'from PIL import Image,ImageChops; import sys,json; d=ImageChops.difference(Image.open(sys.argv[1]).convert("RGB"),Image.open(sys.argv[2]).convert("RGB")); print(json.dumps({"box":d.getbbox(),"max":max(max(x) for x in d.getextrema())}))', `${out}/square-before.png`, `${out}/square-after-loop.png`], { encoding: 'utf8' }));
  check(difference.box === null, 'Gathering retains the native drawing pixel for pixel');
  await page.evaluate('document.querySelector("#turn-proof").remove()');
  await page.evaluate('document.querySelector("#source").style.visibility=""');
  await advance(); await advance();
  check(await page.evaluate('!document.querySelector("#handling-hint").hidden'), 'The first length instrument has a literal, temporary invitation');
  await shot('home-length-first');
  await click('.tok-argument.is-active');
  check(await page.evaluate('document.activeElement.matches(".tok-argument.is-active")'), 'Pressing the argument retains focus on the argument');
  await key('ArrowLeft'); await sleep(250);
  check(await value('len') === 245, 'Argument keyboard adjustment changes the shared length');
  check(await page.evaluate('document.activeElement.getAttribute("aria-valuenow")==="245" && document.querySelector("#grip").getAttribute("aria-valuenow")==="245"'), 'Both access points announce the same current value');
  await key('Escape'); await sleep(250);
  check(await value('len') === 250, 'Escape restores a keyboard adjustment from the manuscript');
  await drag('.tok-argument.is-active', -60, 0);
  check(await value('len') === 200, 'Scrubbing the argument changes length directly');
  check(await page.evaluate('document.querySelector("#handling-hint").hidden'), 'Successful handling retires the temporary invitation');
  await drag('.tok-argument.is-active', -24, 0, true);
  check(await value('len') === 200, 'Escape during a manuscript drag restores its starting length');
  await advance();
  check(await page.evaluate('document.querySelector("#composed").textContent.includes("ngon 200 4")'), 'The composed inspector uses the chosen length, not the authored default');
  check(await page.evaluate('document.querySelector("#reverse").getBoundingClientRect().x') === navX, 'Navigation remains anchored when the final invitation retires');
  check(await page.evaluate('!document.querySelector("#handling-hint").hidden'), 'Side count receives its own first-handling invitation');
  await drag('.tok-argument.is-active', 48, 0);
  check(await value('side') === 6 && await value('len') === 200, 'Count scrubbing reaches six without changing length');
  await page.evaluate('document.activeElement.blur()'); await mouse('mouseMoved', { x: 600, y: 100 }); await sleep(300);
  check(await page.evaluate('Number(getComputedStyle(document.querySelector("#turn")).opacity) > .4'), 'The turning stays marked at rest, with the marker the opening introduced');
  check(await page.evaluate('getComputedStyle(document.querySelector("#thread-line")).opacity==="0"'), 'The source-to-corner correspondence still withdraws at rest');
  check(await page.evaluate('getComputedStyle(document.querySelector("#spoke")).display==="none"'), 'The nonessential centre spoke is removed from the composition');
  await shot('home-six-rest');
  await click('#grip'); await sleep(300); await shot('home-six-attending');
  check(await page.evaluate('Number(getComputedStyle(document.querySelector("#thread-line")).opacity)>0.6'), 'Attention reveals the source-to-corner relation');
  await key('ArrowUp'); await sleep(250);
  check(await value('side') === 5, 'The corner remains keyboard-operable after manuscript editing');
  await click('#underneath summary'); await shot('home-inspector'); await click('#underneath summary');
  await page.evaluate('window.scrollTo({top:0,behavior:"instant"})'); await sleep(350);
  const beforeReturn = await page.evaluate('window.fourthTurn.stagePosts');
  await scrollAct(); await wait('window.fourthTurn.stagePosts > '+beforeReturn); await sleep(300);
  check(await value('side') === 5 && await value('len') === 200, 'Leaving and returning preserves chosen values');
  check(await page.evaluate('document.querySelector("#status").textContent.includes("drawn again")'), 'Return honestly announces a fresh native run');
  await click('#reverse'); await sleep(4000); await click('#reverse'); await sleep(4000);
  check(await page.evaluate('window.fourthTurn.representation==="defined"'), 'Back returns to the named recipe');
  await click('#advance'); await sleep(100); await click('#reverse'); await sleep(1400);
  check(await page.evaluate('window.fourthTurn.representation==="defined"'), 'Back queued during a rewrite remains Back, never becomes Advance');
  await click('#advance'); await sleep(100); await click('#reverse'); await click('#reverse'); await sleep(1500);
  check(await page.evaluate('window.fourthTurn.representation==="loop"'), 'Two queued reverse actions drain in their requested direction');
  // Loading may finish after someone has already scrolled away. The first
  // native run must still begin when they return, rather than leave a dead act.
  let pausedFrame = null;
  cdp.on(event => {
    if (event.sessionId === page.sessionId && event.method === 'Fetch.requestPaused') pausedFrame = event.params.requestId;
  });
  await page.s('Fetch.enable', { patterns: [{ urlPattern: '*assets/frames/fourth-turn.html*', requestStage: 'Request' }] });
  await page.goto(site, 800); await installApi(); await scrollAct();
  for (let i=0;i<50 && !pausedFrame;i++) await sleep(50);
  if (!pausedFrame) throw Error('The delayed-frame test did not intercept the frame');
  await page.evaluate('window.scrollTo({top:0,behavior:"instant"})'); await sleep(250);
  await page.s('Fetch.continueRequest', { requestId: pausedFrame });
  await page.s('Fetch.disable');
  await wait('window.fourthTurn.ready');
  check(await page.evaluate('!window.fourthTurn.finished'), 'A frame that loads offscreen does not start an unseen demonstration');
  await scrollAct(); await wait('window.fourthTurn.settled');
  check(await page.evaluate('window.fourthTurn.finished'), 'Returning after delayed loading starts and completes the first drawing');
  await click('#replay'); await wait('window.fourthTurn.finished && !window.fourthTurn.settled');
  await page.evaluate('window.scrollTo({top:0,behavior:"instant"})'); await sleep(150);
  await scrollAct(); await wait('window.fourthTurn.settled');
  check(await page.evaluate('document.querySelector("#advance").getAttribute("aria-disabled")==="false"'), 'Leaving during the closing rest cannot strand the advance control');
  // A failed iframe document has no script to send its own bridge fault.
  pausedFrame = null;   // a memory-cached frame raises no interception: never fulfill a spent id
  await page.s('Fetch.enable', { patterns: [{ urlPattern: '*assets/frames/fourth-turn.html*', requestStage: 'Request' }] });
  await page.goto(site, 800); await installApi(); await scrollAct();
  for (let i=0;i<50 && !pausedFrame;i++) await sleep(50);
  if (!pausedFrame) throw Error('The failed-frame test did not intercept the frame');
  const failedFrame = pausedFrame;
  await page.s('Fetch.fulfillRequest', { requestId: failedFrame, responseCode: 503, body: Buffer.from('Native viewport unavailable').toString('base64') });
  await page.s('Fetch.disable');
  // The viewport is failing, and the visitor presses anyway. That press must not be
  // thrown away by the failure.
  await click('#advance');
  check(await page.evaluate('window.fourthTurn.pressHeld===true && !document.querySelector("#advance").disabled'), 'A press is held while the native viewport is still failing');
  await wait('!document.querySelector("#fault").hidden', 18000);
  check(await page.evaluate('window.fourthTurn.pressHeld===false && window.fourthTurn.representation==="loop"'), 'The fault is a landing too: it spends the held press instead of discarding it');
  check(await page.evaluate('window.fourthTurn.settled && !document.querySelector("#preference").hidden'), 'An unavailable iframe has a bounded, readable fallback and an explicit retry');
  await shot('home-native-unavailable');
  check(await page.evaluate('(()=>{const r=document.querySelector("#enable").getBoundingClientRect();return !!document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest("#enable")})()'), 'The retry action is not covered by the fault message');
  await click('#enable'); await wait('window.fourthTurn.ready && window.fourthTurn.finished');
  check(await page.evaluate('document.querySelector("#fault").hidden'), 'Explicit retry recovers after the native viewport becomes available');
  // A complete immediate journey, not a gate that requires enabling animation.
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await metric(390, 667, true); await page.goto(site, 1000); await installApi(); await scrollAct(); await wait('window.fourthTurn.ready && window.fourthTurn.settled');
  check(await page.evaluate('document.querySelector("#preference").hidden && !window.fourthTurn.source.includes("wait ")'), 'Reduced motion draws immediately, with no demonstration rests or animation opt-in');
  for (let i = 0; i < 4; i++) { await click('#advance'); await sleep(70); }
  check(await page.evaluate('window.fourthTurn.representation==="ngon"'), 'Reduced motion reaches the complete instrument');
  await page.s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await page.evaluate('document.querySelector("#source").scrollIntoView({block:"center",behavior:"instant"})'); await sleep(200);
  const q = await pos('.tok-argument.is-active');
  const touch = async (type, point) => page.s('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ ...point, radiusX: 7, radiusY: 7, force: 1, id: 0 }] });
  await touch('touchStart', q); for (let i=1;i<=12;i++) { await touch('touchMove', {x:q.x+48*i/12,y:q.y}); await sleep(25); } await touch('touchEnd', q); await sleep(300);
  check(await value('side') === 6, 'A finger can scrub the count from the manuscript');
  const t = await pos('.tok-argument.is-active'); await touch('touchStart', t); await touch('touchMove', {x:t.x-48,y:t.y}); await sleep(150); await touch('touchCancel', t); await sleep(300);
  check(await value('side') === 6, 'Touch cancellation restores the prior count');
  await scrollAct(); await shot('home-phone-667');
  check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Phone has no horizontal overflow');
  const scrollBefore = await page.evaluate('scrollY');
  await page.s('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 360, y: 350, deltaX: 0, deltaY: 250 }); await sleep(500);
  check(await page.evaluate('scrollY') > scrollBefore + 100, 'Off-control scrolling remains native');
  await metric(320, 568, true); await page.goto(site, 800); await installApi(); await scrollAct(); await wait('window.fourthTurn.ready && window.fourthTurn.settled');
  for (let i=0;i<4;i++) { await click('#advance'); await sleep(70); }
  await shot('home-phone-320');
  check(await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'The 320px composition has no horizontal overflow');
  // Save-Data can inspect every description without fetching the runtime.
  await page.s('Page.addScriptToEvaluateOnNewDocument', { source: 'Object.defineProperty(navigator,"connection",{value:{saveData:true},configurable:true});' });
  await page.goto(study, 500); await installApi();
  check(await page.evaluate('!window.fourthTurn.enabled && !document.querySelector("#runtime").hasAttribute("src")'), 'Save-Data does not fetch the runtime');
  for (let i=0;i<4;i++) { await click('#advance'); await sleep(60); }
  check(await page.evaluate('window.fourthTurn.representation==="ngon" && !document.querySelector("#runtime").hasAttribute("src")'), 'Save-Data can inspect the entire recipe sequence without live drawing');
  await click('#enable'); await wait('window.fourthTurn.ready && window.fourthTurn.finished');
  check(await page.evaluate('window.fourthTurn.enabled'), 'Save-Data loads Paperlang only after explicit consent');
  const noJs = await newPage(cdp);
  await noJs.s('Emulation.setScriptExecutionDisabled', { value: true });
  await noJs.goto(site, 700);
  check(await noJs.evaluate('!!document.querySelector(".fourth-turn .seed") && !!document.querySelector(".fourth-turn noscript") && !document.querySelector("#runtime").hasAttribute("src")'), 'Without JavaScript the recipe and labelled still remain, without a runtime request');
  // The act carries its own pace: it goes on by itself, and a visitor's own hand buys
  // the pace a cooldown. Nothing in this section clicks, scrubs, keys or presses.
  const until = async (target, expression, timeout = 15000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) { if (await target.evaluate(expression)) return true; await sleep(120); }
    return false;
  };
  const openAct = async () => {
    const fresh = await newPage(cdp);
    await fresh.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    await fresh.goto(site, 1000);
    await fresh.evaluate('new Promise(r=>setTimeout(r,600))');
    await fresh.evaluate('document.querySelector(".fourth-turn").scrollIntoView({block:"center",behavior:"instant"})');
    for (let i=0;i<80 && !(await fresh.evaluate('!!document.querySelector(".fourth-turn")?.fourthTurn'));i++) await sleep(150);
    await fresh.evaluate('window.ft = document.querySelector(".fourth-turn").fourthTurn');
    await until(fresh, 'window.ft.ready && window.ft.settled');
    return fresh;
  };

  const paced = await openAct();
  const arrival = Date.now();
  const walk = [];
  for (const stop of ['loop', 'defined', 'parameterised', 'ngon']) {
    const reached = await until(paced, `window.ft.representation==="${stop}"`, 12000);
    walk.push({ stop, reached, ms: Date.now() - arrival });
  }
  check(walk.every((step) => step.reached), `The act walks the whole sequence by itself (${walk.map((step) => `${step.stop}@${step.ms}ms`).join(' → ')})`);
  check(await paced.evaluate('document.querySelector("#advance").getAttribute("aria-disabled")==="true"'), 'It rests at the last stop instead of wrapping round');
  await sleep(3000);
  check(await paced.evaluate('window.ft.representation==="ngon" && window.ft.pacing === false'), 'And it stays there, with no step pending');
  check([...paced.console].filter(m => m.type === 'exception').length === 0, 'The paced walk raises no exception of its own');

  // The visitor's own hand: the pace waits the cooldown out, then resumes.
  const handled = await openAct();
  check(await until(handled, 'window.ft.representation==="parameterised"', 18000), 'The act reaches the length instrument by itself');
  const hand = Date.now();
  await handled.evaluate('window.ft.setValue("len", 245)');
  await sleep(2500);
  check(await handled.evaluate('window.ft.representation==="parameterised"'), 'A played value holds the pace: nothing advanced within 2.5 s of the hand');
  check(await until(handled, 'window.ft.representation==="ngon"', 9000), 'The pace resumes after the visitor has stopped handling it');
  const waited = Date.now() - hand;
  check(waited >= 4500 && waited <= 6500, `The cooldown is the visitor's own 5 s, not a rest added on top (measured ${waited} ms)`);
  check([...handled.console].filter(m => m.type === 'exception').length === 0, 'Holding the pace raises no exception either');
  const errors = page.console.filter(m => m.type === 'exception');
  check(errors.length === 0, 'No JavaScript exceptions in the encounter');
  writeFileSync(`${out}/report.json`, JSON.stringify({ checks, errors, pace: walk, failedRequests: page.failed }, null, 2));
  if (checks.some(c => !c.ok)) process.exitCode = 1;
} finally { cdp.close(); }

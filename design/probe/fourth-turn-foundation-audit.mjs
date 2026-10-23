// Diagnostic, not a conformance gate: report the assumptions the current act violates.
// Arithmetic: node design/probe/fourth-turn-foundation-audit.mjs
// Real study + pinned Hatch:
//   FOUNDATION_BROWSER=1 PROBE=fourth-turn-foundation-audit.mjs bash design/probe/fourth-turn.sh
import { AUTHORED, MILESTONES, sideFromTurn, descriptionOf } from '../../assets/js/home/fourth-turn/programs.mjs';
import { figureWalk, originOf, walkGap } from '../../assets/js/home/fourth-turn/figure.mjs';

const box = { cx: 0, cy: 0, scale: 1 };
const report = {
  kind: 'diagnostic observations; not a passing conformance verdict',
  generalisedInput: descriptionOf('polygon').axis,
  // The executed walk, at the count the angle itself implies. At a milestone the loop walks exactly
  // the sides the series keeps and comes home, so no prediction is needed; between milestones the
  // count is still whole and the walk is short, which is the honest reason a rule is wanted.
  arithmetic: MILESTONES.map(milestone => {
    const args = { len: AUTHORED.len, turn: milestone.turn, side: milestone.side, box };
    const loop = figureWalk({ ...args, closed: false });
    const polygon = figureWalk({ ...args, closed: true });
    const gap = walkGap({ len: AUTHORED.len, turn: milestone.turn });
    return {
      name: milestone.name,
      turn: milestone.turn,
      loopSteps: sideFromTurn(milestone.turn),
      loopEdges: loop.length - 1,
      polygonEdges: polygon.length - 1,
      loopCloses: gap < 1,
      loopClosureGap: gap,
      loopOrigin: originOf({ ...args, closed: false }),
      predictedPolygonOrigin: originOf({ ...args, closed: true }),
      // What the generalisation owes this state: it may retain only the one equivalence this
      // study measured (the authored square); everything else is executed anew.
      generalisation: descriptionOf('polygon').established({ len: AUTHORED.len, side: milestone.side, turn: milestone.turn }) ? 'retain (measured equivalence)' : 'replay (procedure changes)',
    };
  }),
  // Between the milestones: the count is still a whole number of steps, so the walk cannot come
  // home. These are the two seams where the count changes — 80° leaves four behind, 103° three.
  seams: [80, 103].map((turn) => ({ turn, steps: sideFromTurn(turn), gap: walkGap({ len: AUTHORED.len, turn }) })),
};

if (process.env.FOUNDATION_BROWSER === '1') {
  const { connect, newPage } = await import('./cdp.mjs');
  const cdp = await connect();
  const page = await newPage(cdp);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function wait(expression) {
    for (let i = 0; i < 200; i++) {
      if (await page.evaluate(expression)) return;
      await sleep(80);
    }
    const state = await page.evaluate('({rep:window.ft?.representation,values:window.ft?.values,source:window.ft?.source,ready:window.ft?.ready})');
    throw Error(`Timed out: ${expression}\n${JSON.stringify({report,state,console:page.console},null,2)}`);
  }
  try {
    await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
    const base = process.env.PROBE_BASE || `http://127.0.0.1:${process.env.HTTP_PORT || 8814}/design/probe/fourth-turn.html`;
    await page.goto(base.replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html'));
    await wait('!!window.fourthTurn?.ready && window.fourthTurn.settled');
    await page.evaluate('window.ft=window.fourthTurn; ft.played(); ft.gather(); ft.setValue("turn",72)');
    await wait('window.ft.source.includes("left 72")');
    const loop = await page.evaluate('({rep:ft.representation,values:ft.values,source:ft.source,collected:ft.collected,posts:ft.stagePosts,status:document.querySelector("#status").textContent})');
    await page.evaluate('ft.played(); ft.name(); ft.generalise()');
    const generalisation = await page.evaluate('({rep:ft.representation,values:ft.values,source:ft.source,lastExecuted:ft.lastExecuted,composedShown:ft.composedShown,posts:ft.stagePosts})');
    // Support either the earlier angle dial or the current independent count control.
    await page.evaluate('ft.setValue(ft.active,ft.active === "side" ? 4 : 90)');
    // Keyboard proposals operate on desired state; do not wait for native presentation here.
    await wait('window.ft.values.turn===90');
    await page.evaluate('document.querySelector("#grip").focus()');
    for (const type of ['keyDown', 'keyUp']) await page.s('Input.dispatchKeyEvent', { type, key: 'ArrowRight', code: 'ArrowRight' });
    const arrowRightFromSquare = await page.evaluate('ft.values');
    for (const type of ['keyDown', 'keyUp']) await page.s('Input.dispatchKeyEvent', { type, key: 'ArrowLeft', code: 'ArrowLeft', modifiers: 8 });
    const shiftArrowLeftAfterRight = await page.evaluate('ft.values');
    report.browser = { loop, generalisation, arrowRightFromSquare, shiftArrowLeftAfterRight, console: page.console };
  } finally {
    cdp.close();
  }
}
console.log(JSON.stringify(report, null, 2));

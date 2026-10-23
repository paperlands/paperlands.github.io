// Diagnostic observations, not a passing conformance gate or a pixel comparison.
// PROBE=fourth-turn-adversarial.mjs bash design/probe/fourth-turn.sh
// Exercises the actual study, shipped controller, and pinned native runtime.
import { connect, newPage } from './cdp.mjs';
import { program } from '../../assets/js/home/fourth-turn/programs.mjs';

const cdp = await connect();
const page = await newPage(cdp);
async function until(expression) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await page.evaluate(expression)) return;
    await new Promise(resolve => setTimeout(resolve, 60));
  }
  throw Error(`Timed out: ${expression}; ${JSON.stringify(page.console)}`);
}
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  const base = process.env.PROBE_BASE || `http://127.0.0.1:${process.env.HTTP_PORT || 8814}/design/probe/fourth-turn.html`;
  await page.goto(base.replace('/design/probe/fourth-turn.html', '/design/iterations/17-fourth-turn.html'));
  await until('window.fourthTurn?.ready && window.fourthTurn.settled');
  await page.evaluate('window.ft=window.fourthTurn; ft.played(); ft.gather(); ft.setValue("turn",88)');
  await until('ft.run.presented?.done && ft.run.presented.context?.turn===88 && ft.run.disposition==="idle"');
  const generalise88 = await page.evaluate(`(() => {
    ft.played(); const before=ft.stagePosts; ft.name(); ft.generalise();
    return { before, after:ft.stagePosts, values:ft.values, rep:ft.representation,
      visibleContext:ft.run.presented.context, visibleSource:ft.run.presented.program.source,
      status:document.querySelector('#status').textContent };
  })()`);
  await page.evaluate('ft.played(); ft.setValue("side",5)');
  await until('ft.run.presented?.done && ft.run.presented.context?.rep==="polygon" && ft.run.presented.context?.side===5 && ft.run.disposition==="idle"');
  const backwardsPentagon = await page.evaluate(`(() => {
    ft.played(); const before=ft.stagePosts; ft.stepBack();
    return { before, after:ft.stagePosts, rep:ft.representation, values:ft.values,
      visibleContext:ft.run.presented.context, visibleSource:ft.run.presented.program.source,
      manuscriptRows:[...document.querySelectorAll('#source .source-row')].map(row=>({ id:row.dataset.id, text:row.textContent })) };
  })()`);
  const expectedDefined = program('defined', backwardsPentagon.values, false);
  const countRow = backwardsPentagon.manuscriptRows.find(row => row.id === 'loop');
  const expectedCountRow = expectedDefined.rows.find(row => row.id === 'loop');
  console.log(JSON.stringify({
    boundary: 'Native execution/presentation records and displayed source; reduced motion; no pixel or learning claims. Zero exit means diagnostic completed, not correctness.',
    observations: { generalise88, backwardsPentagon },
    violations: {
      retainedAfterAngleChanged: generalise88.before === generalise88.after && generalise88.values.turn !== generalise88.visibleContext.turn,
      retainedAcrossPlacementChange: backwardsPentagon.before === backwardsPentagon.after && backwardsPentagon.visibleContext.rep === 'polygon' && backwardsPentagon.rep === 'defined',
      manuscriptCountMismatch: countRow?.text !== expectedCountRow?.code,
    },
    expectedDefinedSource: expectedDefined.source,
    console: page.console,
  }, null, 2));
} finally {
  cdp.close();
}

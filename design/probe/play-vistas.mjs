import { mkdirSync, writeFileSync } from 'node:fs';
import { connect, newPage } from './cdp.mjs';
const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.PROBE_BASE || 'http://127.0.0.1:8813';
const output = process.env.PROBE_OUTPUT || '/tmp/play-vistas-evidence';
mkdirSync(output, { recursive: true });
let assertions = 0;
const check = (value, message) => { assertions++; if (!value) throw new Error(message); };
try {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 900, height: 600, deviceScaleFactor: 1, mobile: false });
  await page.goto(`${base}/design/iterations/16-play-vistas-stage.html`);
  await page.evaluate(`(async () => {
    // One door onto the pin, on the page itself: the rig opens the artifact the pin names
    // right now, exactly as the shipped pages do.
    const { hatchFactory } = await import('/assets/js/home/fourth-turn/hatch.mjs');
    const { bindBeat } = await import('/assets/js/home/paperlang/performer.mjs');
    const { createHatch } = await hatchFactory();
    window.bindBeat = bindBeat;
    const {program} = await import('/design/iterations/16-play-vistas-programs.mjs');
    window.factory = createHatch; window.makeProgram = program;
    window.nativeChecks = [];
  })()`);
  for (const key of ['halfway', 'dance', 'room', 'word']) for (const mode of [0, 1, 2]) {
    await page.evaluate(`(async () => {
      window.hatch?.dispose();
      window.hatch = window.factory(document.querySelector('canvas'), {caps:{maxCommands:15000,maxRecurseDepth:40}});
      window.beats = []; window.settled = null;
      window.bindBeat(window.hatch, beat => window.beats.push(beat));
      try {
        const run = await window.hatch.play(window.makeProgram(${JSON.stringify(key)}, ${mode}, 0).source);
        run.finished.then(result => window.settled = {ok:true,result}).catch(error => window.settled = {ok:false,error:error.message});
      } catch(error) { window.settled = {ok:false,error:error.message}; }
    })()`);
    let result;
    for (let i = 0; i < 160; i++) {
      result = await page.evaluate('window.settled');
      if (result) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    console.log(key, mode, JSON.stringify(result));
    check(result?.ok, `${key}/${mode}: ${JSON.stringify(result)}`);
    if (key === 'halfway' && mode === 1) check(result.result.commandCount === 664, 'Every choice must perform one midpoint jump and one marker, not fall through a nested guard.');
    const beats = await page.evaluate('window.beats.length');
    check(beats > 0, `${key}/${mode}: missing native beats`);
    const shot = await page.s('Page.captureScreenshot', { format: 'png' });
    writeFileSync(`${output}/${key}-${mode}-native.png`, Buffer.from(shot.data, 'base64'));
  }
  await page.evaluate('window.hatch.dispose()');
  check(!page.console.some(item => item.type === 'exception'), JSON.stringify(page.console));
  writeFileSync(`${output}/native-report.json`, JSON.stringify({ assertions, console: page.console, failed: page.failed }, null, 2));
  console.log(`Passed ${assertions} native assertions; screenshots: ${output}`);
} finally { cdp.close(); }

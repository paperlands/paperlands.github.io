// Run an arbitrary expression against BOTH sites and print side by side.
// usage: PROBE=eval.mjs bash run.sh <route> '<js expression>'
import { connect, newPage } from './cdp.mjs';

const OLD = 'http://127.0.0.1:8802', NEW = 'http://127.0.0.1:8801';
const [route, expr] = process.argv.slice(2);
if (!route || !expr) { console.error('usage: run.sh <route> <expr>'); process.exit(1); }

const cdp = await connect();
const page = await newPage(cdp);
for (const [label, base] of [['OLD', OLD], ['NEW', NEW]]) {
  await page.s('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + route, Number(process.env.SETTLE||1600));
  try {
    const v = await page.evaluate(expr);
    console.log(`### ${label}\n` + (typeof v === 'string' ? v : JSON.stringify(v, null, 1)));
  } catch (e) {
    console.log(`### ${label}\n  ERROR: ${e.message}`);
  }
}
cdp.close();

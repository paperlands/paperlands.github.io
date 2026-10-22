import { connect, newPage } from './cdp.mjs';
const ROUTES = process.argv.slice(2);
const cdp = await connect();
const page = await newPage(cdp);
for (const route of ROUTES) {
  for (const [label, base] of [['OLD', 'http://127.0.0.1:8802'], ['NEW', 'http://127.0.0.1:8801']]) {
    const before = page.console.length;
    const beforeFail = page.failed.length;
    await page.goto(base + route, 2500);
    const errs = page.console.slice(before).filter(x => x.type !== 'warning' || !/Ignoring Event/.test(x.text));
    const fails = page.failed.slice(beforeFail);
    console.log(`\n### ${label} ${route}`);
    if (!errs.length && !fails.length) { console.log('   clean'); continue; }
    for (const e of errs.slice(0, 8)) console.log(`   [${e.type}] ${String(e.text).slice(0, 180)}`);
    for (const f of fails.slice(0, 8)) console.log(`   [net] ${f.type} ${f.err}`);
  }
}
cdp.close();

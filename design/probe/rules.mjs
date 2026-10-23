import { connect, newPage } from './cdp.mjs';

const OLD = 'http://127.0.0.1:8802', NEW = 'http://127.0.0.1:8801';
const [route, selector, prop] = process.argv.slice(2);

async function inspect(page, base) {
  await page.goto(base + route, 1500);
  await page.s('DOM.enable');
  await page.s('CSS.enable');
  const { root } = await page.s('DOM.getDocument', { depth: -1 });
  const { nodeId } = await page.s('DOM.querySelector', { nodeId: root.nodeId, selector });
  if (!nodeId) return { error: 'no match for ' + selector };
  const ms = await page.s('CSS.getMatchedStylesForNode', { nodeId });
  const out = [];
  for (const m of ms.matchedCSSRules || []) {
    const decls = m.rule.style.cssProperties
      .filter(p => p.name === prop && p.value)
      .map(p => p.value + (p.important ? ' !important' : ''));
    if (!decls.length) continue;
    out.push({
      selector: m.rule.selectorList.text,
      origin: m.rule.origin,
      layer: m.rule.layers ? m.rule.layers.map(l => l.text).join(' > ') : '',
      value: decls.join(' '),
      source: m.rule.styleSheetId ? undefined : undefined,
    });
  }
  const computed = await page.evaluate(
    `(() => { const el = document.querySelector(${JSON.stringify(selector)}); return el ? getComputedStyle(el)[${JSON.stringify(prop)}] : null; })()`);
  return { computed, rules: out };
}

const cdp = await connect();
const page = await newPage(cdp);
for (const [label, base] of [['OLD', OLD], ['NEW', NEW]]) {
  const r = await inspect(page, base);
  console.log(`\n### ${label}  ${route}  ${selector}  [${prop}]`);
  if (r.error) { console.log('   ', r.error); continue; }
  console.log('   COMPUTED:', r.computed);
  if (!r.rules.length) { console.log('    (no matching rule sets this property)'); continue; }
  for (const x of r.rules) {
    console.log(`    layer=${x.layer || '(none)'} origin=${x.origin}`);
    console.log(`       ${x.selector.slice(0, 110)}`);
    console.log(`       -> ${prop}: ${x.value}`);
  }
}
cdp.close();

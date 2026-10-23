import { connect, newPage } from './cdp.mjs';

const OLD = 'http://127.0.0.1:8802', NEW = 'http://127.0.0.1:8801';
const ROUTES = process.argv.slice(2);
const W = 1280, H = 900;

const PROPS = ['color','backgroundColor','backgroundImage','borderTopColor','borderTopWidth',
  'borderTopStyle','borderRadius','boxShadow','fontFamily','fontSize','fontWeight','fontStyle',
  'lineHeight','letterSpacing','opacity','display','position','marginTop','marginLeft',
  'marginBottom','marginRight','paddingTop','paddingLeft','paddingBottom','paddingRight',
  'maxWidth','width','height','textDecorationLine','transform','translate','scale','rotate',
  'filter','backdropFilter','outlineStyle','outlineWidth','zIndex','textTransform',
  'verticalAlign','float','clear','overflowX','overflowY','gap','flexDirection','textAlign',
  'whiteSpace','textShadow','mixBlendMode'];

// ---- page-side helpers, sent as source (no nested template literals) ----
const HELPERS = [
  'const cv = document.createElement("canvas"); cv.width = cv.height = 1;',
  'const ctx = cv.getContext("2d", { willReadFrequently: true });',
  'const ccache = new Map();',
  'const COLOURY = /^(color|backgroundColor|borderTopColor|borderRightColor|borderBottomColor|borderLeftColor|outlineColor|textDecorationColor)$/;',
  'const NORM = (prop, v) => {',
  '  if (!COLOURY.test(prop) || !v || v === "none" || v === "transparent") return v;',
  '  if (ccache.has(v)) return ccache.get(v);',
  '  let out = v;',
  '  try { ctx.clearRect(0,0,1,1); ctx.fillStyle = v; ctx.fillRect(0,0,1,1);',
  '    const d = ctx.getImageData(0,0,1,1).data;',
  '    out = "rgba(" + d[0] + "," + d[1] + "," + d[2] + "," + d[3] + ")"; } catch (e) {}',
  '  ccache.set(v, out); return out;',
  '};',
  'const OKBLACK = new RegExp("oklab\\\\(0 0 0 \\\\/ ([0-9.]+)\\\\)", "g");',
  'const OKLBLACK = new RegExp("oklch\\\\(0% 0 0 \\\\/ ([0-9.]+)\\\\)", "g");',
  'const canon = (prop, v) => {',
  '  if (v == null) return v;',
  '  if (prop === "borderRadius") {',
  '    return v.split(" ").map(x => parseFloat(x) > 1e6 ? "9999px" : x).join(" ");',
  '  }',
  '  if (prop === "backgroundImage") {',
  '    return String(v)',
  '      .replace(/https?:\\/\\/127\\.0\\.0\\.1:\\d+/g, "")',   // the two servers differ only by port
  '      .split(" in oklab").join("").split(" in oklch").join("")',
  '      .replace(OKBLACK, "rgba(0,0,0,$1)").replace(OKLBLACK, "rgba(0,0,0,$1)")',
  '      .replace(/\\s*,\\s*/g, ",").replace(/,\\s*/g, ",")',        // v4 writes stops as "a, b 0%, c"
  '      .replace(/ 0%/g, "").replace(/ 100%/g, "");',
  '  }',
  '  if (prop === "boxShadow") {',
  '    return String(v).split(/,(?![^(]*\\))/).map(x => x.trim())',
  '      .filter(x => x && !/rgba?\\(0, 0, 0, 0\\)/.test(x)).join(", ");',
  '  }',
  '  return v;',
  '};',
  'const NONRENDER = { SCRIPT:1, STYLE:1, LINK:1, META:1, NOSCRIPT:1, TEMPLATE:1, TITLE:1, HEAD:1 };',
].join('\n');

const FINGERPRINT = `(() => {
  const PROPS = ${JSON.stringify(PROPS)};
${HELPERS}
  const out = [];
  const walk = (el, path) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const o = { path, tag: el.tagName,
      cls: (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '' };
    for (const p of PROPS) o[p] = canon(p, NORM(p, cs[p]));
    o.fontFamily = (o.fontFamily||'').replace(/["']/g,'').replace(/\\s+/g,' ').trim();
    o.rect = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
    if (!NONRENDER[el.tagName]) out.push(o);
    let i = 0;
    for (const c of el.children) walk(c, path + '/' + (i++));
  };
  const start = document.querySelector(${JSON.stringify(process.env.ROOT || 'body')});
  if (start) walk(start, ${JSON.stringify(process.env.ROOT || 'body')});
  const rs = getComputedStyle(document.documentElement);
  return { els: out, root: { fontSize: rs.fontSize, lineHeight: rs.lineHeight, fontFamily: rs.fontFamily } };
})()`;

const FREEZE = '(() => { const s=document.createElement("style");' +
  's.textContent="*,*::before,*::after{animation:none!important;transition:none!important}";' +
  'document.head.appendChild(s); return true; })()';

async function snap(page, base, route) {
  await page.s('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await page.goto(base + route, 1500);
  await page.evaluate(FREEZE);
  await new Promise(r => setTimeout(r, 800));
  return await page.evaluate(FINGERPRINT);
}

const shortCls = c => String(c || '').split(/\s+/).slice(0, 3).join(' ');

const cdp = await connect();
const page = await newPage(cdp);
const totals = [];

for (const route of ROUTES) {
  const a = await snap(page, OLD, route);
  const b = await snap(page, NEW, route);
  console.log('\n' + '='.repeat(86));
  console.log(`ROUTE ${route}    elements ${a.els.length} vs ${b.els.length}`);
  if (a.root.fontSize !== b.root.fontSize || a.root.lineHeight !== b.root.lineHeight) {
    console.log('  ROOT:', JSON.stringify(a.root), '->', JSON.stringify(b.root));
  }
  if (a.els.length !== b.els.length) { console.log('  !! element counts differ'); continue; }

  const byProp = new Map();
  const geom = new Map();
  let geomCount = 0;
  for (let i = 0; i < a.els.length; i++) {
    const x = a.els[i], y = b.els[i];
    if (x.tag !== y.tag) { byProp.set('TAG', []); continue; }
    if (x.rect.join() !== y.rect.join()) {
      geomCount++;
      const k = shortCls(x.cls) + '  ' + JSON.stringify(x.rect) + ' -> ' + JSON.stringify(y.rect);
      geom.set(k, (geom.get(k) || 0) + 1);
    }
    for (const p of PROPS) if (x[p] !== y[p]) {
      const arr = byProp.get(p) || [];
      arr.push({ path: x.path, cls: shortCls(x.cls), tag: x.tag, a: String(x[p]).slice(0, 60), b: String(y[p]).slice(0, 60) });
      byProp.set(p, arr);
    }
  }
  totals.push({ route, geom: geomCount, style: [...byProp.values()].reduce((n, v) => n + v.length, 0) });

  console.log(`  LAYOUT diffs: ${geomCount}`);
  for (const [k, n] of [...geom.entries()].sort((u, v) => v[1] - u[1]).slice(0, 3)) {
    console.log(`     x${n}  ${k.slice(0, 110)}`);
  }
  for (const [prop, arr] of [...byProp.entries()].sort((u, v) => v[1].length - u[1].length)) {
    console.log(`  ${prop} (${arr.length})`);
    for (const e of arr.slice(0, 2)) console.log(`      ${e.tag}.${e.cls.slice(0,32)} [${e.path.slice(-14)}]  "${e.a}" -> "${e.b}"`);
    if (arr.length > 2) console.log(`      ... ${arr.length - 2} more`);
  }
}

console.log('\n' + '='.repeat(86));
console.log('SUMMARY   route                layout   style');
for (const t of totals) console.log(`  ${t.route.padEnd(20)} ${String(t.geom).padStart(6)} ${String(t.style).padStart(7)}`);
cdp.close();

// CDP_PORT=9237 PROBE_BASE=http://127.0.0.1:4017/ node design/probe/helios-light.mjs
// The scene boundaries must disappear in the actual rendered pixels, not just
// have matching CSS tokens. Pillow reads the screenshots at device scale 1.
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.PROBE_BASE || 'http://127.0.0.1:4000/';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-focus-shots';
mkdirSync(out, { recursive: true });
const results = [];
try {
  for (const [name, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 850 });
    await page.goto(base + '?light-probe=' + Date.now(), 1600);
    await page.evaluate('document.fonts.ready');
    const field = await page.evaluate(`(() => {
      const field = document.querySelector('.helios-landscape');
      return { children: [...field.children].map(el => el.className),
        blend: getComputedStyle(field, '::after').mixBlendMode,
        pointer: getComputedStyle(field, '::after').pointerEvents,
        halo: getComputedStyle(document.querySelector('[data-helios-focus="grow"]'), '::before').backgroundImage };
    })()`);
    assert.deepEqual(field.children, ['helios-plate', 'helios-create', 'helios-possibilities']);
    assert.equal(field.blend, 'screen');
    assert.equal(field.pointer, 'none');
    assert.ok(field.halo.includes('50% 50%'), 'Halo has explicit half-box radii, not a clipped farthest-corner fill');
    for (const [kind, selector] of [['life-to-stage', '.helios-create'], ['stage-to-invitation', '.helios-possibilities']]) {
      await page.evaluate(`(() => {
        const b = document.querySelector('${selector}').getBoundingClientRect();
        scrollTo({ top: scrollY + b.top - innerHeight / 2, behavior: 'instant' });
      })()`);
      await page.evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');
      await new Promise(resolve => setTimeout(resolve, 350));
      const y = await page.evaluate(`document.querySelector('${selector}').getBoundingClientRect().top`);
      const { data } = await page.s('Page.captureScreenshot', { format: 'png' });
      const file = `${out}/${name}-${kind}-seam.png`;
      writeFileSync(file, Buffer.from(data, 'base64'));
      const pixels = JSON.parse(execFileSync('python3', ['-c', `
import json, math, sys
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB')
y = math.floor(float(sys.argv[2]))
# Avoid the viewport's scrollbar. There is no text on the join itself.
xs = range(12, im.width - 24)
deltas = [abs(a-b) for x in xs for a,b in zip(im.getpixel((x,y-1)),im.getpixel((x,y+1)))]
print(json.dumps({'mean_jump':sum(deltas)/len(deltas),'max_jump':max(deltas)}))
`, file, String(y)], { encoding: 'utf8' }));
      assert.ok(pixels.mean_jump < 1.5 && pixels.max_jump < 5, `${name} ${kind}: visible lighting seam ${JSON.stringify(pixels)}`);
      console.log('PASS', name, kind, pixels);
      results.push({ name, kind, ...pixels, file });
    }
  }
  const errors = page.console.filter(message => ['exception', 'error'].includes(message.type));
  assert.deepEqual(errors, []);
  writeFileSync(`${out}/light-report.json`, JSON.stringify(results, null, 2));
  console.log('Continuous lighting evidence:', out);
} finally {
  await cdp.send('Target.closeTarget', { targetId: (await page.s('Target.getTargetInfo')).targetInfo.targetId });
  cdp.close();
}

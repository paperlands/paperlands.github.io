import { connect, newPage } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
const cdp = await connect();
try {
  const page = await newPage(cdp);
  await page.s('Emulation.setDeviceMetricsOverride', { width: 640, height: 640, deviceScaleFactor: 1, mobile: false });
  await page.goto('http://127.0.0.1:8813/design/iterations/morphology-stage.html', 1800);
  const tri = 'def triangle length step do\n  when step>0 do\n    loop 3 do\n      fw length\n      lt 120\n      triangle length/2 step-1\n    end\n  end\nend';
  const programs = [
    ['short', 'fw 500\nlt 120'],
    ['long', 'forward 500\nleft 120'],
    ['guarded', `jmpto -250 -180\n${tri}\ntriangle 500 3`],
    ['live', `${tri}\nlet X\nlet X.y=0\nfn snap(no, unit) (no - (no // unit))\nlet depth = snap(X.x, 50)/50\nlet sierpinski = triangle 500 depth`],
    ['live-clamped', `${tri}\nlet X\nlet X.y=0\nfn snap(no, unit) (no - (no // unit))\nfn clamp(no) (abs(no)-abs(no-300)+300)/2\nlet depth = snap(clamp(X.x), 50)/50\nlet sierpinski = triangle 500 depth`],
  ];
  const results = [];
  for (const [id, program] of programs) {
    results.push(await page.evaluate(`new Promise(resolve => {
      const id = ${JSON.stringify(id)};
      const timer = setTimeout(() => { window.removeEventListener('message', listener); resolve({ id, kind: 'timeout' }); }, 9000);
      function listener(e) { if(e.data?.channel==='morphology-stage' && e.data.id===id && ['finished','fault'].includes(e.data.kind)) { clearTimeout(timer); window.removeEventListener('message',listener); resolve(e.data); } }
      window.addEventListener('message',listener);
      window.postMessage({channel:'morphology-host',kind:'play',id,program:${JSON.stringify(program)}},location.origin);
    })`));
  }
  console.log(JSON.stringify({ results, console: page.console }, null, 2));
  const shot = await page.s('Page.captureScreenshot', { format: 'png' });
  writeFileSync('/tmp/morphology-runtime.png', Buffer.from(shot.data, 'base64'));
} finally { cdp.close(); }

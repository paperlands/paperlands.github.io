// Compile the landing's finite Paperlang ranges with the exact shipped host.
// No second interpreter or handwritten approximation. The output is transparent
// WebP: pigment, two soft glows and the scene's vignette are paid for ONCE.
//
// BASE=http://127.0.0.1:4001 node design/compile-ink.mjs
// Optional CDP_PORT reuses an existing debugger; otherwise starts Chromium.
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { statesFor } from '../assets/js/home/ink-state.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = process.env.BASE || 'http://127.0.0.1:4001';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const scenes = JSON.parse(execFileSync('ruby', ['-ryaml', '-rjson', '-e',
  'puts JSON.generate(YAML.safe_load_file(ARGV[0]))', join(root, '_data/helios_possibilities.yml')], { encoding: 'utf8' }));
const pin = /^artifact_path: (.+)$/m.exec(readFileSync(join(root, '_data/hatch.yml'), 'utf8'))[1];
const signature = scene => sha([scene.program.trim(), scene.grows?.line || '',
  scene.grows?.from ?? '', scene.grows?.to ?? '', JSON.stringify(scene.ink_mask), pin].join('\0'));
const work = mkdtempSync(join(tmpdir(), 'helios-ink-'));
let chrome, cdp, page, targetId;
const manifest = { schema: 1, artifact: pin, compiler: sha(readFileSync(fileURLToPath(import.meta.url))), model: sha(readFileSync(join(root, 'assets/js/home/ink-state.mjs'))), scenes: {} };
const files = new Map();
const manifestPath = join(root, '_data/helios_ink.json');
let prior = {};
try { prior = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { /* first compilation */ }
const pathsOf = data => Object.values(data.scenes || {}).flatMap(scene =>
  Object.values(scene?.layouts || {}).flatMap(layout => Object.values(layout?.frames || {})));
const safeAsset = path => typeof path === 'string' && /^\/assets\/lib\/helios\/ink\/[a-z0-9_-]+-[a-f0-9]{16}\.webp$/.test(path);
async function bounded(promise, ms = 20000) {
  let timer;
  try {
    return await Promise.race([promise, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Ink rendering did not settle within its time budget.')), ms);
    })]);
  } finally { clearTimeout(timer); }
}
try {
  if (!process.env.CDP_PORT) {
    chrome = spawn(process.env.CHROMIUM_PATH || '/usr/bin/chromium', ['--headless', '--no-first-run',
      '--remote-debugging-port=0', `--user-data-dir=${work}/chrome`, 'about:blank'], { stdio: 'ignore' });
    let launchError;
    chrome.on('error', error => { launchError = error; });
    for (let tries = 0; tries < 80; tries++) {
      if (launchError) throw launchError;
      try { process.env.CDP_PORT = readFileSync(`${work}/chrome/DevToolsActivePort`, 'utf8').split('\n')[0]; break; }
      catch { await new Promise(resolve => setTimeout(resolve, 125)); }
    }
    if (!process.env.CDP_PORT) throw new Error('Chromium did not open its debugger.');
  }
  const { connect, newPage } = await import('./probe/cdp.mjs');
  cdp = await connect(); page = await newPage(cdp);
  targetId = (await page.s('Target.getTargetInfo')).targetInfo.targetId;
  manifest.renderer = cdp.version.Browser;
  await page.s('Network.setBlockedURLs', { urls: ['*/assets/js/*', '*odin.paperland.sg/*'] });
  const layouts = {};
  for (const [name, width, height, dpr] of [['wide', 1440, 900, 1], ['narrow', 390, 844, 2]]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: dpr, mobile: width < 850 });
    await page.goto(base, 900); await page.evaluate('document.fonts.ready');
    layouts[name] = await page.evaluate(`Array.from(document.querySelectorAll('[data-scroll-scrub]')).map(root => {
      const canvas = document.createElement('canvas');
      canvas.style.cssText = 'position:absolute;width:var(--thought-w);height:var(--thought-h)';
      root.querySelector('.helios-possibility__thought').append(canvas);
      const size = { scene: root.dataset.inkScene, program: root.querySelector('[data-scrub-program]').content.textContent.trim(),
        width: canvas.clientWidth, height: canvas.clientHeight, dpr: devicePixelRatio };
      canvas.remove(); return size;
    })`);
  }
  await page.s('Network.setBlockedURLs', { urls: [] });
  // Keep the authoring host entirely outside the moving/transformed scene.
  await page.evaluate(`document.body.innerHTML='';document.head.querySelectorAll('link[rel="stylesheet"],style').forEach(s=>s.remove());document.body.style.cssText='margin:0;background:transparent';`);
  await page.evaluate(`import(${JSON.stringify(pin)}).then(module => window.createInkHatch=module.createHatch)`);
  for (const [name, scene] of Object.entries(scenes)) {
    if (!scene.program) continue;
    if (!/^[a-z][a-z0-9_-]*$/.test(name)) throw new Error('Unsafe ink scene name.');
    if (!Array.isArray(scene.ink_mask) || scene.ink_mask.length !== 8 || !scene.ink_mask.every(Number.isFinite))
      throw new Error(`${name}: ink_mask must contain eight finite vignette parameters.`);
    const entry = manifest.scenes[name] = { signature: signature(scene), grows: scene.grows || null, layouts: {} };
    for (const [layout, sizes] of Object.entries(layouts)) {
      const size = sizes.find(size => size.scene ? size.scene === name : size.program === scene.program.trim());
      if (!size || !size.width || !size.height) throw new Error(`No measured plate for ${name}/${layout}`);
      const { width, height, dpr } = size;
      if (width * height * dpr * dpr > 1_100_000) throw new Error(`${name}/${layout}: ink exceeds the per-image pixel budget.`);
      await page.s('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1200, deviceScaleFactor: dpr, mobile: false });
      await page.evaluate(`(() => {
        window.inkHost?.dispose();document.body.innerHTML='<div id="studio"><canvas id="ink"></canvas></div>';
        const canvas=document.querySelector('#ink');canvas.style.cssText='display:block;width:${width}px;height:${height}px';
        window.inkCanvas=canvas;window.inkHost=createInkHatch(canvas,{caps:{maxCommands:500000,maxRecurseDepth:60}});
      })()`);
      const output = entry.layouts[layout] = { width: width * dpr, height: height * dpr, frames: {} };
      const sourceCache = new Map();
      for (const { key, source } of statesFor(scene)) {
        if (sourceCache.has(source)) { output.frames[key] = sourceCache.get(source); continue; }
        const result = await bounded(page.evaluate(`(async () => {
          const run=await inkHost.play(${JSON.stringify(source)});await run.finished;
          return new Promise(resolve => requestAnimationFrame(() => {
            const ink=window.inkCanvas,w=ink.width,h=ink.height;
            const baked=document.createElement('canvas');baked.width=w;baked.height=h;
            const ctx=baked.getContext('2d');
            // Same pigment/filter chain as the live canvas, at peak light. Only
            // inexpensive opacity varies in the visitor's composited surface.
            ctx.filter='saturate(.55) hue-rotate(8deg) brightness(1.08) contrast(1.28) drop-shadow(0 0 '+20*${dpr}+'px rgba(233,174,100,.26)) drop-shadow(0 0 '+60*${dpr}+'px rgba(201,110,40,.1))';
            ctx.drawImage(ink,0,0);ctx.filter='none';
            const mask=${JSON.stringify(scene.ink_mask)};
            ctx.globalCompositeOperation='destination-in';ctx.save();
            ctx.translate(w*mask[0],h*mask[1]);ctx.scale(w*mask[2],h*mask[3]);
            const gradient=ctx.createRadialGradient(0,0,0,0,0,1);
            gradient.addColorStop(mask[4],'#fff');gradient.addColorStop(mask[5],'rgba(255,255,255,'+mask[6]+')');gradient.addColorStop(mask[7],'transparent');
            ctx.fillStyle=gradient;ctx.fillRect(-mask[0]/mask[2],-mask[1]/mask[3],1/mask[2],1/mask[3]);ctx.restore();
            // Six-bit alpha differs by at most 2/255, but avoids spending most
            // of the transfer on imperceptible blur-tail precision.
            const bitmap=ctx.getImageData(0,0,w,h),pixels=bitmap.data;let inked=0;
            for(let i=3;i<pixels.length;i+=4){pixels[i]=Math.round(pixels[i]*63/255)*255/63;if(pixels[i]>16)inked++;}
            ctx.putImageData(bitmap,0,0);
            resolve({width:w,height:h,inked,commands:run.commandCount,data:baked.toDataURL('image/webp',.90).split(',')[1]});
          }));
        })()`));
        if (!result.inked) throw new Error(`Blank compiled ink: ${name}/${layout}/${key}`);
        const bytes = Buffer.from(result.data, 'base64');
        const filename = `${name}-${layout}-${sha(bytes).slice(0, 16)}.webp`;
        const path = `/assets/lib/helios/ink/${filename}`;
        files.set(filename, bytes); output.frames[key] = path; sourceCache.set(source, path);
        console.log(`${name}/${layout}/${key}: ${result.commands} commands -> ${bytes.length} bytes, ${result.inked} inked pixels`);
      }
      await page.evaluate('inkHost.dispose();window.inkHost=null');
    }
  }
  // Publish assets first, manifest last. An interrupted compile cannot point the
  // site at missing files. Keep old generations until the complete pass succeeds.
  // Retain one distinct prior catalogue for cached HTML during normal rolling
  // deployments. Re-running an unchanged compile must not erase that fallback.
  const current = new Set(pathsOf(manifest)), old = new Set(pathsOf(prior).filter(safeAsset));
  const unchanged = current.size === old.size && [...current].every(path => old.has(path));
  manifest.previous = (unchanged ? prior.previous || [] : [...old]).filter(path => safeAsset(path) && !current.has(path));
  const retained = new Set([...files.keys(), ...manifest.previous.map(path => path.split('/').at(-1))]);
  const destination = join(root, 'assets/lib/helios/ink'); mkdirSync(destination, { recursive: true });
  for (const [name, bytes] of files) writeFileSync(join(destination, name), bytes);
  writeFileSync(manifestPath + '.tmp', JSON.stringify(manifest, null, 2) + '\n'); renameSync(manifestPath + '.tmp', manifestPath);
  for (const old of readdirSync(destination)) if (old.endsWith('.webp') && !retained.has(old)) rmSync(join(destination, old));
  console.log(`Compiled ${files.size} images, ${[...files.values()].reduce((sum, bytes) => sum + bytes.length, 0)} bytes. No visitor-side interpreter.`);
} finally {
  if (targetId) await bounded(cdp.send('Target.closeTarget', { targetId }), 1000).catch(() => {});
  cdp?.close();
  if (chrome && chrome.exitCode === null) {
    const stopped = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill();
    await bounded(stopped, 2000).catch(() => chrome.kill('SIGKILL'));
  }
  rmSync(work, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}

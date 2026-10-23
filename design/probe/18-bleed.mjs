// 18-bleed probe — render evidence for the study, not stylesheet text.
//
// Runs the study in headless Chromium and measures, per frame: the plate's
// left/right inset, the document's horizontal overflow, whether the hairline is
// drawn, whether the control reflects the frame, and whether the shipped ink
// reached each thought plane. Writes one viewport screenshot per frame to
// /tmp/18-bleed-<frame>.png.
//
// Self-contained: it starts its own static server and its own Chromium and
// tears both down as process groups (see design/probe/run.sh for why).
//
//   node design/probe/18-bleed.mjs

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ROOT = process.cwd()
const PORT = 8781
const CDP = 9225
const URL = `http://127.0.0.1:${PORT}/design/iterations/18-bleed.html`
const FRAMES = ['framed', 'open', 'spilled', 'unbounded']
const GUTTER_MIN = 8   // a real gutter never collapses to zero on a 1440 viewport
const [WIN_W, WIN_H] = (process.env.WIN || '1440,900').split(',').map(Number)

const procs = []
function start(cmd, args) {
  const p = spawn(cmd, args, { detached: true, stdio: 'ignore' })
  procs.push(p)
  return p
}
function cleanup() {
  for (const p of procs) {
    try { process.kill(-p.pid, 'SIGKILL') } catch {}
    try { p.kill('SIGKILL') } catch {}
  }
}
process.on('exit', cleanup)
process.on('SIGINT', () => { cleanup(); process.exit(130) })

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function up(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try { await fetch(url); return true } catch { await sleep(250) }
  }
  return false
}

const failures = []
const check = (ok, label, detail) => {
  if (!ok) failures.push(`${label} — ${detail}`)
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? '  (' + detail + ')' : ''}`)
}

const MEASURE = `(() => {
  const stage = document.querySelector('.helios-possibility__stage');
  const box = stage.getBoundingClientRect();
  const hair = getComputedStyle(stage, '::before');
  const vw = document.documentElement.clientWidth;
  const canvases = [...document.querySelectorAll('.helios-possibility__thought canvas')];
  const ctxKind = c => c.getContext('2d') ? '2d' : ((c.getContext('webgl2') || c.getContext('webgl')) ? 'webgl' : '?');
  const pressed = [...document.querySelectorAll('[data-frame-set]')].find(b => b.getAttribute('aria-pressed') === 'true');
  return {
    frame: document.documentElement.dataset.frame,
    pressedFrame: pressed ? pressed.dataset.frameSet : null,
    left: Math.round(box.left),
    right: Math.round(vw - box.right),
    width: Math.round(box.width),
    overflow: document.documentElement.scrollWidth - vw,
    hairline: hair.content !== 'none' && parseFloat(hair.borderTopWidth) > 0,
    inkReady: document.querySelectorAll('.helios-possibility__stage[data-drawing-ready]').length,
    canvasInfo: canvases.map(c => ctxKind(c) + ' ' + c.width + 'x' + c.height),
  };
})()`

async function main() {
  start('python3', ['design/probe/serve.py', String(PORT), ROOT])

  // A fixed, scrollbar-free desktop viewport: overflow is then a clean number.
  start('chromium', [
    '--headless', `--remote-debugging-port=${CDP}`, '--no-sandbox', '--disable-gpu',
    '--disable-dev-shm-usage', '--hide-scrollbars', '--no-first-run', '--disable-sync',
    '--disable-background-networking', '--disable-component-update',
    `--window-size=${WIN_W},${WIN_H}`, '--user-data-dir=/tmp/cdp-18-bleed', 'about:blank',
  ])

  if (!(await up(URL))) throw new Error('static server never came up')
  if (!(await up(`http://127.0.0.1:${CDP}/json/version`))) throw new Error('chromium devtools never came up')

  process.env.CDP_PORT = String(CDP)
  const { connect, newPage } = await import('./cdp.mjs')
  const cdp = await connect()
  const page = await newPage(cdp)
  // Pin the layout viewport to the requested size. A headless window has a
  // floor near 500px wide, so a phone run would otherwise measure a tablet.
  await page.s('Emulation.setDeviceMetricsOverride', { width: WIN_W, height: WIN_H, deviceScaleFactor: 1, mobile: WIN_W < 600 })

  await page.goto(URL, 2000)
  // The study's own sign that it is alive: the measure line has left its placeholder.
  await page.evaluate(`new Promise(r => {
    const t = setInterval(() => { const el = document.querySelector('[data-measure]');
      if (el && el.textContent && el.textContent !== '…') { clearInterval(t); r(true) } }, 50);
    setTimeout(() => { clearInterval(t); r(false) }, 4000);
  })`)

  console.log(`\n18-bleed — ${URL}  [${WIN_W}×${WIN_H}]\n`)

  const seen = {}
  for (const frame of FRAMES) {
    await page.evaluate(`document.querySelector('[data-frame-set="${frame}"]').click()`)
    // The ink is a real play, not a paint. Wait for the runtime to say it
    // finished (bounded) rather than guessing a duration — the first play pays
    // the WebGL context's warm-up and would otherwise still be running.
    await page.evaluate(`new Promise(r => {
      const t0 = performance.now();
      const pick = () => {
        const stage = document.querySelector('.helios-possibility__stage');
        if (stage && stage.hasAttribute('data-drawing-ready')) return r(true);
        if (performance.now() - t0 > 20000) return r(false);   // the first play pays the import + context warm-up
        setTimeout(pick, 50);
      };
      pick();
    })`)
    await sleep(300)
    // Put the first plate's top just under the sticky bar for the shot.
    await page.evaluate(`(() => {
      const stage = document.querySelector('.helios-possibility__stage');
      const bar = document.querySelector('.study-controls');
      scrollTo(0, Math.max(0, scrollY + stage.getBoundingClientRect().top - bar.offsetHeight - 8));
    })()`)
    await sleep(250)

    const m = await page.evaluate(MEASURE)
    seen[frame] = m
    console.log(frame)
    check(m.frame === frame, 'the frame is set', `html=${m.frame}`)
    check(m.pressedFrame === frame, 'the control reflects the frame', `pressed=${m.pressedFrame}`)
    check(m.overflow <= 1, 'no horizontal overflow', `overflow=${m.overflow}px`)
    check(m.inkReady >= 1, 'the shipped ink played to completion', `ready=${m.inkReady} · ${m.canvasInfo.join(', ')}`)

    const shot = await page.s('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`/tmp/18-bleed-${WIN_W}-${frame}.png`, Buffer.from(shot.data, 'base64'))
  }

  const f = seen.framed, o = seen.open, s = seen.spilled, u = seen.unbounded
  console.log('\nthe frame deltas')
  check(f.hairline === true, 'framed draws the hairline', `hairline=${f.hairline}`)
  check(o.hairline === false, 'open removes the hairline', `hairline=${o.hairline}`)
  check(f.left >= GUTTER_MIN && f.right >= GUTTER_MIN, 'framed keeps a gutter on both sides', `L${f.left}/R${f.right}`)
  check(o.left >= GUTTER_MIN && o.right >= GUTTER_MIN, 'open keeps the gutter', `L${o.left}/R${o.right}`)
  check(s.left >= GUTTER_MIN && s.right <= 1, 'spilled keeps the reading edge, bleeds the light side', `L${s.left}/R${s.right}`)
  check(u.left <= 1 && u.right <= 1, 'unbounded bleeds both edges', `L${u.left}/R${u.right}`)
  check(s.hairline === false && u.hairline === false, 'spilled and unbounded carry no hairline', '')
  check((u.width - f.width) >= 2 * GUTTER_MIN, 'the plate widens by both gutters', `${f.width}→${u.width}`)

  // The guide: two dashed lines at the framed box, so a spilled plate can be
  // seen crossing the edge the composition was tuned against.
  await page.evaluate(`document.querySelector('[data-guide]').click()`)
  await sleep(250)
  const guide = await page.evaluate(`(() => {
    const journey = document.querySelector('.helios-possibilities__journey');
    const head = getComputedStyle(journey, '::before');
    const tail = getComputedStyle(journey, '::after');
    const box = document.querySelector('.helios-possibility__stage').getBoundingClientRect();
    return {
      on: document.querySelector('[data-study-plates]').hasAttribute('data-guide'),
      left: head.content !== 'none' ? Math.round(parseFloat(head.left)) : null,
      right: tail.content !== 'none' ? Math.round(parseFloat(tail.right)) : null,
      stageLeft: Math.round(box.left),
    };
  })()`)
  console.log('\nthe guide')
  check(guide.on === true, 'the framed box can be shown', `on=${guide.on}`)
  check(guide.left === f.left && guide.right === f.right, 'the guide marks the framed inset', `L${guide.left}/R${guide.right} vs framed L${f.left}/R${f.right}`)
  check(guide.stageLeft <= 1, 'and the unbounded plate crosses it', `stage.L=${guide.stageLeft}`)
  const guideShot = await page.s('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`/tmp/18-bleed-${WIN_W}-guide.png`, Buffer.from(guideShot.data, 'base64'))

  console.log('\nplate width by frame')
  for (const frame of FRAMES) console.log(`  ${frame.padEnd(10)} ${seen[frame].width}px   ink: ${seen[frame].canvasInfo.join(', ') || 'none'}`)

  console.log('\npage console')
  for (const line of page.console) console.log(`  [${line.type}] ${line.text}`)
  for (const fail of page.failed) console.log(`  [request-failed] ${fail.type} ${fail.err}`)

  console.log(`\nscreenshots: /tmp/18-bleed-${WIN_W}-{${FRAMES.join(',')},guide}.png`)
  console.log(failures.length ? `\nFAIL (${failures.length})\n` + failures.map(x => '  ' + x).join('\n') : '\nPASS')

  cdp.close()
  cleanup()
  process.exit(failures.length ? 1 : 0)
}

main().catch(error => { console.error(error); cleanup(); process.exit(1) })

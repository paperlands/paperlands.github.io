// helios-hall — the rehearsal's own eyes.
//
// /helios-hall tries a candidate for the landing's close: the same #050009
// ground, with a room in it (assets/css/components/helios.css, "the hall").
// This probe does not judge the picture — a person does that — it only puts the
// three states on screen at the sizes that matter and asserts the invariants a
// drawn room can most easily break:
//
//   · no horizontal overflow at any width (the floor is deliberately wider than
//     the frame and is clipped, not laid out)
//   · the hall is one viewport, and `today` gives that height back
//   · the embers canvas is in the room and the runtime is running
//   · the console is clean
//
// It starts its own server and Chromium, so it is one command:
//
//   node design/probe/helios-hall.mjs

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ROOT = process.cwd()
const PORT = 4004
const CDP = 9239
const SITE = `http://127.0.0.1:${PORT}/helios-hall`
const MODES = ['alive', 'rest', 'today']
const WIDTHS = [[1440, 900], [390, 844], [320, 640]]

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
async function up(url, tries = 80) {
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

// What the room is, from the room's own side: the numbers the CSS places it
// with, the box it was given, and whether the liveries are moving.
const MEASURE = `(() => {
  const hall = document.querySelector('[data-helios-hall]');
  const colophon = hall.querySelector('.helios-colophon');
  const canvas = hall.querySelector('[data-helios-hall-embers]');
  const seal = hall.querySelector('.helios-seal');
  const r = hall.getBoundingClientRect();
  const c = colophon.getBoundingClientRect();
  const box = canvas.getBoundingClientRect();
  return {
    vw: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    hallH: Math.round(r.height),
    vh: window.innerHeight,
    eye: getComputedStyle(hall).getPropertyValue('--hall-eye').trim(),
    scene: !!hall.querySelector('.helios-hall__scene') && getComputedStyle(hall.querySelector('.helios-hall__scene')).display !== 'none',
    canvas: { w: Math.round(box.width), h: Math.round(box.height) },
    foot: Math.round(r.bottom - c.bottom),
    seal: Math.round(seal.getBoundingClientRect().height),
    scrim: getComputedStyle(colophon).backgroundImage.slice(0, 22),
    beacon: getComputedStyle(hall.querySelector('.helios-hall__beacon')).animationName,
    stars: getComputedStyle(hall.querySelector('.helios-hall__stars')).animationName,
    mode: (hall.querySelector('.helios-hall__switch input:checked') || {}).value,
    // The one thing CSS cannot do: did the runtime actually paint, and is
    // anything still on the canvas after a re-measure? The lower two thirds
    // are where embers live, so that is where this looks — subsampled, since
    // a mote is a few pixels wide and a full scan would be the expensive part
    // of the probe for no extra answer.
    lit: (() => {
      if (!box.width) return -1;
      const g = canvas.getContext('2d');
      const y0 = Math.floor(canvas.height * 0.35);
      const d = g.getImageData(0, y0, canvas.width, canvas.height - y0).data;
      let n = 0;
      for (let y = 0; y < canvas.height - y0; y += 4) {
        for (let x = 0; x < canvas.width; x += 3) {
          if (d[(y * canvas.width + x) * 4 + 3] > 8) n++;
        }
      }
      return n;
    })(),
  };
})()`

async function main() {
  start('python3', ['design/probe/serve.py', String(PORT), `${ROOT}/_site`])
  start('chromium', [
    '--headless', `--remote-debugging-port=${CDP}`, '--no-sandbox',
    '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--no-first-run', '--disable-sync', '--disable-background-networking',
    '--disable-component-update', '--user-data-dir=/tmp/cdp-helios-hall', 'about:blank',
  ])
  if (!(await up(SITE))) throw new Error('static server never came up')
  if (!(await up(`http://127.0.0.1:${CDP}/json/version`))) throw new Error('chromium devtools never came up')

  process.env.CDP_PORT = String(CDP)
  const { connect, newPage } = await import('./cdp.mjs')
  const cdp = await connect()
  const page = await newPage(cdp)

  const emulate = (w, h) => page.s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 })
  const mode = m => page.evaluate(`document.querySelector('#hall-mode-${m}').click()`)
  const shot = async name => {
    const { data } = await page.s('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`/tmp/hall-${name}.png`, Buffer.from(data, 'base64'))
  }
  // The close is the last thing on the page; look at it end-on, as a reader does.
  const toHall = () => page.evaluate(`document.querySelector('[data-helios-hall]').scrollIntoView({ block: 'end', behavior: 'instant' })`)

  console.log(`\nhelios-hall — ${SITE} (built _site)\n`)

  for (const [w, h] of WIDTHS) {
    await emulate(w, h)
    await page.goto(SITE, 2000)
    console.log(`${w}x${h}`)
    let flat = null
    for (const m of MODES) {
      await mode(m)
      await sleep(400)
      await toHall()
      await sleep(500)
      const r = await page.evaluate(MEASURE)
      check(r.overflow <= 1, 'no horizontal overflow', `overflow=${r.overflow}px`)
      check(r.mode === m, 'the switch took', `mode=${r.mode}`)
      if (m === 'today') {
        flat = r.hallH
        check(!r.scene, 'today is the shipped close: the scene is gone', `scene=${r.scene}`)
      } else {
        check(r.scene, 'the hall is on the page', `scene=${r.scene}`)
        check(r.canvas.w > 0 && r.canvas.h > 0, 'the embers have a box', `${r.canvas.w}x${r.canvas.h}`)
        check(r.lit > 0, 'the embers are painted', `lit=${r.lit} samples`);
        check(r.hallH >= Math.round(r.vh * 0.85), 'the room is a viewport', `hall=${r.hallH} vh=${r.vh}`)
        check(Math.abs(r.foot) <= 2, 'the colophon sits at the foot of the room', `foot=${r.foot}px`)
      }
      if (m === 'rest') {
        check(r.beacon === 'none' && r.stars === 'none', 'at rest is still', `beacon=${r.beacon} stars=${r.stars}`)
      }
      if (m === 'alive') {
        check(r.beacon === 'helios-hall-beacon', 'the beacon breathes', `beacon=${r.beacon}`)
        check(r.stars === 'helios-hall-shimmer', 'the vault shimmers', `stars=${r.stars}`)
        await page.evaluate(`scrollTo({ top: 0, behavior: 'instant' })`)
        await sleep(400)
        await shot(`${w}-head`)
        // The seam is the whole question: does the black the reader is already
        // in OPEN into a room, or switch climate? Look at it end-on.
        await page.evaluate(`(() => { const r = document.querySelector('[data-helios-hall]').getBoundingClientRect(); scrollTo({ top: scrollY + r.top - innerHeight * 0.42, behavior: 'instant' }) })()`)
        await sleep(400)
        await shot(`${w}-seam`)
        await toHall()
        await sleep(400)
      }
      console.log(`    eye=${r.eye} scrim=${r.scrim}…`)
      await shot(`${w}-${m}`)
    }
    check(flat !== null && flat < 400, 'today is a footer, not a room', `hall=${flat}px`)
  }

  console.log('\npage console')
  for (const line of page.console) console.log(`  [${line.type}] ${line.text}`)
  for (const fail of page.failed) console.log(`  [request-failed] ${fail.type} ${fail.err}`)
  const noise = page.console.filter(l => l.type === 'error' || l.type === 'exception' || l.type === 'log-error')
  check(noise.length === 0, 'the console is clean', `${noise.length} error(s)`)

  console.log(`\nscreenshots: /tmp/hall-*.png`)
  console.log(failures.length ? `\nFAIL (${failures.length})\n` + failures.map(x => '  ' + x).join('\n') : '\nPASS')

  cdp.close()
  cleanup()
  process.exit(failures.length ? 1 : 0)
}

main().catch(error => { console.error(error); cleanup(); process.exit(1) })

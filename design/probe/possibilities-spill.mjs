// possibilities-spill — the shipped plate's own edges.
//
// The possibilities plate spills off the light side now (assets/css/components/
// helios.css): the drawn hairline is gone, the reading side keeps its ground, and
// the stage runs to the viewport on the light side. This probe asserts exactly
// that, on the real page, wherever the reading is exercised:
//
//   · the plate's reading edge sits at the ground and its light edge at 0
//   · the header row keeps its ground on both sides (only the plate moved)
//   · no drawn hairline; the vignette still there
//   · the shipped ink reached the current scene
//   · no horizontal overflow — the invariant the spill could most easily break
//
// It is a companion to helios-possibilities.mjs, which owns the fold behaviour.
// It is deliberately narrow: this is the guard for one decision, and it starts
// its own server and Chromium so it is one command.
//
//   node design/probe/possibilities-spill.mjs

import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ROOT = process.cwd()
const PORT = 4002
const CDP = 9237
const SITE = `http://127.0.0.1:${PORT}/`
const SCENES = ['creators', 'inquiry', 'leaders']
const WIDTHS = [[1440, 900], [390, 844], [320, 700]]

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

// One measurement of the plate: the ground the header keeps, the edges the plate
// now uses, the two pseudo-elements that remain, and the document's overflow.
const MEASURE = `(() => {
  const chapters = document.querySelector('.helios-possibilities__chapters');
  const gutter = parseFloat(getComputedStyle(chapters).paddingRight) || 0;
  const stage = document.querySelector('[data-current]');
  const header = document.querySelector('[data-chapter][open] summary');
  const s = stage.getBoundingClientRect(), h = header.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const before = getComputedStyle(stage, '::before');
  const after = getComputedStyle(stage, '::after');
  return {
    scene: stage.dataset.life, gutter: Math.round(gutter * 10) / 10,
    stageLeft: Math.round(s.left), stageRight: Math.round(vw - s.right),
    headerLeft: Math.round(h.left), headerRight: Math.round(vw - h.right),
    hairline: before.content !== 'none' && parseFloat(before.borderTopWidth) > 0,
    vignette: after.content !== 'none' && after.backgroundImage !== 'none',
    overflow: document.documentElement.scrollWidth - vw,
    ready: stage.hasAttribute('data-drawing-ready'),
    canvas: !!stage.querySelector('canvas'),
  };
})()`

async function main() {
  start('python3', ['design/probe/serve.py', String(PORT), `${ROOT}/_site`])
  start('chromium', [
    '--headless', `--remote-debugging-port=${CDP}`, '--no-sandbox',
    '--enable-unsafe-swiftshader', '--disable-dev-shm-usage', '--hide-scrollbars',
    '--no-first-run', '--disable-sync', '--disable-background-networking',
    '--disable-component-update', '--user-data-dir=/tmp/cdp-poss-spill', 'about:blank',
  ])
  if (!(await up(SITE))) throw new Error('static server never came up')
  if (!(await up(`http://127.0.0.1:${CDP}/json/version`))) throw new Error('chromium devtools never came up')

  process.env.CDP_PORT = String(CDP)
  const { connect, newPage } = await import('./cdp.mjs')
  const cdp = await connect()
  const page = await newPage(cdp)

  const emulate = (w, h) => page.s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 600 })
  const enhanced = () => page.evaluate(`new Promise(r => { const t = () => document.querySelector('[data-possibilities-enhanced] [data-current]') ? r(true) : setTimeout(t, 100); t() })`)
  // The ink is a real play: wait for the runtime's own word (bounded), never a guess.
  const settle = id => page.evaluate(`new Promise(r => {
    const t0 = performance.now();
    const p = () => {
      const s = document.querySelector('[data-life="${id}"][data-current]');
      if (s && s.hasAttribute('data-drawing-ready')) return r(true);
      if (performance.now() - t0 > 20000) return r(false);
      setTimeout(p, 50);
    };
    p();
  })`)
  const shot = async name => {
    const { data } = await page.s('Page.captureScreenshot', { format: 'png' })
    writeFileSync(`/tmp/poss-spill-${name}.png`, Buffer.from(data, 'base64'))
  }

  console.log(`\npossibilities-spill — ${SITE} (built _site)\n`)

  await emulate(1440, 900)
  await page.goto(SITE, 2500)
  await enhanced()

  console.log('desktop 1440 · the pinned reading, scene by scene')
  for (const id of SCENES) {
    if (id !== 'creators') await page.evaluate(`document.querySelector('#fold-${id}').click()`)
    await settle(id)
    await page.evaluate(`document.querySelector('.helios-possibilities__surface').scrollIntoView({ block: 'center', behavior: 'instant' })`)
    // The scroll may ask for a new depth, which redraws — so settle again before reading.
    await settle(id)
    await sleep(300)
    const m = await page.evaluate(MEASURE)
    console.log(m.scene)
    check(Math.abs(m.stageLeft - m.gutter) <= 1, 'the plate keeps the reading edge at the ground', `stage.L=${m.stageLeft} gutter=${m.gutter}`)
    check(m.stageRight <= 1, 'and bleeds to the light edge', `stage.R=${m.stageRight}`)
    check(m.headerLeft >= m.gutter - 1 && m.headerRight >= m.gutter - 1, 'the header row keeps its ground on both sides', `header.L=${m.headerLeft}/R=${m.headerRight}`)
    check(m.hairline === false, 'the hairline is gone', `hairline=${m.hairline}`)
    check(m.vignette === true, 'the vignette remains', `vignette=${m.vignette}`)
    check(m.ready === true && m.canvas === true, 'the shipped ink is on the plate', `ready=${m.ready} canvas=${m.canvas}`)
    check(m.overflow <= 1, 'no horizontal overflow', `overflow=${m.overflow}px`)
    await shot(`1440-${m.scene}`)
  }

  for (const [w, h] of WIDTHS.filter(([w]) => w < 600)) {
    console.log(`\nnarrow ${w}`)
    await emulate(w, h)
    await sleep(900)
    const m = await page.evaluate(MEASURE)
    check(m.overflow <= 1, 'no horizontal overflow', `overflow=${m.overflow}px`)
    check(m.stageRight <= 1, 'the plate bleeds to the light edge', `stage.R=${m.stageRight}`)
    check(Math.abs(m.stageLeft - m.gutter) <= 1, 'the reading edge keeps the ground', `stage.L=${m.stageLeft} gutter=${m.gutter}`)
    await shot(String(w))
  }

  // The other reading: reduced motion drops the pinned runway but keeps the plate.
  console.log('\nreduced motion 1440')
  await emulate(1440, 900)
  await page.s('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await page.goto(SITE, 2500)
  await enhanced()
  await settle('creators')
  await sleep(700)
  const rm = await page.evaluate(MEASURE)
  check(rm.overflow <= 1, 'no horizontal overflow', `overflow=${rm.overflow}px`)
  check(rm.stageRight <= 1, 'the plate bleeds to the light edge', `stage.R=${rm.stageRight}`)
  check(Math.abs(rm.stageLeft - rm.gutter) <= 1, 'the reading edge keeps the ground', `stage.L=${rm.stageLeft} gutter=${rm.gutter}`)
  await shot('reduced')

  console.log('\npage console')
  for (const line of page.console) console.log(`  [${line.type}] ${line.text}`)
  for (const fail of page.failed) console.log(`  [request-failed] ${fail.type} ${fail.err}`)

  console.log(`\nscreenshots: /tmp/poss-spill-*.png`)
  console.log(failures.length ? `\nFAIL (${failures.length})\n` + failures.map(x => '  ' + x).join('\n') : '\nPASS')

  cdp.close()
  cleanup()
  process.exit(failures.length ? 1 : 0)
}

main().catch(error => { console.error(error); cleanup(); process.exit(1) })

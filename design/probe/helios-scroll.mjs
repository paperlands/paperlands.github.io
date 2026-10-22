// CDP_PORT=9237 PROBE_BASE=http://127.0.0.1:4017/ node design/probe/helios-scroll.mjs
// Native compositor gesture, not a JS scrollTo loop. Probe-only rAF timing
// separates the word treatment from the existing drawing runtime.
import { connect, newPage } from './cdp.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
const cdp = await connect();
const page = await newPage(cdp);
const base = process.env.PROBE_BASE || 'http://127.0.0.1:4000/';
const out = process.env.PROBE_OUTPUT || '/tmp/helios-focus-shots';
mkdirSync(out, { recursive: true });
await page.s('Performance.enable');
await page.s('Page.addScriptToEvaluateOnNewDocument', { source: `
  window.__scrollProfile = { recording:false, callbacks:[], frames:[], tasks:[] };
  const probe = window.__scrollProfile;
  const nativeFrame = requestAnimationFrame.bind(window);
  const owners = new WeakMap();
  window.requestAnimationFrame = callback => {
    if (!owners.has(callback)) {
      const source = Function.prototype.toString.call(callback);
      owners.set(callback, source.includes('encounters.map') ? 'focus' : source.includes('progressOf(journey)') ? 'drawing' : 'other');
    }
    return nativeFrame(time => {
      const start = performance.now();
      try { callback(time); }
      finally { if (probe.recording) probe.callbacks.push({owner:owners.get(callback),ms:performance.now()-start}); }
    });
  };
  const nativeListen = window.addEventListener.bind(window);
  window.addEventListener = (type, listener, options) => {
    if (type === 'scroll' && typeof listener === 'function' && listener.toString().includes('scrollPosition')) {
      nativeListen(type, event => {
        const start = performance.now();
        try { listener(event); }
        finally { if(probe.recording) probe.callbacks.push({owner:'focus-scroll',ms:performance.now()-start}); }
      }, options);
    } else nativeListen(type, listener, options);
  };
  new PerformanceObserver(list => {
    if(probe.recording) probe.tasks.push(...list.getEntries().map(e=>({ms:e.duration,start:e.startTime})));
  }).observe({type:'longtask',buffered:false});
  let previous = 0;
  function monitor(time) {
    if(probe.recording && previous) probe.frames.push(time-previous);
    previous = time;
    nativeFrame(monitor);
  }
  nativeFrame(monitor);
` });
function percentile(values, quantile) {
  const sorted = [...values].sort((a,b) => a-b);
  return sorted[Math.min(sorted.length-1, Math.floor(sorted.length*quantile))] || 0;
}
const reports = [];
try {
  for (const [name, width, height, rate, withoutFocus, withoutDrawing] of [
    ['desktop',1440,900,1,false,false],
    ['phone-4x',390,844,4,false,false],
    ['phone-4x-no-focus',390,844,4,true,false],
    ['phone-4x-no-drawing',390,844,4,false,true],
  ]) {
    await page.s('Emulation.setDeviceMetricsOverride', { width,height,deviceScaleFactor:1,mobile:width<850 });
    await page.s('Emulation.setCPUThrottlingRate', { rate });
    await page.s('Network.setBlockedURLs', { urls: [
      ...(withoutFocus ? ['*/assets/js/home/helios-focus.js'] : []),
      ...(withoutDrawing ? ['*/assets/js/home/scroll-scrub.mjs'] : []),
    ] });
    await page.goto(base + '?scroll-probe=' + name + '-' + Date.now(), 2500);
    await page.evaluate('document.fonts.ready');
    if (withoutFocus) await page.evaluate(`(() => {
      const style=document.createElement('style');style.textContent=
        '.helios-landscape::after,.helios-atmosphere,.helios-focus::before,.helios-focus::after,.helios-focus__ink{display:none!important}.helios-focus__word{background:none!important;color:var(--light-ink)!important;-webkit-text-fill-color:currentColor!important;text-shadow:none!important}';
      document.head.append(style);
    })()`);
    const distance = await page.evaluate('document.documentElement.scrollHeight-innerHeight-10');
    const before = Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    await page.evaluate('window.__scrollProfile.recording=true');
    await page.s('Input.synthesizeScrollGesture', { x:Math.round(width*.75), y:Math.round(height*.65), yDistance:-distance, speed:600, gestureSourceType:'mouse' });
    await page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
    const samples = await page.evaluate('window.__scrollProfile.recording=false; window.__scrollProfile');
    const after = Object.fromEntries((await page.s('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    const focus = samples.callbacks.filter(c=>c.owner==='focus').map(c=>c.ms);
    const focusScroll = samples.callbacks.filter(c=>c.owner==='focus-scroll').map(c=>c.ms);
    const drawing = samples.callbacks.filter(c=>c.owner==='drawing').map(c=>c.ms);
    const report = {name, distance, frames:samples.frames.length,
      frameMs:{p50:percentile(samples.frames,.5),p95:percentile(samples.frames,.95),p99:percentile(samples.frames,.99),max:Math.max(...samples.frames),over25:samples.frames.filter(ms=>ms>25).length},
      focusMs:{calls:focus.length,p95:percentile(focus,.95),max:Math.max(0,...focus)},
      focusScrollMs:{calls:focusScroll.length,p95:percentile(focusScroll,.95),max:Math.max(0,...focusScroll)},
      drawingMs:{calls:drawing.length,p95:percentile(drawing,.95),max:Math.max(0,...drawing)},
      longTasks:samples.tasks,
      totals:Object.fromEntries(['ScriptDuration','TaskDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount'].map(key=>[key,after[key]-before[key]])),
    };
    reports.push(report);
    console.log(JSON.stringify(report));
  }
  writeFileSync(out+'/scroll-report.json', JSON.stringify(reports,null,2));
} finally {
  await page.s('Emulation.setCPUThrottlingRate',{rate:1});
  await cdp.send('Target.closeTarget',{targetId:(await page.s('Target.getTargetInfo')).targetInfo.targetId});
  cdp.close();
}

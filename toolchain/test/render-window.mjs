// Shared measurement arithmetic only: no browser ownership or runtime scheduler.
import assert from 'node:assert/strict';

export function statistics(values) {
  const sorted = [...values].filter(Number.isFinite).sort((a,b) => a-b);
  return { n:sorted.length, p50:sorted[Math.floor(sorted.length*.5)] || 0,
    p95:sorted[Math.floor(sorted.length*.95)] || 0, max:sorted.at(-1) ?? 0 };
}

export function summarizeRenderTrace(data, startName='hero-window-start', endName='hero-window-end') {
  const events = typeof data === 'string' ? JSON.parse(data).traceEvents : data.traceEvents;
  const start = events.find(e => e.name===startName)?.ts;
  const end = events.findLast(e => e.name===endName)?.ts;
  assert.ok(Number.isFinite(start) && end>start, 'trace must contain ordered measurement window marks');
  const names = new Set(['Display::DrawAndSwap','SoftwareRenderer::DoDrawQuad','RasterTask',
    'WebFrameWidgetImpl::UpdateLifecycle','Paint','Layout','UpdateLayoutTree','FunctionCall']);
  const rows = new Map();
  for(const e of events) {
    if(e.ph!=='X' || !Number.isFinite(e.dur) || e.dur<=0 || !names.has(e.name))continue;
    const overlap=Math.min(end,e.ts+e.dur)-Math.max(start,e.ts);
    if(overlap<=0)continue;
    let row=rows.get(e.name);if(!row)rows.set(e.name,row={count:0,totalMs:0,durations:[]});
    row.count++;row.totalMs+=overlap/1000;row.durations.push(overlap/1000);
  }
  return { windowMs:(end-start)/1000, note:'Each event name is inclusive; do not add nested/parallel rows.',
    slices:Object.fromEntries([...rows].map(([name,row])=>[name,{count:row.count,totalMs:row.totalMs,...statistics(row.durations)}])) };
}

export async function finishTrace(cdp) {
  const done=new Promise(resolve=>cdp.on(message=>{if(message.method==='Tracing.tracingComplete')resolve(message.params.stream)}));
  await cdp.send('Tracing.end');const handle=await done;let data='',part;
  do { part=await cdp.send('IO.read',{handle});data+=part.base64Encoded?Buffer.from(part.data,'base64').toString():part.data; } while(!part.eof);
  await cdp.send('IO.close',{handle});return data;
}

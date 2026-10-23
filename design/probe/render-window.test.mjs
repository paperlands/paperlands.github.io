import test from 'node:test';
import assert from 'node:assert/strict';
import { statistics, summarizeRenderTrace, finishTrace } from './render-window.mjs';

test('window clipping excludes outside events and preserves inclusive/parallel costs', () => {
  const events=[{name:'hero-window-start',ts:10000},{name:'hero-window-end',ts:20000},
    {name:'Display::DrawAndSwap',ph:'X',ts:9000,dur:4000},
    {name:'Display::DrawAndSwap',ph:'X',ts:19000,dur:4000},
    {name:'Display::DrawAndSwap',ph:'X',ts:0,dur:1000},
    {name:'SoftwareRenderer::DoDrawQuad',ph:'X',ts:11000,dur:6000},
    {name:'RasterTask',ph:'X',ts:10000,dur:10000,tid:1},
    {name:'RasterTask',ph:'X',ts:10000,dur:10000,tid:2},
    {name:'Paint',ph:'X',ts:5000,dur:1000},
    {name:'Paint',ph:'B',ts:12000,dur:1000}];
  const summary=summarizeRenderTrace(JSON.stringify({traceEvents:events}));
  assert.equal(summary.windowMs,10);
  assert.deepEqual(summary.slices['Display::DrawAndSwap'],{count:2,totalMs:4,n:2,p50:3,p95:3,max:3});
  assert.equal(summary.slices['SoftwareRenderer::DoDrawQuad'].totalMs,6);
  assert.equal(summary.slices.RasterTask.totalMs,20,'parallel thread cost is not clipped to elapsed wall time');
  assert.equal(summary.slices.Paint,undefined);
  assert.equal(summary.totalMs,undefined,'never sum nested event names into elapsed time');
});

test('missing/reversed window marks fail instead of returning false zero costs', () => {
  assert.throws(()=>summarizeRenderTrace({traceEvents:[]}),/ordered measurement/);
  assert.throws(()=>summarizeRenderTrace({traceEvents:[{name:'hero-window-start',ts:2},{name:'hero-window-end',ts:1}]}));
});

test('statistics distinguish no samples and handle finite signed values', () => {
  assert.deepEqual(statistics([]),{n:0,p50:0,p95:0,max:0});
  assert.deepEqual(statistics([null,1,NaN,Infinity,-2,0]),{n:3,p50:0,p95:1,max:1});
  assert.equal(statistics([-3,-1]).max,-1);
});

test('trace stream is drained and closed, including base64 chunks', async () => {
  const calls=[];let listener;
  const cdp={on(fn){listener=fn},async send(method,args){calls.push([method,args]);
    if(method==='Tracing.end'){listener({method:'Tracing.tracingComplete',params:{stream:'trace'}});return {}}
    if(method==='IO.read')return calls.filter(([m])=>m==='IO.read').length===1
      ? {data:'{"trace',eof:false} : {data:Buffer.from('Events":[]}').toString('base64'),base64Encoded:true,eof:true};
    return {};
  }};
  assert.equal(await finishTrace(cdp),'{"traceEvents":[]}');
  assert.deepEqual(calls.at(-1),['IO.close',{handle:'trace'}]);
});

// node design/probe/trace-summary.mjs /tmp/.../trace-create.json > /tmp/trace-summary.json
// Inclusive durations: nested spans and parallel threads MUST NOT be summed as
// elapsed page time. Keep count/total/max for each exact event and thread.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const files = process.argv.slice(2);
assert.ok(files.length, 'supply at least one CDP trace JSON file');
const summaries = files.map(file => {
  const { traceEvents } = JSON.parse(readFileSync(file, 'utf8'));
  assert.ok(Array.isArray(traceEvents), 'expected a CDP traceEvents array');
  const threads = new Map(traceEvents.filter(e => e.name === 'thread_name')
    .map(e => [e.pid + ':' + e.tid, e.args.name]));
  const groups = new Map();
  for (const e of traceEvents) {
    if (e.ph !== 'X' || !Number.isFinite(e.dur) || e.dur <= 0) continue;
    const threadId = e.pid + ':' + e.tid, key = threadId + ':' + e.name;
    let row = groups.get(key);
    if (!row) groups.set(key, row = { threadId, thread: threads.get(threadId) || threadId,
      name: e.name, count: 0, totalMs: 0, maxMs: 0 });
    row.count++; row.totalMs += e.dur / 1000; row.maxMs = Math.max(row.maxMs, e.dur / 1000);
  }
  return { file, note: 'Inclusive, potentially overlapping durations; do not sum rows.',
    events: [...groups.values()].sort((a,b) => b.totalMs - a.totalMs) };
});
console.log(JSON.stringify(summaries, null, 2));

import test from 'node:test';
import assert from 'node:assert/strict';
import { queries, summariseStats, collectReport } from '../../design/probe/campaign.mjs';

const options = { date: '2026-10-30', domain: 'paperland.sg' };
const body = (name, value = 0) => ({
  from: '2026-09-30', to: '2026-10-29',
  top_stats: [{ name, value }],
});

test('only aggregate top-stats queries; exact goal filters, no recipient dimensions', () => {
  const list = queries(options);
  assert.equal(list.length, 16);
  assert.deepEqual([...new Set(list.map((q) => q.period))], ['day', '30d']);
  for (const query of list) {
    const url = new URL(query.path, 'https://odin.paperland.sg');
    assert.equal(url.pathname, '/api/stats/paperland.sg/top-stats/');
    assert.equal(url.searchParams.get('date'), options.date);
    const expected = query.goal ? [['is', 'event:goal', [query.goal]]] : [];
    if (query.goal === 'contact' || query.goal === 'cta') {
      expected.push(['is', 'event:props:v', ['1']]);
      assert.equal(query.schema, '1');
    } else assert.equal(query.schema, null);
    if (query.step) expected.push(['is', 'event:props:step', [query.step]]);
    if (query.control) expected.push(['is', 'event:props:url', ['urn:paperland:filter-control:not-a-destination']]);
    assert.deepEqual(JSON.parse(url.searchParams.get('filters')), expected);
    assert.equal(url.searchParams.has('source'), false);
  }
});

test('requires an explicit real date and a hostname, before browser connection', () => {
  for (const date of [undefined, '', 'today', '2026-02-30', '2026-13-01', '../settings']) {
    assert.throws(() => queries({ ...options, date }));
  }
  for (const domain of ['https://paperland.sg', '../paperland.sg', 'paperland.sg?x=1', 'Paperland.sg']) {
    assert.throws(() => queries({ ...options, domain }));
  }
  assert.equal(queries({ date: '2024-02-29' }).length, 16);
});

test('server range and actual zero survive without fabricating a query end date', () => {
  assert.deepEqual(summariseStats(body('Unique conversions'), 'contact'), {
    from: '2026-09-30', to: '2026-10-29', stats: { 'Unique conversions': 0 },
  });
});

test('unknown data and wrong metric shape are unavailable, never zero', () => {
  for (const value of [null, {}, { top_stats: [] }, body('Unique visitors'), body('Unique conversions', null), body('Unique conversions', '0')]) {
    assert.equal(summariseStats(value, 'contact'), null);
  }
});

test('projection drops identities, unknown metric names and malformed ranges', () => {
  const data = { ...body('Unique visitors', 50), from: '<html>', to: undefined, source: 'private-recipient',
    top_stats: [{ name: 'Unique visitors', value: 50 }, { name: 'private-recipient', value: 1 },
      { name: 'Visit duration', value: Infinity }] };
  const summary = summariseStats(data, null);
  assert.deepEqual(summary, { from: null, to: null, stats: { 'Unique visitors': 50 } });
  assert.equal(JSON.stringify(summary).includes('private-recipient'), false);
});

test('read-only adapter preserves available rows while surfacing request failures', async () => {
  let index = 0;
  const paths = [];
  const report = await collectReport(async (path) => {
    paths.push(path);
    index++;
    if (index === 2) return { status: 401, data: 'private authenticated HTML' };
    if (index === 3) throw new Error('private response');
    if (index === 4) return { status: 200, data: {} };
    const goal = JSON.parse(new URL(path, 'https://odin.paperland.sg').searchParams.get('filters')).length;
    return { status: 200, data: body(goal ? 'Unique conversions' : 'Unique visitors') };
  }, options);
  assert.equal(paths.length, 16);
  assert.equal(report.requestedDate, options.date);
  assert.equal(report.rows[0].available, true);
  assert.equal(report.rows[1].available, false);
  assert.equal(report.rows[1].error, 'HTTP 401');
  assert.equal(report.rows[2].available, false);
  assert.equal(report.rows[3].available, false);
  assert.equal(report.rows[4].available, true);
  assert.equal(JSON.stringify(report).includes('private'), false);
  assert.ok(report.notes.some((note) => note.includes('not a confirmed enquiry')));
});


test('exclusion control needs a positive same-window baseline; not proof of new custom ingestion', async () => {
  for (const [baseline, exclusion, expected] of [[108, 0, 'exclusion-observed'], [0, 0, 'inconclusive-no-positive-baseline'], [108, 108, 'failed']]) {
    const report = await collectReport(async (path) => {
      const filters = JSON.parse(new URL(path, 'https://odin.paperland.sg').searchParams.get('filters'));
      const count = filters.some((filter) => filter[1] === 'event:props:url') ? exclusion : baseline;
      const data = body(filters.length ? 'Unique conversions' : 'Unique visitors', count);
      data.top_stats.push({ name: 'Total conversions', value: count });
      return { status: 200, data };
    }, options);
    assert.deepEqual(report.filterChecks.map((check) => check.status), [expected, expected]);
    assert.ok(report.notes.some((note) => note.includes('do not prove fresh custom-event ingestion')));
  }
});

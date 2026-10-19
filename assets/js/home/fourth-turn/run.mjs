import { copyPlain, ownPlain, faultOf, visibilityOf } from '../paperlang/record.mjs';

export const PRESENTATION = { commit: 'commit', progressive: 'progressive' };

export function createRunController({ perform, pin = '', now = () => Date.now(), setTimer = setTimeout,
  clearTimer = clearTimeout, onState = () => {}, floor = 90 } = {}) {
  if (typeof perform !== 'function') throw new Error('a run controller needs a native performer');
  let disposition = 'idle', desired = null, submitted = null, presented = null, outcome = null, failure = null;
  let handle = null, token = 0, replayToken = 0, lastAt = null, lastMs = 0, pace = null, held = false, stale = 0;
  const waits = [];
  const snapshot = () => copyPlain({ disposition, desired, submitted, presented, outcome, failure, held, stale, observedEndToEndMs: lastMs });
  const say = (event) => onState(snapshot(), event);
  const same = (a, b) => !!a && !!b && a.source === b.source && a.presentation === b.presentation && a.pin === b.pin;
  const satisfiedBy = (record) => same(record, desired)
    && (!('replayNonce' in desired) || record.replayNonce === desired.replayNonce);
  const happy = () => desired === null || (disposition !== 'running' && (
    (presented?.done && presented.ok === true && satisfiedBy(presented))
    || (outcome?.ok === false && !outcome.cancelled && satisfiedBy(outcome))
  ));
  const settled = () => happy() || disposition === 'cancelled' || disposition === 'disposed';
  const flush = () => { while (waits.length && settled()) waits.shift()(snapshot()); };
  const current = (id) => disposition === 'running' && submitted?.id === id;
  const old = (id, what) => { stale += 1; say({ kind: 'stale', id, what }); };

  function visible(facts) {
    if (facts?.presented !== true) return;
    presented = ownPlain({ ...submitted, visibility: visibilityOf(facts), done: false });
  }

  function finish(id, result, fault = null, facts = null) {
    if (!current(id)) { old(id, fault ? 'fault' : 'finished'); return; }
    const mine = submitted;
    lastMs = Math.max(0, now() - mine.at);
    const evidence = facts ?? result?.visibility ?? mine.facts ?? null;
    const ok = fault === null && result?.ok !== false;
    outcome = ownPlain({ ...mine, ok, result: result ?? null, observedEndToEndMs: lastMs,
      visibility: ok ? 'complete' : visibilityOf(evidence),
      ...(fault === null ? {} : { fault }),
      ...(result && 'completion' in result ? { completion: result.completion } : {}),
    });
    if (!ok) failure = outcome;
    if (ok) presented = ownPlain({ ...outcome, done: true });
    else if (evidence?.presented === true) presented = ownPlain({ ...outcome, done: true });
    handle = null;
    submitted = null;
    disposition = 'idle';
    say({ kind: ok ? 'finished' : 'fault', id, result: outcome.result, ...(fault === null ? {} : { fault }) });
    ask();
    flush();
  }

  function ask() {
    if (disposition === 'disposed' || desired === null || disposition === 'running' || happy()) return false;
    const delay = held && lastAt !== null ? lastAt + Math.max(floor, lastMs) - now() : 0;
    if (delay > 0) {
      if (pace === null) pace = setTimer(() => { pace = null; ask(); }, delay);
      return false;
    }
    clearTimer(pace); pace = null;
    submitted = ownPlain({ ...desired, id: ++token, at: now() });
    disposition = 'running'; lastAt = submitted.at;
    const mine = submitted, id = mine.id;
    say({ kind: 'submitted', id });
    if (!current(id)) return false;
    try {
      const native = perform({ ...mine,
        onAccepted: (accepted) => {
          if (!current(id)) { old(id, 'accepted'); return; }
          submitted = ownPlain({ ...submitted, accepted });
          say({ kind: 'accepted', id, accepted: copyPlain(accepted) });
        },
        onVisibility: (facts) => {
          if (!current(id)) { old(id, 'visibility'); return; }
          submitted = ownPlain({ ...submitted, facts }); visible(facts);
          say({ kind: 'visibility', id, facts: copyPlain(facts) });
        },
        onBeat: (beat) => {
          if (!current(id)) { old(id, 'beat'); return; }
          const evidence = ownPlain(beat);
          submitted = ownPlain({ ...submitted, beat: evidence });
          if (presented?.id === id) presented = ownPlain({ ...presented, beat: evidence });
          say({ kind: 'beat', id, beat: copyPlain(evidence) });
        },
      }) ?? {};
      if (current(id)) handle = native;
      else native.cancel?.();
      Promise.resolve(native.finished).then(
        (result) => finish(id, result ?? { ok: true }),
        (error) => finish(id, null, faultOf(error), error?.visibility),
      );
    } catch (error) { finish(id, null, faultOf(error), error?.visibility); }
    return true;
  }

  function want({ program, source, presentation = PRESENTATION.commit, pin: path = pin, context = null, replayNonce } = {}) {
    if (disposition === 'disposed') { say({ kind: 'refused', why: 'disposed' }); return false; }
    try {
      const data = ownPlain(program ?? source);
      const text = source ?? (typeof data === 'string' ? data : data?.source);
      if (source !== undefined && program !== undefined && text !== (typeof data === 'string' ? data : data?.source)) throw new TypeError('request source disagrees with its program');
      if (typeof text !== 'string') throw new TypeError('a request needs source text');
      if (typeof path !== 'string' || !path) throw new TypeError('a request needs a pin path');
      if (!Object.values(PRESENTATION).includes(presentation)) throw new TypeError('unknown presentation');
      if (replayNonce !== undefined && (!Number.isSafeInteger(replayNonce) || replayNonce <= 0)) throw new TypeError('a replay nonce must be a positive request number');
      desired = ownPlain({ program: data, source: text, presentation, pin: path, context,
        ...(replayNonce === undefined ? {} : { replayNonce }),
      });
    } catch (error) { say({ kind: 'refused', why: error.message }); return false; }
    say({ kind: 'wanted' }); ask(); flush(); return true;
  }

  return {
    want,
    replay(request) { return want({ ...request, replayNonce: ++replayToken }); },
    hold() { held = true; },
    release() { held = false; clearTimer(pace); pace = null; ask(); flush(); },
    cancel() {
      if (disposition === 'disposed') return false;
      clearTimer(pace); pace = null;
      const mine = submitted, wasRunning = disposition === 'running';
      submitted = null; desired = null; disposition = 'cancelled';
      try { handle?.cancel?.(); } catch { /* stop does not depend on transport success */ }
      handle = null;
      if (mine) {
        outcome = ownPlain({ ...mine, ok: false, cancelled: true, observedEndToEndMs: Math.max(0, now() - mine.at), visibility: visibilityOf(mine.facts) });
        if (mine.facts?.presented === true) presented = ownPlain({ ...outcome, done: true, result: { ok: false, cancelled: true } });
        say({ kind: 'cancelled', id: mine.id });
      }
      flush(); return wasRunning;
    },
    dispose() {
      if (disposition === 'disposed') return;
      clearTimer(pace); pace = null;
      submitted = null; desired = null; disposition = 'disposed';
      try { handle?.cancel?.(); } catch { /* teardown is final */ }
      handle = null; say({ kind: 'disposed' }); flush();
    },
    settle() { return new Promise((resolve) => { waits.push(resolve); flush(); }); },
    snapshot,
    isCurrent: current,
    get desired() { return copyPlain(desired); },
    get submitted() { return copyPlain(submitted); },
    get presented() { return copyPlain(presented); },
    get stale() { return stale; },
    get running() { return disposition === 'running'; },
    get disposition() { return disposition; },
  };
}

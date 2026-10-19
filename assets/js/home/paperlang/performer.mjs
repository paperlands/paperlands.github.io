import { faultOf, rejection } from './record.mjs';

// The producer uses onBeat. onLine is a legacy spike adapter only.
// These are line-walk occurrences, never deduplicated state readings.
export function bindBeat(_factory, hatch, callback) {
  const method = typeof hatch.onBeat === 'function' ? 'onBeat'
    : typeof hatch.onLine === 'function' ? 'onLine' : null;
  if (method) hatch[method](callback);
  return { beats: method !== null, stop: () => { if (method) hatch[method](null); } };
}

export function createDirectPerformer(canvas, { path, createHatch, caps } = {}) {
  let active = null, resident = null, disposed = false;
  const clear = () => {
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!context) throw new Error('The drawing context is unavailable.');
    context.clearColor(0, 0, 0, 0);
    context.clear(context.COLOR_BUFFER_BIT);
  };
  return {
    pin: path,
    perform({ pin, source, presentation = 'progressive', onBeat = () => {}, onAccepted = () => {}, onVisibility = () => {} }) {
      if (disposed) throw new Error('performer disposed');
      if (pin !== path) throw new Error('request pin does not match the performer');
      if (active) throw new Error('a direct performer already has a run');
      // One canvas cannot keep the previous figure while a new run is undecided.
      // Refuse before dispose or clear, or the visible drawing is already gone.
      if (presentation !== 'progressive') {
        throw rejection({
          message: 'A single canvas cannot commit atomically.',
          reason: 'unsupported',
        }, { visibility: { presented: false, beatSent: false } });
      }
      resident?.dispose(); resident = null;
      const facts = { presented: false, beatSent: false };
      let reject, listener = null;
      const mine = { cancelled: false, cancel: () => {
        if (mine.cancelled || active !== mine) return;
        mine.cancelled = true;
        try { listener?.stop(); } catch { /* the callback is already being dropped */ }
        try { resident?.dispose(); } catch { /* a hatch that throws on dispose is still cancelled */ }
        resident = null;
        if (active === mine) active = null;
        reject(rejection({ message: 'performance stopped', reason: 'cancelled' }, { visibility: facts }));
      } };
      active = mine;
      const finished = new Promise((resolve, no) => {
        reject = no;
        (async () => {
          try {
            clear(); facts.presented = true; onVisibility({ ...facts });
            if (mine.cancelled) return;
            const hatch = createHatch(canvas, caps === undefined ? {} : { caps });
            resident = hatch;
            listener = bindBeat(createHatch, hatch, (beat) => {
              if (mine.cancelled || active !== mine) return;
              facts.beatSent = true; onVisibility({ ...facts }); onBeat(beat);
            });
            const run = await hatch.play(source);
            if (mine.cancelled || active !== mine) return;
            onAccepted({ ...('commandCount' in run ? { commands: run.commandCount } : {}), capabilities: { beats: listener.beats } });
            const completion = await run.finished;
            if (mine.cancelled || active !== mine) return;
            active = null;
            resolve({ ok: true, ...(completion === undefined ? {} : { completion }), visibility: { ...facts } });
          } catch (error) {
            if (mine.cancelled || active !== mine) return;
            active = null;
            no(rejection(faultOf(error), { visibility: facts }));
          }
        })();
      });
      return { finished, cancel: mine.cancel };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      try { active?.cancel(); } catch { /* cancellation already rejected the run when it could */ }
      try { resident?.dispose(); } catch { /* the second call is the hatch that cancel could not drop */ }
      resident = null;
    },
  };
}

import { ROTATOR, SLIDER, steps, drawingSource } from './programs.mjs';

// The control owns accepted geometry. The drawing consumes its native readings.
export function createNativeTurn({ createHatch, controlCanvas, drawingCanvas, send = () => {}, schedule = queueMicrotask, compact = false }) {
  const caps = { maxCommands: 500000, maxRecurseDepth: 60 };
  const control = createHatch(controlCanvas, { caps, interactive: true });
  let drawing;
  try { drawing = createHatch(drawingCanvas, { caps }); }
  catch (error) { control.dispose(); throw error; }
  let disposed = false, mode = null, step = 0, starting = null, accepted = false, readable = false, viewZ = compact ? 120 : 280;
  let controlGeneration = 0, drawGeneration = 0, readingQueued = null, drawQueued = false;
  let stops = [];
  const values = { bearing: 90, length: 100 };
  const positions = { rotator: null, slider: null };
  const fault = (error, phase) => send('fault', { mode, phase, message: error.message, reason: error.reason, wound: error.wound });
  const valueOf = answer => answer.kind === 'value' ? answer.value : null;
  const stopReading = () => { for (const stop of stops) stop(); stops = []; };

  const queueDraw = () => {
    if (disposed) return;
    ++drawGeneration;
    if (drawQueued) return;
    drawQueued = true;
    schedule(async () => {
      drawQueued = false;
      if (disposed || !accepted || !readable) return;
      const mine = drawGeneration;
      const source = drawingSource(step, values);
      try {
        const program = `beColour "f1dba4"\nbold 0.8\nshow 6\njmpto ${compact ? -50 : 0} -50 ${viewZ}\n${source}`;
        send('drawing', { source, program });
        const run = await drawing.play(program);
        const completion = await run.finished;
        if (!disposed && mine === drawGeneration) send('drawn', { source, completion });
      } catch (error) {
        if (!disposed && mine === drawGeneration) fault(error, 'drawing');
      }
    });
  };
  const queueReading = (mine) => {
    if (disposed || mine !== controlGeneration || readingQueued === mine) return;
    readingQueued = mine;
    schedule(() => {
      if (readingQueued === mine) readingQueued = null;
      if (disposed || mine !== controlGeneration || !accepted) return;
      const property = mode === 'rotator' ? 'bearing' : 'x';
      const answer = control.interaction.read('A', property);
      const position = valueOf(control.interaction.read('A', 'position'));
      const value = valueOf(answer);
      const available = typeof value === 'number' && Number.isFinite(value);
      readable = available;
      if (!available) ++drawGeneration;
      if (available) values[mode === 'rotator' ? 'bearing' : 'length'] = value;
      send('reading', { mode, answer, value, position, available, ...values });
      if (available) queueDraw();
    });
  };
  const propose = (position) => {
    const result = disposed ? { kind: 'retired' } : !accepted ? { kind: 'busy' }
      : control.interaction.propose('A', position);
    if (!disposed) {
      send('proposal', { mode, result });
      queueReading(controlGeneration);
    }
    return result;
  };
  const setMode = (next) => {
    if (disposed) return Promise.resolve();
    if (next !== 'rotator' && next !== 'slider') throw new Error('Unknown native control');
    if (next === mode && (starting || accepted)) {
      if (accepted) queueReading(controlGeneration);
      return starting ?? Promise.resolve();
    }
    if (mode && accepted) positions[mode] = valueOf(control.interaction.read('A', 'position'));
    stopReading();
    mode = next; accepted = false; readable = false;
    const mine = ++controlGeneration;
    ++drawGeneration;
    send('starting', { mode });
    starting = (async () => {
      try {
        const run = await control.play(next === 'rotator' ? ROTATOR : SLIDER);
        // Consume completion even if a newer mode or disposal won the race.
        run.finished.then(completion => {
          if (!disposed && mine === controlGeneration) send('control-finished', { mode: next, completion });
        }, error => {
          if (!disposed && mine === controlGeneration) {
            accepted = false; readable = false; ++drawGeneration;
            stopReading(); fault(error, 'control');
          }
        });
        if (disposed || mine !== controlGeneration) return;
        accepted = true;
        send('control-accepted', { mode, commands: run.commandCount });
        const observe = () => queueReading(mine);
        stops.push(control.interaction.subscribe('A', next === 'rotator' ? 'bearing' : 'x', observe));
        stops.push(control.interaction.subscribe('A', 'position', observe));
        propose(positions[next] ?? (next === 'rotator' ? [0, -120, 0] : [100, 0, 0]));
      } catch (error) {
        if (!disposed && mine === controlGeneration) fault(error, 'control');
      } finally {
        if (mine === controlGeneration) starting = null;
      }
    })();
    return starting;
  };
  return {
    setMode, propose,
    setStep(next) {
      if (!Number.isInteger(next) || next < 0 || next >= steps.length || disposed) return;
      step = next; queueDraw();
    },
    setCompact(next) {
      if (disposed || next === compact) return;
      compact = next; viewZ = compact ? 120 : 280; queueDraw();
    },
    widen() { if (!disposed) { viewZ -= 400; queueDraw(); } },
    replay: queueDraw,
    dispose() {
      if (disposed) return;
      disposed = true; ++controlGeneration; ++drawGeneration;
      stopReading();
      try { control.dispose(); } finally { drawing.dispose(); }
    },
  };
}

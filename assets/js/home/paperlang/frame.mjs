import { copyPlain, faultOf, rejection } from './record.mjs';

export function createFramePerformer({ send, isCurrent, onReady = () => {}, onBootFault = () => {} }) {
  let pending = null, artifact = null, bootFault = null;
  // A dead parent throws from postMessage. The local run still ends; the frame may not hear it.
  const attempt = (message) => {
    try { send(message); return null; }
    catch (error) { return error instanceof Error ? error : new Error(String(error)); }
  };
  const transport = (error) => rejection({
    message: error?.message || 'The frame did not receive the request.',
    reason: 'transport',
  }, { visibility: { presented: false, beatSent: false } });
  return {
    get pin() { return artifact; },
    perform({ id, pin, source, presentation, onBeat, onAccepted, onVisibility }) {
      if (bootFault) throw rejection(bootFault);
      if (!artifact || artifact !== pin) throw new Error('request pin does not match the ready frame');
      if (pending) throw new Error('a frame performer already has a run');
      let resolve, reject;
      const finished = new Promise((yes, no) => { resolve = yes; reject = no; });
      pending = { id, resolve, reject, onBeat, onAccepted, onVisibility };
      const trouble = attempt({ kind: 'play', id, program: source, mode: presentation === 'progressive' ? 'draw' : 'swap' });
      if (trouble) {
        pending = null;
        reject(transport(trouble));
      }
      return { finished, cancel: () => {
        if (pending?.id !== id) return;
        const mine = pending; pending = null;
        mine.reject(rejection({ message: 'performance stopped', reason: 'cancelled' }));
        attempt({ kind: 'halt', id });
      } };
    },
    receive(message) {
      if (message.kind === 'ready') {
        artifact = message.artifact; bootFault = null; onReady(copyPlain(message)); return true;
      }
      if (message.kind === 'fault' && message.id == null) {
        bootFault = faultOf(message.fault ?? message.error);
        const mine = pending; pending = null;
        mine?.reject(rejection(bootFault));
        onBootFault(copyPlain(bootFault)); return true;
      }
      if (!pending || message.id !== pending.id || !isCurrent(message.id)) return false;
      const mine = pending;
      if (message.kind === 'visibility') { mine.onVisibility?.(copyPlain(message.visibility)); return true; }
      if (message.kind === 'beat') {
        mine.onBeat?.(copyPlain(message.beat ?? Object.fromEntries(['time', 'line', 'lines', 'birthtime'].filter(key => key in message).map(key => [key, message[key]]))));
        return true;
      }
      if (message.kind === 'accepted') {
        mine.onAccepted?.(copyPlain(message.accepted ?? Object.fromEntries(['commands', 'buffer', 'capabilities'].filter(key => key in message).map(key => [key, message[key]]))));
        return true;
      }
      if (message.kind === 'finished') {
        pending = null;
        mine.resolve({ ok: true, ...('completion' in message ? { completion: copyPlain(message.completion) } : {}),
          ...('visibility' in message ? { visibility: copyPlain(message.visibility) } : {}) });
        return true;
      }
      if (message.kind === 'fault') {
        pending = null;
        mine.reject(rejection(faultOf(message.fault ?? message.error),
          'visibility' in message ? { visibility: message.visibility } : {}));
        return true;
      }
      return false;
    },
  };
}

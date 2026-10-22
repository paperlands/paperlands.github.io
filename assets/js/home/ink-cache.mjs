// A byte budget, not an unbounded catalogue of decoded full-size pictures.
// At most two decodes; each owner has one latest demand, so a fast gesture
// cannot queue twenty obsolete frames behind the reader.
async function decodeImage({ url }) {
  const image = new Image();
  image.alt = ''; image.decoding = 'async'; image.src = url;
  await image.decode();
  return image;
}

export function createInkCache({ load = decodeImage, onReady = () => {},
  budget = 16 * 1024 * 1024, concurrency = 2 } = {}) {
  const entries = new Map(), owners = new Map();
  let bytes = 0, active = 0, serial = 0;
  const pinned = url => {
    for (const owner of owners.values()) if (owner.shown === url || owner.frames[0]?.url === url) return true;
    return false;
  };
  function room(required, evict) {
    if (bytes + required <= budget) return true;
    if (!evict) return false;
    const candidates = [...entries.values()].filter(entry => entry.image && !pinned(entry.url))
      .sort((a, b) => a.used - b.used);
    for (const entry of candidates) {
      entries.delete(entry.url); bytes -= entry.bytes;
      // Do not clear src: a recently replaced DOM picture may still be painted
      // by the compositor. Dropping our reference releases ownership safely.
      if (bytes + required <= budget) return true;
    }
    return false;
  }
  function pump() {
    if (active >= concurrency) return;
    // Current demands across ALL plates precede speculative adjacent frames.
    const demands = [...owners.values()];
    for (const speculative of [false, true]) {
      for (const owner of demands) {
        for (const frame of speculative ? owner.frames.slice(1) : owner.frames.slice(0, 1)) {
          if (active >= concurrency) return;
          if (entries.has(frame.url)) continue;
          const cost = frame.width * frame.height * 4;
          if (!room(cost, !speculative)) continue;
          const entry = { ...frame, bytes: cost, used: ++serial, image: null };
          entries.set(frame.url, entry); bytes += cost; active++;
          Promise.resolve().then(() => load(frame)).then(image => {
            entry.image = image;
          }, () => {
            // A failed asset must not create a retry storm. Keep a zero-byte
            // tombstone; the already-visible figure remains the fallback.
            entry.failed = true; bytes -= entry.bytes; entry.bytes = 0;
          }).finally(() => {
            active--; onReady(); pump();
          });
        }
      }
    }
  }
  return {
    demand(owner, frames, shown) { owners.set(owner, { frames, shown }); pump(); },
    read(url) {
      const entry = entries.get(url);
      if (!entry?.image) return null;
      entry.used = ++serial;
      return entry.image;
    },
    retryFailures() {
      for (const [url, entry] of entries) if (entry.failed) entries.delete(url);
      pump();
    },
    stats: () => ({ bytes, active, entries: entries.size, budget }),
  };
}

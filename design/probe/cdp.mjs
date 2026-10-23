// Minimal CDP driver — Node 22+ provides global fetch + WebSocket; no deps.

const PORT = process.env.CDP_PORT || 9222;
const BASE = `http://127.0.0.1:${PORT}`;

export async function connect() {
  // wait for the debugger to come up
  let ver;
  for (let i = 0; i < 60; i++) {
    try { ver = await (await fetch(`${BASE}/json/version`)).json(); break; }
    catch { await new Promise(r => setTimeout(r, 250)); }
  }
  if (!ver) throw new Error('chromium devtools never came up');

  const ws = new WebSocket(ver.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const events = [];
  const listeners = [];
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) {
      events.push(msg);
      for (const l of listeners) l(msg);
    }
  };

  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const mid = ++id;
    pending.set(mid, { res, rej });
    ws.send(JSON.stringify({ id: mid, method, params, ...(sessionId ? { sessionId } : {}) }));
  });

  return {
    send, events, ws,
    on: (fn) => listeners.push(fn),
    close: () => ws.close(),
    version: ver,
  };
}

// Open a page target and return a session-scoped client.
export async function newPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const s = (method, params) => cdp.send(method, params, sessionId);
  await s('Page.enable');
  await s('Runtime.enable');
  await s('Log.enable');
  await s('Network.enable');

  const console_ = [];
  const failed = [];
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.consoleAPICalled') {
      console_.push({
        type: msg.params.type,
        text: msg.params.args.map(a => a.value ?? a.description ?? a.type).join(' '),
      });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      console_.push({ type: 'exception', text: msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || '') });
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      console_.push({ type: 'log-error', text: msg.params.entry.text });
    }
    if (msg.method === 'Network.loadingFailed') {
      failed.push({ id: msg.params.requestId, err: msg.params.errorText, type: msg.params.type });
    }
  });

  const evaluate = async (expr, opts = {}) => {
    const r = await s('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true,
      ...opts,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description || ''));
    return r.result.value;
  };

  const goto = async (url, waitMs = 1200) => {
    await s('Page.navigate', { url });
    await new Promise(r => setTimeout(r, waitMs));
  };

  const requests = [];
  cdp.on((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Network.requestWillBeSent') requests.push(msg.params.request.url);
    if (msg.method === 'Network.responseReceived') {
      // record status by url
      responses.set(msg.params.response.url, msg.params.response.status);
    }
  });
  const responses = new Map();

  return { s, evaluate, goto, console: console_, failed, requests, responses, sessionId, targetId };
}

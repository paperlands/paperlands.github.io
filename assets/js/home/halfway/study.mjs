// Two surfaces, one binding each. The manuscript operand and the rail both read
// and propose through the binding. Pixel stride stays here: four pixels on the
// word, twenty-four on the rail. The interval does not import this module.

import { createBinding } from '../paperlang/binding.mjs';
import { DESTINATION, halfwayManuscript } from './manuscript.mjs';

const STRIDE = { manuscript: 4, rail: 24 };

export function openHalfway(root) {
  const manuscript = root.querySelector('[data-halfway-manuscript]');
  const rails = root.querySelector('[data-halfway-rails]');
  const reading = root.querySelector('[data-halfway-reading]');
  if (!manuscript || !rails || !reading) return null;

  const bindings = {
    vx: createBinding({ name: 'vx', domain: DESTINATION, value: 120 }),
    vy: createBinding({ name: 'vy', domain: DESTINATION, value: 100 }),
  };
  let gesture = null;
  let closed = false;
  const listeners = [];
  const on = (target, type, fn, options) => {
    target.addEventListener(type, fn, options);
    listeners.push([target, type, fn, options]);
  };

  const operandFacts = (token, name) => {
    const facts = bindings[name].read();
    token.setAttribute('aria-valuemin', String(facts.min));
    token.setAttribute('aria-valuemax', String(facts.max));
    token.setAttribute('aria-valuenow', String(facts.value));
    token.classList.toggle('is-held', gesture?.name === name);
  };

  const spansOf = (written, line) => written.operands.filter((operand) => operand.line === line).sort((a, b) => a.start - b.start);

  // Patch the numbers in place. Replacing the operand on pointerdown detaches the
  // focused, capturing node, and a real Escape then never meets the gesture.
  const patch = (lines, written) => {
    const rows = [...manuscript.children];
    if (rows.length !== lines.length) return false;
    const plan = lines.map((text, index) => {
      const line = index + 1;
      const row = rows[index];
      const id = written.idOfLine[line] ?? '';
      if ((row.dataset.id ?? '') !== id || !row.classList.contains('halfway-line')) return null;
      const spans = spansOf(written, line);
      const nodes = [...row.childNodes];
      if (nodes.at(-1)?.textContent === '\n') nodes.pop();
      const expected = [];
      let cursor = 0;
      if (!spans.length) expected.push(text);
      for (const span of spans) {
        if (span.start > cursor) expected.push(text.slice(cursor, span.start));
        expected.push(span);
        cursor = span.end;
      }
      if (spans.length && cursor < text.length) expected.push(text.slice(cursor));
      if (nodes.length !== expected.length) return null;
      for (let i = 0; i < expected.length; i += 1) {
        const part = expected[i];
        const node = nodes[i];
        if (typeof part === 'string') {
          const literal = part.length ? part : '\u00a0';
          if (node.nodeType !== Node.TEXT_NODE || node.textContent !== literal) return null;
        } else if (node.dataset?.operand !== part.name || node.dataset.row !== part.row) return null;
      }
      return { nodes, expected };
    });
    if (plan.some((row) => row === null)) return false;
    for (const row of plan) {
      for (let i = 0; i < row.expected.length; i += 1) {
        const part = row.expected[i];
        if (typeof part === 'string') continue;
        const token = row.nodes[i];
        const text = lines[part.line - 1].slice(part.start, part.end);
        if (token.textContent !== text) token.textContent = text;
        operandFacts(token, part.name);
      }
    }
    return true;
  };

  const writeManuscript = (lines, written) => {
    manuscript.replaceChildren();
    lines.forEach((text, index) => {
      const line = index + 1;
      const row = document.createElement('span');
      row.className = 'halfway-line';
      const id = written.idOfLine[line];
      if (id) row.dataset.id = id;
      const spans = spansOf(written, line);
      if (!spans.length) {
        row.textContent = text.length ? text : '\u00a0';
      } else {
        let cursor = 0;
        for (const operand of spans) {
          if (operand.start > cursor) row.append(text.slice(cursor, operand.start));
          const token = document.createElement('span');
          token.id = `operand-${operand.name}`;
          token.className = 'halfway-operand';
          token.tabIndex = 0;
          token.role = 'spinbutton';
          token.dataset.operand = operand.name;
          token.dataset.row = operand.row;
          token.textContent = text.slice(operand.start, operand.end);
          token.setAttribute('aria-label', `destination ${operand.name}`);
          operandFacts(token, operand.name);
          row.append(token);
          cursor = operand.end;
        }
        if (cursor < text.length) row.append(text.slice(cursor));
      }
      row.append('\n');
      manuscript.append(row);
    });
  };

  const render = () => {
    const written = halfwayManuscript(bindings.vx.value, bindings.vy.value);
    const lines = written.source.split('\n');
    if (!patch(lines, written)) {
      writeManuscript(lines, written);
      if (gesture?.surface === 'manuscript') {
        const token = manuscript.querySelector(`[data-operand="${gesture.name}"]`);
        if (token) {
          gesture.element = token;
          token.focus();
          try { token.setPointerCapture(gesture.pointerId); } catch { /* the pointer is already gone */ }
        }
      }
    }
    for (const name of ['vx', 'vy']) {
      const facts = bindings[name].read();
      const value = rails.querySelector(`[data-rail-value="${name}"]`);
      value.textContent = String(facts.value);
      value.setAttribute('aria-valuenow', String(facts.value));
      value.setAttribute('aria-valuemin', String(facts.min));
      value.setAttribute('aria-valuemax', String(facts.max));
      value.classList.toggle('is-held', gesture?.name === name && gesture?.surface === 'rail');
    }
    reading.textContent = `vx ${bindings.vx.value} · vy ${bindings.vy.value}`;
  };

  const finish = (commit) => {
    if (!gesture) return;
    const { binding, element, pointerId } = gesture;
    gesture = null;
    try { if (element?.hasPointerCapture?.(pointerId)) element.releasePointerCapture(pointerId); } catch { /* the pointer already ended */ }
    if (commit) binding.end();
    else binding.restore();
    render();
  };

  const owns = (event) => gesture !== null && event.pointerId === gesture.pointerId;

  const begin = (name, surface, event, element) => {
    if (closed || gesture || event.button !== 0) return;
    const binding = bindings[name];
    binding.begin();
    gesture = {
      name, surface, binding, element,
      x: event.clientX,
      origin: binding.value,
      pointerId: event.pointerId,
    };
    render();
    const live = surface === 'manuscript'
      ? manuscript.querySelector(`[data-operand="${name}"]`) ?? element
      : element;
    gesture.element = live;
    try { live.setPointerCapture(event.pointerId); } catch { /* an untrusted event still proposes */ }
    if (surface === 'manuscript') live.focus();
  };

  on(manuscript, 'pointerdown', (event) => {
    const operand = event.target.closest?.('[data-operand]');
    if (!operand) return;
    begin(operand.dataset.operand, 'manuscript', event, operand);
  });
  on(rails, 'pointerdown', (event) => {
    const handle = event.target.closest?.('[data-rail-value]');
    if (!handle) return;
    begin(handle.dataset.railValue, 'rail', event, handle);
  });
  on(rails, 'click', (event) => {
    const button = event.target.closest?.('[data-step]');
    if (!button || gesture || closed) return;
    const name = button.closest('[data-binding]')?.dataset.binding;
    if (bindings[name]?.step(Number(button.dataset.step))) render();
  });

  on(root, 'keydown', (event) => {
    const token = event.target.closest?.('[data-operand], [data-rail-value]');
    if (!token || gesture || closed) return;
    const name = token.dataset.operand ?? token.dataset.railValue;
    const direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 0;
    if (!direction) return;
    event.preventDefault();
    if (bindings[name].step(direction)) render();
  });
  // Escape ends the open gesture wherever focus sits. The operand keeps focus
  // so the key still arrives on it; this listener is what clears a gesture
  // whose node was not the target.
  on(window, 'keydown', (event) => {
    if (event.key !== 'Escape' || !gesture) return;
    event.preventDefault();
    finish(false);
  }, true);

  on(window, 'pointermove', (event) => {
    if (!owns(event)) return;
    const stride = STRIDE[gesture.surface];
    if (gesture.binding.propose(gesture.origin + (event.clientX - gesture.x) / stride)) render();
  });
  on(window, 'pointerup', (event) => {
    if (!owns(event)) return;
    finish(true);
  });
  on(window, 'pointercancel', (event) => {
    if (!owns(event)) return;
    finish(false);
  });

  render();
  return {
    bindings,
    stride: STRIDE,
    dispose() {
      if (closed) return;
      closed = true;
      if (gesture) finish(false);
      for (const [target, type, fn, options] of listeners) target.removeEventListener(type, fn, options);
    },
  };
}

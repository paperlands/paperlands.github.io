import { bootFourthTurn } from './fourth-turn/instrument.mjs';

// The act's own entrance. Every root is booted independently: a root whose markup does not carry
// the instrument's contract fails in its own line — spoken, through its own `#fault` or through a
// freshly appended alert — and leaves the other roots on the page working, rather than throwing
// through the loop and never reaching them.
function faultLine(root) {
  const existing = root.querySelector('#fault');
  if (existing) return existing;
  const line = document.createElement('p');
  line.className = 'fault';
  line.id = 'fault';
  line.setAttribute('role', 'alert');
  root.append(line);
  return line;
}

export function bootEveryFourthTurn(scope = document) {
  const booted = [];
  for (const root of scope.querySelectorAll('[data-fourth-turn]')) {
    // The look owns its air. The instrument publishes visibility, not a selector
    // reaching into another component's implementation.
    root.addEventListener('fourth-turn-visibility', ({ detail }) => {
      document.body.toggleAttribute('data-helios-turn-visible', detail.visible);
    });
    try {
      booted.push(bootFourthTurn(root));
    } catch (error) {
      const line = faultLine(root);
      line.hidden = false;
      line.textContent = `This fourth turn did not start: ${error.message}`;
      root.dataset.state = 'fault';
      booted.push(null);
    }
  }
  return booted;
}

bootEveryFourthTurn();

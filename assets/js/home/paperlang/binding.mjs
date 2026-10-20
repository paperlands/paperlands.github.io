// One binding owns one value and the domain that admits it. Instruments propose.
// They do not keep a second copy. Escape restores the value captured at the
// start of an adjustment; a committed step is not an adjustment.

export function createBinding({ name, domain, value }) {
  if (typeof name !== 'string' || !name) throw new Error('a binding needs a name');
  if (!domain || typeof domain.project !== 'function' || typeof domain.next !== 'function') {
    throw new Error('a binding needs a domain');
  }
  if (!Number.isFinite(value)) throw new Error('a binding value is not a finite number');
  let current = domain.project(value);
  if (!Number.isFinite(current)) throw new Error('the domain did not return a finite member');
  let adjustment = null;

  const assign = (next) => {
    if (!Number.isFinite(next)) throw new Error('the domain did not return a finite member');
    if (next === current) return false;
    current = next;
    return true;
  };

  return {
    get name() { return name; },
    get value() { return current; },
    get domain() { return domain; },
    read() {
      return Object.freeze({ name, value: current, min: domain.min, max: domain.max, step: domain.step });
    },
    propose(candidate) {
      if (!Number.isFinite(candidate)) throw new Error('a proposal is not a finite number');
      return assign(domain.project(candidate));
    },
    step(direction = 1) {
      // A direction is a count of domain steps. A fraction would ask the domain
      // to leave its members; the domain itself is left unchanged. A noted value
      // may sit off those members, so the step starts from the one it would admit.
      if (!Number.isInteger(direction) || direction === 0) throw new Error('a step names a whole direction');
      return assign(domain.next(domain.project(current), direction, domain.step));
    },
    begin() { adjustment = current; },
    restore() {
      if (adjustment === null) return false;
      const start = adjustment;
      adjustment = null;
      return assign(start);
    },
    end() { adjustment = null; },
    // A consequence of the other axis. It is the value, not a proposal, so the
    // domain does not project it. An open adjustment keeps the restore point.
    note(next) {
      if (!Number.isFinite(next)) throw new Error('a noted value is not a finite number');
      if (adjustment !== null) return false;
      if (next === current) return false;
      current = next;
      return true;
    },
  };
}

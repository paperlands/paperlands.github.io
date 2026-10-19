// Requests and wire records are owned data, never handles back into a page.
export function copyPlain(value, path = 'record', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'object' || ancestors.has(value)) throw new TypeError(`${path} must be acyclic plain data`);
  const array = Array.isArray(value);
  if (!array && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${path} must be plain data`);
  if (Object.getOwnPropertySymbols(value).length) throw new TypeError(`${path} must not contain symbols`);
  ancestors.add(value);
  const result = array ? [] : {};
  for (const key of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!('value' in descriptor)) throw new TypeError(`${path}.${key} must not be an accessor`);
    Object.defineProperty(result, key, { value: copyPlain(descriptor.value, `${path}.${key}`, ancestors), enumerable: true, writable: true, configurable: true });
  }
  if (array && (result.length !== value.length || Object.keys(value).filter(key => /^(0|[1-9][0-9]*)$/.test(key)).length !== value.length)) throw new TypeError(`${path} must not be sparse`);
  ancestors.delete(value);
  return result;
}

export function ownPlain(value) {
  const copy = copyPlain(value);
  const freeze = (item) => {
    if (item !== null && typeof item === 'object') { Object.values(item).forEach(freeze); Object.freeze(item); }
    return item;
  };
  return freeze(copy);
}

export function faultOf(error) {
  const fault = {};
  for (const key of ['message', 'reason', 'kind', 'span', 'wound']) {
    if (error != null && typeof error === 'object' && key in error && error[key] !== undefined) fault[key] = copyPlain(error[key]);
  }
  if (!('message' in fault)) fault.message = String(error);
  return fault;
}

export function rejection(fault, evidence = {}) {
  const record = copyPlain(fault);
  return Object.assign(new Error(record.message), record, copyPlain(evidence));
}

export function visibilityOf(facts) {
  if (facts?.presented === false) return 'previous';
  if (facts?.presented === true && facts?.beatSent === true) return 'partial';
  if (facts?.presented === true && facts?.beatSent === false) return 'replaced-empty';
  return 'unknown';
}

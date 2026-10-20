// A domain owns distinct operations, because proposing with a pointer and moving with a key are
// different acts: a pointer projects an arbitrary candidate onto the nearest member, while a key
// steps from member to member and clamps at the ends. On a finite domain arrows traverse
// members; they never repeatedly add a stride too small to escape the nearest-member basin.

export const rangeDomain = ({ min, max, step }) => ({
  min, max, step,
  project: (candidate) => min + Math.round((Math.min(max, Math.max(min, candidate)) - min) / step) * step,
  next: (value, direction = 1, stride = step) => Math.min(max, Math.max(min, value + direction * stride)),
  first: () => min,
  last: () => max,
});

export const memberDomain = (members) => ({
  members,
  min: members[0], max: members[members.length - 1], step: 1,
  project: (candidate) => members.reduce((best, member) => (Math.abs(member - candidate) < Math.abs(best - candidate) ? member : best)),
  next: (value, direction = 1, stride = 1) => {
    const at = members.indexOf(value);
    const from = at < 0 ? 0 : at;
    return members[Math.min(members.length - 1, Math.max(0, from + direction * stride))];
  },
  first: () => members[0],
  last: () => members[members.length - 1],
});

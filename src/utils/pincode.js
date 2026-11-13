// Ranks field executives by how close their base PIN code is to the case PIN code.
// Indian PIN codes are hierarchical: digit 1 = region, 1–2 = sub-region,
// 1–3 = sorting district, all 6 = delivery post office. So the longer the
// shared prefix, the nearer the executive usually is. No map service needed.

const LEVELS = [
  { digits: 6, label: 'Same PIN code' },
  { digits: 5, label: 'Same area' },
  { digits: 4, label: 'Nearby area' },
  { digits: 3, label: 'Same district' },
  { digits: 2, label: 'Same region' },
];

export function pinMatch(a = '', b = '') {
  if (!/^\d{6}$/.test(a) || !/^\d{6}$/.test(b)) return { digits: 0, label: '' };
  let n = 0;
  while (n < 6 && a[n] === b[n]) n++;
  const level = LEVELS.find((l) => n >= l.digits);
  return level ? { digits: n, label: level.label } : { digits: n, label: '' };
}

// executives: [{ id, pincode, ... }], load: { [id]: openCount }
// → same list sorted nearest first; within the same closeness, fewer open cases first,
//   then the numerically closer PIN code.
export function rankByPincode(executives, pincode, load = {}) {
  return executives
    .map((e) => {
      const m = pinMatch(e.pincode, pincode);
      const gap = m.digits ? Math.abs(Number(e.pincode) - Number(pincode)) : Infinity;
      return { exec: e, match: m, gap, open: load[e.id] || 0 };
    })
    .sort((x, y) => y.match.digits - x.match.digits || x.open - y.open || x.gap - y.gap || x.exec.name.localeCompare(y.exec.name));
}

// Best suggestion: the top-ranked executive, only if at least the same district (3 digits) matches.
export function suggestExecutive(executives, pincode, load = {}) {
  const top = rankByPincode(executives, pincode, load)[0];
  return top && top.match.digits >= 3 ? top : null;
}

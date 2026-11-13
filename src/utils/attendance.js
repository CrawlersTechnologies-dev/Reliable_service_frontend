// Operational lead attendance summary (check-in / check-out records from the panel)
export const LATE_AFTER = { h: 9, m: 45 }; // check-in after 9:45 counts as late

const minutesOfDay = (iso) => {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};
export const fmtClock = (mins) => {
  if (mins == null || Number.isNaN(mins)) return '—';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  const ap = h >= 12 ? 'pm' : 'am';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${ap}`;
};
export const fmtHours = (ms) => (ms == null ? '—' : `${Math.floor(ms / 3600e3)}h ${String(Math.round((ms % 3600e3) / 60e3)).padStart(2, '0')}m`);

export function isLate(rec) {
  return minutesOfDay(rec.checkIn) > LATE_AFTER.h * 60 + LATE_AFTER.m;
}

// Working days (Mon–Sat) between two YYYY-MM-DD dates, inclusive, not after today
export function workingDays(from, to) {
  if (!from || !to) return 0;
  let n = 0;
  const d = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const today = new Date();
  while (d <= end && d <= today) {
    if (d.getDay() !== 0) n++;
    d.setDate(d.getDate() + 1);
  }
  return n;
}

export function attendanceSummary(records, from, to) {
  const days = records.length;
  const done = records.filter((r) => r.checkOut);
  const hours = done.map((r) => new Date(r.checkOut) - new Date(r.checkIn));
  const avgIn = days ? records.reduce((n, r) => n + minutesOfDay(r.checkIn), 0) / days : null;
  const wd = workingDays(from, to);
  return {
    days,
    workingDays: wd,
    absent: Math.max(0, wd - days),
    late: records.filter(isLate).length,
    noCheckout: records.length - done.length,
    avgIn,
    avgHoursMs: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
    attendancePct: wd ? Math.round((days / wd) * 1000) / 10 : null,
  };
}

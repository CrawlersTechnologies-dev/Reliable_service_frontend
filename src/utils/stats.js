import { OUTCOMES, TYPE_LIST } from '../config/verification';
import { caseStatus, caseSubmittedAt, caseTat } from './tat';

export function inRange(c, from, to) {
  const d = c.createdAt.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

export function bankStats(cases, now = Date.now()) {
  const rows = cases.map((c) => ({ c, tat: caseTat(c, now), status: caseStatus(c) }));
  const finished = rows.filter((x) => x.tat.state === 'MET' || x.tat.state === 'MISSED');
  const met = finished.filter((x) => x.tat.state === 'MET').length;
  const turnaround = finished.map((x) => new Date(caseSubmittedAt(x.c)) - new Date(x.c.createdAt));
  const outcomes = Object.fromEntries(OUTCOMES.map((o) => [o.key, rows.filter((x) => x.c.outcome === o.key).length]));
  const byType = Object.fromEntries(TYPE_LIST.map((t) => [t.key, rows.reduce((n, x) => n + x.c.legs.filter((l) => l.type === t.key).length, 0)]));
  return {
    total: rows.length,
    closed: rows.filter((x) => x.status === 'CLOSED').length,
    open: rows.filter((x) => x.status !== 'CLOSED').length,
    outOfTat: rows.filter((x) => x.tat.state === 'OUT_OF_TAT').length,
    qaPending: rows.filter((x) => x.status === 'QA_PENDING').length,
    tatMet: met,
    tatMissed: finished.length - met,
    tatPct: finished.length ? Math.round((met / finished.length) * 100) : null,
    avgTurnaroundMs: turnaround.length ? turnaround.reduce((a, b) => a + b, 0) / turnaround.length : null,
    outcomes,
    byType,
    rows,
  };
}

export function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

import { DECLARATION_QUESTIONS, OUTCOMES, TYPE_LIST } from '../config/verification';
import { caseStatus, caseSubmittedAt, caseTat, deadlineOf } from './tat';

export function inRange(c, from, to) {
  const d = c.createdAt.slice(0, 10);
  return (!from || d >= from) && (!to || d <= to);
}

// Chart colours for outcomes. Order is chosen so neighbouring donut slices stay
// distinguishable for colour-blind readers; every slice also carries a text label.
export const OUTCOME_COLORS = {
  POSITIVE: '#1b8a4f',
  REFER_TO_CREDIT: '#2f62d0',
  RISK_ALERT: '#a87400',
  CNV: '#6b7480',
  NEGATIVE: '#d0151f',
};
export const OUTCOME_ORDER = ['POSITIVE', 'REFER_TO_CREDIT', 'RISK_ALERT', 'CNV', 'NEGATIVE'];
export const TAT_COLORS = { onTime: '#1b8a4f', late: '#d0151f' };

const isLate = (state) => state === 'MISSED' || state === 'OUT_OF_TAT';

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
    // late = finished after the deadline + still open past the deadline
    late: rows.filter((x) => isLate(x.tat.state)).length,
    lateNoReason: rows.filter((x) => isLate(x.tat.state) && !x.c.tatReason).length,
    // share of cases that are due (finished, or open past the deadline) that were done within TAT
    tatPct: met + rows.filter((x) => isLate(x.tat.state)).length ? Math.round((met / (met + rows.filter((x) => isLate(x.tat.state)).length)) * 100) : null,
    avgTurnaroundMs: turnaround.length ? turnaround.reduce((a, b) => a + b, 0) / turnaround.length : null,
    outcomes,
    byType,
    rows,
  };
}

// Cases past their deadline (finished late, or still open and overdue), most overdue first.
export function lateCases(cases, now = Date.now()) {
  return cases
    .map((c) => ({ c, tat: caseTat(c, now) }))
    .filter((x) => isLate(x.tat.state))
    .sort((a, b) => b.tat.overdue - a.tat.overdue);
}

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const complaint = (fb) => fb && DECLARATION_QUESTIONS.some((q) => fb[q.key] === false);

// One row per field executive. A transferred verification counts for its current
// executive, measured from the time it was handed to them.
export function executiveStats(executives, cases, logins = [], now = Date.now()) {
  return executives.map((e) => {
    const legs = cases.flatMap((c) => c.legs.filter((l) => l.executiveId === e.id && !l.internal).map((l) => ({ c, l })));
    const done = legs.filter(({ l }) => l.status === 'SUBMITTED' && !l.manual);
    const handedAt = ({ c, l }) => new Date(l.transfers?.length ? l.transfers.at(-1).at : c.createdAt).getTime();
    const onTime = done.filter(({ c, l }) => new Date(l.submittedAt).getTime() <= deadlineOf(c)).length;
    const lateDone = done.length - onTime;
    const overdueOpen = legs.filter(({ c, l }) => l.status !== 'SUBMITTED' && now > deadlineOf(c)).length;
    const feedback = [...new Set(legs.map(({ c }) => c))].filter((c) => c.feedback).map((c) => c.feedback);
    const days = new Set(logins.filter((s) => s.executiveId === e.id).map((s) => s.loginAt.slice(0, 10)));
    const km = legs.reduce((n, { l }) => n + (Number(l.km) || 0), 0);
    return {
      exec: e,
      assigned: legs.length,
      submitted: done.length,
      pending: legs.filter(({ l }) => l.status !== 'SUBMITTED').length,
      onTime,
      late: lateDone + overdueOpen,
      onTimePct: onTime + lateDone + overdueOpen ? Math.round((onTime / (onTime + lateDone + overdueOpen)) * 100) : null,
      avgTurnaroundMs: avg(done.map((x) => new Date(x.l.submittedAt).getTime() - handedAt(x))),
      km,
      rating: avg(feedback.map((f) => f.rating)),
      ratings: feedback.length,
      complaints: feedback.filter(complaint).length,
      loginDays: days.size,
    };
  });
}

// One row per operational lead (and admin, who can do the same work).
export function olStats(people, cases, now = Date.now()) {
  return people.map((p) => {
    const created = cases.filter((c) => c.createdBy?.id === p.id);
    const closedBy = cases.filter((c) => c.outcome && c.outcomeBy?.id === p.id);
    const qaTimes = closedBy.filter((c) => c.fieldCompletedAt || caseSubmittedAt(c)).map((c) => new Date(c.outcomeAt) - new Date(c.fieldCompletedAt || caseSubmittedAt(c)));
    const outcomes = Object.fromEntries(OUTCOMES.map((o) => [o.key, closedBy.filter((c) => c.outcome === o.key).length]));
    const createdLate = created.filter((c) => isLate(caseTat(c, now).state));
    return {
      person: p,
      created: created.length,
      closed: closedBy.length,
      qaPending: created.filter((c) => caseStatus(c) === 'QA_PENDING').length,
      avgQaMs: avg(qaTimes.filter((t) => t >= 0)),
      late: createdLate.length,
      lateNoReason: createdLate.filter((c) => !c.tatReason).length,
      reasons: cases.filter((c) => c.tatReason?.by?.id === p.id).length,
      manual: cases.reduce((n, c) => n + c.legs.filter((l) => l.manual && l.completedBy?.id === p.id).length, 0),
      outcomes,
    };
  });
}

// People who appear on cases as creator / closer (so admins show up next to OLs).
export function caseActors(cases, ols = []) {
  const m = new Map(ols.map((o) => [o.id, { id: o.id, name: o.name, role: 'OL', employeeId: o.employeeId }]));
  cases.forEach((c) =>
    [c.createdBy, c.outcomeBy].forEach((a) => {
      if (a?.id && !m.has(a.id) && a.role !== 'EXECUTIVE') m.set(a.id, { id: a.id, name: a.name, role: a.role, employeeId: '' });
    }),
  );
  return [...m.values()].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'OL' ? -1 : 1));
}

export function monthStartISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

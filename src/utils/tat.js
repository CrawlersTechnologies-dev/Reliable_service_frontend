import { TAT_TYPES } from '../config/verification';

const HOUR = 3600 * 1000;

// TAT hours of a case — each holiday added by Admin / OL gives 24 h more
export function tatHoursOf(c) {
  return (TAT_TYPES[c.tatType]?.hours ?? 8) + (c.holidays?.length || 0) * 24;
}

export function deadlineOf(c) {
  return new Date(c.createdAt).getTime() + tatHoursOf(c) * HOUR;
}

// TAT clock stops when the executive(s) submit. stopAt = submission time.
function tatState(c, stopAt, now) {
  const deadline = deadlineOf(c);
  const ref = stopAt ? new Date(stopAt).getTime() : now;
  const diff = deadline - ref; // + remaining, - overdue
  let state;
  if (stopAt) state = diff >= 0 ? 'MET' : 'MISSED';
  else state = diff >= 0 ? 'IN_TAT' : 'OUT_OF_TAT';
  const hours = tatHoursOf(c);
  const elapsed = ref - new Date(c.createdAt).getTime();
  return { state, diff, deadline, overdue: diff < 0 ? -diff : 0, progress: Math.min(1, Math.max(0, elapsed / (hours * HOUR))) };
}

export function caseSubmittedAt(c) {
  if (!c.legs.length || c.legs.some((l) => l.status !== 'SUBMITTED')) return null;
  return c.legs.map((l) => l.submittedAt).sort().at(-1);
}

export const caseTat = (c, now = Date.now()) => tatState(c, caseSubmittedAt(c), now);
export const legTat = (c, leg, now = Date.now()) => tatState(c, leg.status === 'SUBMITTED' ? leg.submittedAt : null, now);

export function caseStatus(c) {
  if (c.outcome) return 'CLOSED';
  if (c.legs.every((l) => l.status === 'SUBMITTED')) return 'QA_PENDING';
  if (c.legs.some((l) => l.status !== 'ASSIGNED')) return 'IN_FIELD';
  return 'ASSIGNED';
}

export const CASE_STATUS = {
  ASSIGNED: { label: 'Assigned', tone: 'slate' },
  IN_FIELD: { label: 'In field', tone: 'blue' },
  QA_PENDING: { label: 'QA pending', tone: 'amber' },
  CLOSED: { label: 'Closed', tone: 'green' },
};

export const LEG_STATUS = {
  ASSIGNED: { label: 'Assigned', tone: 'slate' },
  IN_PROGRESS: { label: 'Visit started', tone: 'blue' },
  SUBMITTED: { label: 'Submitted', tone: 'green' },
};

export function fmtDuration(ms) {
  const totalMin = Math.max(0, Math.floor(ms / 60000));
  const d = Math.floor(totalMin / 1440);
  const h = Math.floor((totalMin % 1440) / 60);
  const m = totalMin % 60;
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}m`;
}

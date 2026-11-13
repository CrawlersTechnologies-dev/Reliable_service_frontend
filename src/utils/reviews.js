// Numbers for the two client templates:
//  • "Back-End Performance Review" (operational leads / back office)
//  • "Field Officer Performance Review" (one field executive)
// Everything is computed from live case data for the chosen period.
import { OUTCOMES, TAT_TYPES } from '../config/verification';
import { caseTat, deadlineOf } from './tat';

export const pctOf = (a, b) => (b ? (a / b) * 100 : 0);
export const fmt1 = (v) => `${(Math.round(v * 10) / 10).toFixed(1)}%`;

// Template colours. Back-end template: Positive = yellow, Risk Alert = amber, Negative = red.
export const STATUS_COLORS = { POSITIVE: '#f5c400', RISK_ALERT: '#e8890c', NEGATIVE: '#d0151f', OTHER: '#6b7480' };
// Field officer template uses green for Positive.
export const FO_STATUS_COLORS = { POSITIVE: '#1b8a4f', RISK_ALERT: '#e8890c', NEGATIVE: '#d0151f', CNV: '#6b7480', REFER_TO_CREDIT: '#2f62d0', PENDING: '#c9c4bf' };
export const TAT_YELLOW = '#f5c400';
export const TAT_RED = '#d0151f';

const label = (k) => OUTCOMES.find((o) => o.key === k)?.label || k;

/* ------------------------------------------------------------------ */
/* Back-end (OL) review                                                */
/* ------------------------------------------------------------------ */

// Cases an operational lead handled = cases they created or gave the final status to.
export function casesHandledBy(cases, personId) {
  if (!personId) return cases;
  return cases.filter((c) => c.createdBy?.id === personId || c.outcomeBy?.id === personId);
}

export function backendReview(cases, bankById) {
  const rows = cases.map((c) => ({ c, tat: caseTat(c) }));
  const closed = rows.filter((x) => x.c.outcome);
  const byBankMap = new Map();
  rows.forEach((x) => {
    const b = byBankMap.get(x.c.bankId) || { bankId: x.c.bankId, total: 0, closed: 0, inTat: 0, outTat: 0, POSITIVE: 0, RISK_ALERT: 0, NEGATIVE: 0, CNV: 0, REFER_TO_CREDIT: 0 };
    b.total++;
    if (x.c.outcome) {
      b.closed++;
      // a closed case is in TAT if its field work finished by the deadline
      if (x.tat.state === 'MET') b.inTat++;
      else b.outTat++;
      b[x.c.outcome]++;
    }
    byBankMap.set(x.c.bankId, b);
  });
  const banks = [...byBankMap.values()]
    .map((b) => ({ ...b, name: bankById[b.bankId]?.name || 'Unknown bank', code: bankById[b.bankId]?.code || '—', other: b.CNV + b.REFER_TO_CREDIT }))
    .sort((a, b) => b.total - a.total);
  const sum = (k) => banks.reduce((n, b) => n + b[k], 0);
  const overall = {
    banks: banks.length,
    total: rows.length,
    open: rows.length - closed.length,
    closed: closed.length,
    inTat: sum('inTat'),
    outTat: sum('outTat'),
    POSITIVE: sum('POSITIVE'),
    RISK_ALERT: sum('RISK_ALERT'),
    NEGATIVE: sum('NEGATIVE'),
    CNV: sum('CNV'),
    REFER_TO_CREDIT: sum('REFER_TO_CREDIT'),
  };
  overall.other = overall.CNV + overall.REFER_TO_CREDIT;
  return { banks, overall };
}

export function statusSlices(b) {
  const s = [
    { key: 'POSITIVE', label: 'Positive', value: b.POSITIVE, color: STATUS_COLORS.POSITIVE },
    { key: 'RISK_ALERT', label: 'Risk Alert', value: b.RISK_ALERT, color: STATUS_COLORS.RISK_ALERT },
    { key: 'NEGATIVE', label: 'Negative', value: b.NEGATIVE, color: STATUS_COLORS.NEGATIVE },
  ];
  // CNV / Refer to Credit are shown separately, never folded into the three
  if (b.other) s.push({ key: 'OTHER', label: 'CNV / Refer', value: b.other, color: STATUS_COLORS.OTHER });
  return s;
}

export const DEFAULT_BACKEND_TEXT = {
  priorities: [
    'Reduce out-of-TAT cases through daily pending-case reviews, early customer coordination and escalation of field delays.',
    'Strengthen Risk Alert evidence and refer cases promptly for the right review.',
    'Improve report accuracy through a final checklist before submission.',
  ].join('\n'),
  appreciation: '“Consistent quality, timely closures and proactive risk identification build trust with every review.”',
  focus: 'Track measurable improvement in TAT, risk documentation and report quality.',
};

/* ------------------------------------------------------------------ */
/* Field officer review (one executive)                                */
/* ------------------------------------------------------------------ */

// Verifications assigned to the executive (current assignee only — transferred work
// counts for whoever holds it now). Internal (bank statement) work is excluded.
export function fieldOfficerReview(exec, cases) {
  const items = cases.flatMap((c) => c.legs.filter((l) => l.executiveId === exec.id && !l.internal).map((l) => ({ c, l })));
  const isClosed = ({ c }) => !!c.outcome;
  const inTat = ({ c, l }) => l.submittedAt && new Date(l.submittedAt).getTime() <= deadlineOf(c);

  const handled = items.length;
  const closed = items.filter(isClosed);
  const within = closed.filter(inTat).length;
  const out = closed.length - within;

  const byType = Object.values(TAT_TYPES).map((t) => {
    const mine = items.filter(({ c }) => c.tatType === t.key);
    const cl = mine.filter(isClosed);
    const w = cl.filter(inTat).length;
    return { key: t.key, label: t.key === 'OGL' ? 'OGL (Out of Location)' : t.label, hours: t.hours, handled: mine.length, within: w, out: cl.length - w, closed: cl.length };
  });

  const outcomeKeys = ['POSITIVE', 'RISK_ALERT', 'NEGATIVE', 'CNV', 'REFER_TO_CREDIT'];
  const outcomes = outcomeKeys
    .map((k) => ({ key: k, label: label(k), count: items.filter(({ c }) => c.outcome === k).length }))
    .filter((o) => o.count > 0 || ['POSITIVE', 'RISK_ALERT', 'NEGATIVE'].includes(o.key));
  const pending = handled - closed.length;
  if (pending) outcomes.push({ key: 'PENDING', label: 'Pending (no final status yet)', count: pending });

  return { exec, items, handled, closed: closed.length, within, out, byType, outcomes };
}

export const OUTCOME_MEANING = {
  POSITIVE: 'Verified / satisfactory outcome',
  RISK_ALERT: 'Potential risk requiring review or escalation',
  NEGATIVE: 'Adverse / negative finding',
  CNV: 'Could not verify',
  REFER_TO_CREDIT: 'Referred to the bank credit team',
  PENDING: 'Visit or QA not finished — no status yet',
};

export const IMPROVEMENT_ROWS = [
  ['TAT compliance', 'Prioritise closures within Local 8-hour and OGL 24-hour limits; record delay reasons for every out-of-TAT case.', 'Daily'],
  ['Case quality', 'Ensure clear findings, complete evidence, accurate status selection and concise remarks before submission.', 'Every case'],
  ['Risk Alert / Negative', 'Escalate cases in line with client SOP and maintain supporting evidence for supervisor review.', 'As identified'],
  ['Planning & communication', 'Plan routes and customer appointments efficiently; inform the reporting manager early when a delay is likely.', 'Daily / weekly review'],
];

export function defaultFoText(r) {
  const first = r.exec.name.split(' ')[0];
  const closeRate = fmt1(pctOf(r.closed, r.handled));
  const tatRate = fmt1(pctOf(r.within, r.closed));
  return {
    summary: r.handled
      ? `${r.closed} of ${r.handled} handled cases closed (${closeRate}). ${r.within} closed within TAT (${tatRate} of closed) and ${r.out} out of TAT. TAT compliance and outcome quality should continue to be reviewed together.`
      : 'No cases were handled in this review period.',
    appreciation: `Thank you, ${first}, for your contribution and commitment to field operations. Your case handling effort supports timely verification and dependable service delivery. Keep building on this performance through consistent TAT discipline, accurate reporting and proactive communication.`,
    note: 'Appreciate the effort, reinforce the good practices, and review the improvement points in the next performance discussion.',
  };
}

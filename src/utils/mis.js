// Master MIS — every case with all its details, downloaded as an Excel (.xlsx) file.
import { OUTCOMES, VISIT_RESULTS, reportLabel, typeOf } from '../config/verification';
import { buildRemarks } from './remarks';
import { caseStatus, caseSubmittedAt, caseTat, CASE_STATUS, fmtDuration } from './tat';
import { downloadXlsx } from './xlsx';

const cell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const d = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');

export function downloadCsv(filename, rows) {
  // BOM so Excel reads ₹ and Kannada correctly
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const MIS_HEADER = [
  'Case ID', 'Created on', 'Created by', 'Bank', 'Banker case ID', 'Branch name', 'Branch code',
  'Customer name', 'Additional names', 'Co-applicant', 'Product', 'Loan amount', 'Contact', 'Alternate contact',
  'PAN', 'Dedupe check', 'Customer profile', 'DSA / DST', 'DSA / DST name',
  'Verification types', 'Field executives', 'Location', 'Sub-location', 'KMS', 'Visit result', 'TAT type', 'Deadline', 'Holiday days',
  'Field completed', 'TAT status', 'Delay', 'Delay reason', 'Re-work count', 'Case status', 'Final status',
  'Final status by', 'Final status on', 'Combined remarks', 'Customer rating',
];

// Location = "From" place, Sub-location = "To" place, KMS = distance (total of all visits)
const places = (c, key) => [...new Set(c.legs.filter((l) => !l.internal).map((l) => (l[key] || '').trim()).filter(Boolean))].join(' | ');
function kms(c) {
  const list = c.legs.filter((l) => !l.internal).map((l) => l.km).filter((k) => k !== null && k !== undefined && k !== '' && !Number.isNaN(Number(k)));
  return list.length ? Math.round(list.reduce((t, k) => t + Number(k), 0) * 10) / 10 : '';
}
// the same remarks as the report's "Overall combined remarks" page, one block per verification
function combinedRemarks(c) {
  return c.legs
    .map((l) => {
      const t = typeOf(l.type);
      const name = `${reportLabel(t).toUpperCase()}${t.isDocument && l.documentName ? ` (${l.documentName})` : ''}`;
      if (l.status !== 'SUBMITTED') return `${name}: Pending`;
      if (['UNTRACEABLE', 'REFUSED'].includes(l.visitResult)) {
        return `${name}: ${VISIT_RESULTS.find((r) => r.key === l.visitResult)?.label || l.visitResult} — ${l.nonVisitReason || ''}`;
      }
      const lines = buildRemarks(l.type, l.findings || {}, l).map(([k, v]) => (k ? `${k}: ${v}` : v));
      return `${name}\n${lines.join('\n')}`;
    })
    .join('\n\n');
}
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? '' : Number(v));

export function misRows(cases, bankById, execById) {
  return cases.map((c) => {
    const tat = caseTat(c);
    const late = tat.state === 'MISSED' || tat.state === 'OUT_OF_TAT';
    return [
      c.caseNo,
      d(c.createdAt),
      c.createdBy?.name,
      bankById[c.bankId]?.name,
      c.bankerCaseId,
      c.branchName,
      c.branchCode,
      c.customerName,
      (c.otherNames || []).join('; '),
      [c.coApplicantName, c.coApplicantContact].filter(Boolean).join(' · '),
      c.product,
      num(c.loanAmount),
      c.contact,
      c.altContact,
      c.pan,
      c.dedupeCheck,
      c.profile,
      c.sourcing,
      c.sourcingName,
      c.legs.map((l) => typeOf(l.type).label).join(' + '),
      c.legs.map((l) => (l.internal ? 'Office' : execById[l.executiveId]?.name)).filter(Boolean).join(', '),
      places(c, 'fromPlace'),
      places(c, 'toPlace'),
      kms(c),
      c.legs.map((l) => VISIT_RESULTS.find((r) => r.key === l.visitResult)?.label).filter(Boolean).join(', '),
      c.tatType === 'OGL' ? 'OGL (24h)' : 'Local (8h)',
      d(new Date(tat.deadline).toISOString()),
      c.holidays?.length || '',
      d(caseSubmittedAt(c)),
      { IN_TAT: 'Within TAT (running)', OUT_OF_TAT: 'Out of TAT (open)', MET: 'Within TAT', MISSED: 'Out of TAT' }[tat.state],
      late ? fmtDuration(tat.overdue) : '',
      c.tatReason?.text || '',
      c.legs.reduce((n, l) => n + (l.rework?.count || 0), 0) || '',
      CASE_STATUS[caseStatus(c)]?.label,
      OUTCOMES.find((o) => o.key === c.outcome)?.label || '',
      c.outcomeBy?.name || '',
      d(c.outcomeAt),
      combinedRemarks(c),
      num(c.feedback?.rating),
    ];
  });
}

export function downloadMis(cases, bankById, execById, label = 'all') {
  const stamp = new Date().toISOString().slice(0, 10);
  return downloadXlsx(`Reliable_Master_MIS_${label}_${stamp}.xlsx`, [MIS_HEADER, ...misRows(cases, bankById, execById)], 'Master MIS');
}

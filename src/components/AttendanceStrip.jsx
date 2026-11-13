// Attendance summary of one operational lead for the review period (performance screens + PDF)
import { useEffect, useState } from 'react';
import * as api from '../api';
import { Kpi } from './Reviews';
import { attendanceSummary, fmtClock, fmtHours } from '../utils/attendance';

export default function AttendanceStrip({ personId, from, to, title = 'Attendance' }) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    if (!personId) return;
    api.attendance
      .list({ from, to, userId: personId })
      .then(setRows)
      .catch(() => setRows([]));
  }, [personId, from, to]);
  if (!personId || !rows) return null;
  const s = attendanceSummary(rows.filter((r) => r.userId === personId), from, to);
  return (
    <div className="rv-attendance">
      <h4 className="rv-h4">{title}</h4>
      <div className="rv-kpis compact">
        <Kpi tone="light" accent="yellow" label="Days present" value={`${s.days} / ${s.workingDays}`} sub={s.attendancePct == null ? 'Working days in period' : `${s.attendancePct}% attendance`} />
        <Kpi tone="light" accent="red" label="Absent" value={s.absent} sub="Working days without check-in" />
        <Kpi tone="light" accent="yellow" label="Late check-ins" value={s.late} sub={`Average check-in ${fmtClock(s.avgIn)}`} />
        <Kpi tone="light" accent="red" label="Average day" value={fmtHours(s.avgHoursMs)} sub={`${s.noCheckout} day(s) without check-out`} />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { useAuth, useData } from '../context/AppContext';
import { Empty, PageHeader, Pill, Stat } from '../components/ui';
import Icon from '../components/Icon';
import CheckInCard from '../components/CheckInCard';
import { fmtDate, fmtTime, todayISO } from '../utils/format';
import { monthStartISO } from '../utils/stats';
import { attendanceSummary, fmtClock, fmtHours, isLate } from '../utils/attendance';
import { downloadXlsx } from '../utils/xlsx';

// Operational lead attendance (check-in / check-out). Admin sees everyone; an OL sees their own.
export default function Attendance() {
  const { user, isAdmin } = useAuth();
  const { ols } = useData();
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  const [personId, setPersonId] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setRows(null);
    api.attendance
      .list({ from, to, userId: isAdmin ? personId : '' })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [from, to, personId, isAdmin]);

  const people = isAdmin ? ols.filter((o) => !personId || o.id === personId) : [{ id: user.id, name: user.name, employeeId: user.employeeId }];
  const perPerson = useMemo(
    () => (rows ? people.map((p) => ({ p, s: attendanceSummary(rows.filter((r) => r.userId === p.id), from, to) })) : []),
    [rows, people, from, to],
  );

  function exportCsv() {
    downloadXlsx(`attendance_${from}_${to}.xlsx`, [
      ['Date', 'Name', 'Check in', 'Check out', 'Hours', 'Late'],
      ...(rows || []).map((r) => [
        r.date,
        r.name,
        fmtTime(r.checkIn),
        r.checkOut ? fmtTime(r.checkOut) : '',
        r.checkOut ? fmtHours(new Date(r.checkOut) - new Date(r.checkIn)) : '',
        isLate(r) ? 'Yes' : 'No',
      ]),
    ], 'Attendance');
  }

  return (
    <div className="page">
      <PageHeader
        title="Attendance"
        subtitle={isAdmin ? 'Operational lead check-in / check-out' : 'Your check-in / check-out'}
        actions={
          rows?.length > 0 && (
            <button className="btn btn-ghost" onClick={exportCsv}>
              <Icon name="download" /> Download
            </button>
          )
        }
      />
      {!isAdmin && <CheckInCard />}
      <div className="filters card">
        {isAdmin && (
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Operational lead">
            <option value="">All operational leads</option>
            {ols.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}
        <div className="date-range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        </div>
        <span className="muted small">Check-in after 9:45 am counts as late · Sundays are off</span>
      </div>

      {error && <p className="txt-red">{error}</p>}
      {!rows ? (
        <div className="card"><p className="muted">Loading…</p></div>
      ) : (
        <>
          {perPerson.length === 1 && (
            <div className="stats stats-4">
              <Stat label="Days present" value={perPerson[0].s.days} icon="checkCircle" tone="green" foot={`of ${perPerson[0].s.workingDays} working days`} />
              <Stat label="Absent" value={perPerson[0].s.absent} icon="alert" tone="red" foot="Working days without check-in" />
              <Stat label="Late check-ins" value={perPerson[0].s.late} icon="clock" tone="yellow" foot={`Average in ${fmtClock(perPerson[0].s.avgIn)}`} />
              <Stat label="Average day" value={fmtHours(perPerson[0].s.avgHoursMs)} icon="activity" tone="ink" foot={`${perPerson[0].s.noCheckout} day(s) without check-out`} />
            </div>
          )}
          {perPerson.length > 1 && (
            <div className="card table-card">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Operational lead</th>
                      <th className="num">Present</th>
                      <th className="num">Absent</th>
                      <th className="num">Attendance</th>
                      <th className="num">Late</th>
                      <th className="num">Avg check-in</th>
                      <th className="num">Avg hours</th>
                      <th className="num">No check-out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {perPerson.map(({ p, s }) => (
                      <tr key={p.id} className="row-link" onClick={() => setPersonId(p.id)}>
                        <td>
                          <strong>{p.name}</strong>
                          <div className="muted small">{p.employeeId}</div>
                        </td>
                        <td className="num">{s.days}</td>
                        <td className="num">{s.absent ? <span className="txt-red strong">{s.absent}</span> : 0}</td>
                        <td className="num">{s.attendancePct == null ? '—' : `${s.attendancePct}%`}</td>
                        <td className="num">{s.late}</td>
                        <td className="num">{fmtClock(s.avgIn)}</td>
                        <td className="num">{fmtHours(s.avgHoursMs)}</td>
                        <td className="num">{s.noCheckout}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="card table-card">
            {rows.length === 0 ? (
              <Empty icon="calendar" title="No attendance in this period" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      {isAdmin && <th>Name</th>}
                      <th>Check in</th>
                      <th>Check out</th>
                      <th className="num">Hours</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td>{fmtDate(r.date)}</td>
                        {isAdmin && <td>{r.name}</td>}
                        <td>{fmtTime(r.checkIn)}</td>
                        <td>{r.checkOut ? fmtTime(r.checkOut) : <span className="muted">—</span>}</td>
                        <td className="num">{r.checkOut ? fmtHours(new Date(r.checkOut) - new Date(r.checkIn)) : '—'}</td>
                        <td>{isLate(r) && <Pill tone="amber">Late</Pill>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

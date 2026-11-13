import { Link, useLocation } from 'react-router-dom';
import { useAuth, useData } from '../context/AppContext';
import { Logo } from '../components/ui';
import { BarRows, Donut } from '../components/Charts';
import Icon from '../components/Icon';
import { AGENCY, OUTCOMES } from '../config/verification';
import { OUTCOME_COLORS, OUTCOME_ORDER, TAT_COLORS, caseActors, executiveStats, inRange, olStats } from '../utils/stats';
import { fmtDateTime, fmtLongDate } from '../utils/format';
import { fmtDuration } from '../utils/tat';

const dur = (ms) => (ms == null ? '—' : fmtDuration(ms));

// Printable performance report: ?kind=executive|ol&id=&from=&to=
export default function StaffPerformanceReport() {
  const { user, isAdmin } = useAuth();
  const { cases, executives, ols, logins } = useData();
  const p = new URLSearchParams(useLocation().search);
  const kind = p.get('kind') === 'ol' ? 'ol' : 'executive';
  const from = p.get('from') || '';
  const to = p.get('to') || '';
  // an OL can only print their own OL report
  const id = kind === 'ol' && !isAdmin ? user.id : p.get('id') || '';
  const scoped = cases.filter((c) => inRange(c, from, to));
  const period = `${from ? fmtLongDate(from) : 'Start'} – ${to ? fmtLongDate(to) : 'Today'}`;

  let title;
  let body;
  if (kind === 'executive') {
    const list = executives.filter((e) => !id || e.id === id);
    const rows = executiveStats(list, scoped, logins.filter((s) => (!from || s.loginAt.slice(0, 10) >= from) && (!to || s.loginAt.slice(0, 10) <= to))).sort((a, z) => z.assigned - a.assigned);
    const t = rows.reduce((a, r) => ({ onTime: a.onTime + r.onTime, late: a.late + r.late, assigned: a.assigned + r.assigned, submitted: a.submitted + r.submitted }), { onTime: 0, late: 0, assigned: 0, submitted: 0 });
    title = id ? `Field Executive Performance — ${list[0]?.name}` : 'Field Executive Performance';
    body = (
      <>
        <div className="r-kpis">
          <div><span>Assigned</span><strong>{t.assigned}</strong></div>
          <div><span>Submitted</span><strong>{t.submitted}</strong></div>
          <div><span>Within TAT</span><strong>{t.onTime + t.late ? `${Math.round((t.onTime / (t.onTime + t.late)) * 100)}%` : '—'}</strong></div>
          <div className="bad"><span>Out of TAT</span><strong>{t.late}</strong></div>
          <div><span>Complaints</span><strong>{rows.reduce((n, r) => n + r.complaints, 0)}</strong></div>
        </div>
        <div className="r-charts">
          <div>
            <div className="r-chart-title">Within TAT vs out of TAT</div>
            <Donut size={150} thickness={24} sub="verifications" data={[
              { key: 'onTime', label: 'Within TAT', value: t.onTime, color: TAT_COLORS.onTime },
              { key: 'late', label: 'Out of TAT', value: t.late, color: TAT_COLORS.late },
            ]} />
          </div>
          <div>
            <div className="r-chart-title">By executive</div>
            <BarRows
              series={[
                { key: 'onTime', label: 'Within TAT', color: TAT_COLORS.onTime },
                { key: 'late', label: 'Out of TAT', color: TAT_COLORS.late },
              ]}
              rows={rows.filter((r) => r.onTime + r.late > 0).map((r) => ({ key: r.exec.id, label: r.exec.name, values: { onTime: r.onTime, late: r.late } }))}
            />
          </div>
        </div>
        <div className="r-bar">Executive register</div>
        <table className="r-table r-dense">
          <thead>
            <tr>
              <th>Executive</th><th>Base</th><th>Assigned</th><th>Submitted</th><th>Pending</th><th>Within TAT</th><th>Out of TAT</th><th>Avg time</th><th>Km</th><th>Rating</th><th>Complaints</th><th>Login days</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.exec.id}>
                <td>{r.exec.name} ({r.exec.employeeId})</td>
                <td>{r.exec.location}</td>
                <td>{r.assigned}</td>
                <td>{r.submitted}</td>
                <td>{r.pending}</td>
                <td>{r.onTimePct == null ? '—' : `${r.onTimePct}%`}</td>
                <td className={r.late ? 'txt-red' : ''}>{r.late}</td>
                <td>{dur(r.avgTurnaroundMs)}</td>
                <td>{r.km || '—'}</td>
                <td>{r.rating == null ? '—' : r.rating.toFixed(1)}</td>
                <td>{r.complaints}</td>
                <td>{r.loginDays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  } else {
    const people = caseActors(cases, ols).filter((x) => !id || x.id === id);
    const list = people.length || !id ? people : [{ id: user.id, name: user.name, role: user.role, employeeId: user.employeeId }];
    const rows = olStats(list, scoped);
    const outcomes = rows.reduce((t, r) => {
      Object.entries(r.outcomes).forEach(([k, v]) => (t[k] = (t[k] || 0) + v));
      return t;
    }, {});
    title = id ? `Operational Lead Performance — ${list[0]?.name}` : 'Operational Lead Performance';
    body = (
      <>
        <div className="r-kpis">
          <div><span>Cases created</span><strong>{rows.reduce((n, r) => n + r.created, 0)}</strong></div>
          <div><span>Cases closed</span><strong>{rows.reduce((n, r) => n + r.closed, 0)}</strong></div>
          <div><span>Awaiting QA</span><strong>{rows.reduce((n, r) => n + r.qaPending, 0)}</strong></div>
          <div className="bad"><span>Out of TAT</span><strong>{rows.reduce((n, r) => n + r.late, 0)}</strong></div>
          <div><span>Handled in office</span><strong>{rows.reduce((n, r) => n + r.manual, 0)}</strong></div>
        </div>
        <div className="r-charts">
          <div>
            <div className="r-chart-title">Final status given</div>
            <Donut size={150} thickness={24} sub="closed" data={OUTCOME_ORDER.map((k) => ({ key: k, label: OUTCOMES.find((o) => o.key === k).label, value: outcomes[k] || 0, color: OUTCOME_COLORS[k] }))} />
          </div>
          <div>
            <div className="r-chart-title">Created vs closed</div>
            <BarRows
              mode="group"
              series={[
                { key: 'created', label: 'Created', color: '#2f62d0' },
                { key: 'closed', label: 'Closed', color: '#1b8a4f' },
              ]}
              rows={rows.map((r) => ({ key: r.person.id, label: r.person.name, values: { created: r.created, closed: r.closed } }))}
            />
          </div>
        </div>
        <div className="r-bar">Register</div>
        <table className="r-table r-dense">
          <thead>
            <tr>
              <th>Name</th><th>Role</th><th>Created</th><th>Closed</th><th>Awaiting QA</th><th>Avg QA time</th><th>Out of TAT</th><th>No reason</th><th>Reasons written</th><th>Handled in office</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.person.id}>
                <td>{r.person.name}</td>
                <td>{r.person.role === 'ADMIN' ? 'Admin' : 'Operational lead'}</td>
                <td>{r.created}</td>
                <td>{r.closed}</td>
                <td>{r.qaPending}</td>
                <td>{dur(r.avgQaMs)}</td>
                <td>{r.late}</td>
                <td className={r.lateNoReason ? 'txt-red' : ''}>{r.lateNoReason}</td>
                <td>{r.reasons}</td>
                <td>{r.manual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <div className="report-shell">
      <div className="report-toolbar no-print">
        <Link to={`/reports?tab=${kind}`} className="btn btn-ghost">
          <Icon name="chevronLeft" /> Reports
        </Link>
        <span />
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>
      <div className="report">
        <section className="r-page">
          <div className="r-cover">
            <Logo />
            <p className="r-tagline">{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</p>
          </div>
          <h1 className="r-title">{title}</h1>
          <p className="r-sub">{period} · generated {fmtDateTime(new Date())}</p>
          {body}
          <div className="r-reviewed">
            Report reviewed by: {AGENCY.reviewer} ({AGENCY.reviewerTitle})
          </div>
          <div className="r-foot">
            <span>{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</span>
            <span>{kind === 'ol' ? 'Operational lead performance' : 'Field executive performance'}</span>
          </div>
        </section>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, useData } from '../context/AppContext';
import { Avatar, Empty, PageHeader, Pill, Segmented, Stat, TatBadge, TypeChip } from '../components/ui';
import { BarRows, Donut } from '../components/Charts';
import { BackendOverall, BackendSnapshot, BackendStatus, DEFAULT_BACKEND_TEXT, FoHeader, FoKpis, FoOutcomes, FoTatTable } from '../components/Reviews';
import { backendReview, casesHandledBy, fieldOfficerReview, fmt1, pctOf } from '../utils/reviews';
import TatReason from '../components/TatReason';
import AttendanceStrip from '../components/AttendanceStrip';
import Icon from '../components/Icon';
import { OUTCOMES } from '../config/verification';
import { OUTCOME_COLORS, OUTCOME_ORDER, TAT_COLORS, bankStats, caseActors, executiveStats, inRange, lateCases, monthStartISO } from '../utils/stats';
import { fmtDate, todayISO } from '../utils/format';
import { fmtDuration } from '../utils/tat';

const TABS = [
  { value: 'bank', label: 'Bank performance' },
  { value: 'executive', label: 'Field executives' },
  { value: 'ol', label: 'Operational leads' },
  { value: 'cases', label: 'Case reports' },
];

export function outcomeSlices(outcomes) {
  return OUTCOME_ORDER.map((k) => ({ key: k, label: OUTCOMES.find((o) => o.key === k).label, value: outcomes[k] || 0, color: OUTCOME_COLORS[k] }));
}
const TAT_SERIES = [
  { key: 'onTime', label: 'Within TAT', color: TAT_COLORS.onTime },
  { key: 'late', label: 'Out of TAT', color: TAT_COLORS.late },
];
const dur = (ms) => (ms == null ? '—' : fmtDuration(ms));

export default function Reports() {
  const params = new URLSearchParams(useLocation().search);
  const [tab, setTab] = useState(params.get('tab') || 'bank');
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());
  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Performance of banks, field executives and operational leads, and final case reports" />
      <div className="toolbar">
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </div>
      {tab === 'bank' && <BankPerformance from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      {tab === 'executive' && <ExecutivePerformance from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      {tab === 'ol' && <OlPerformance from={from} to={to} setFrom={setFrom} setTo={setTo} />}
      {tab === 'cases' && <CaseReports />}
    </div>
  );
}

function DateRange({ from, to, setFrom, setTo }) {
  return (
    <div className="date-range">
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
      <span>to</span>
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
    </div>
  );
}

/* ---------------- Bank performance ---------------- */
function BankPerformance({ from, to, setFrom, setTo }) {
  const { cases, banks, bankById } = useData();
  const navigate = useNavigate();
  const [bank, setBank] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);

  const scoped = useMemo(() => cases.filter((c) => (!bank || c.bankId === bank) && inRange(c, from, to)), [cases, bank, from, to]);
  const overall = useMemo(() => bankStats(scoped), [scoped]);
  const shown = bank ? banks.filter((b) => b.id === bank) : banks;
  const per = useMemo(() => shown.map((b) => ({ b, s: bankStats(scoped.filter((c) => c.bankId === b.id)) })), [shown, scoped]);
  const late = useMemo(() => lateCases(scoped).filter((x) => !onlyMissing || !x.c.tatReason), [scoped, onlyMissing]);

  return (
    <>
      <div className="filters card">
        <select value={bank} onChange={(e) => setBank(e.target.value)} aria-label="Bank">
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => navigate(`/reports/bank-performance?bank=${bank}&from=${from}&to=${to}`)}>
          <Icon name="download" /> Performance PDF
        </button>
      </div>

      <div className="stats stats-4">
        <Stat label="Cases" value={overall.total} icon="folder" foot={`${overall.closed} closed · ${overall.open} open`} />
        <Stat label="Within TAT" value={overall.tatPct == null ? '—' : `${overall.tatPct}%`} tone="green" icon="clock" foot={`${overall.tatMet} of ${overall.tatMet + overall.late} due cases`} />
        <Stat label="Out of TAT" value={overall.late} tone="red" icon="alert" foot={`${overall.lateNoReason} without a reason`} />
        <Stat label="Avg turnaround" value={dur(overall.avgTurnaroundMs)} tone="ink" icon="activity" foot="Case created → last submission" />
      </div>

      <div className="grid-2 chart-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Outcome of closed cases</h2>
              <p>{overall.closed} closed in this period</p>
            </div>
          </div>
          <Donut data={outcomeSlices(overall.outcomes)} sub="closed" />
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>TAT by bank</h2>
              <p>Cases finished in time vs. out of TAT (finished late or still overdue)</p>
            </div>
          </div>
          <BarRows
            series={TAT_SERIES}
            rows={per
              .filter(({ s }) => s.tatMet + s.late > 0)
              .sort((a, z) => z.s.late - a.s.late)
              .map(({ b, s }) => ({ key: b.id, label: b.code, sub: `${s.tatPct == null ? '—' : `${s.tatPct}%`} within`, values: { onTime: s.tatMet, late: s.late } }))}
          />
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Out of TAT cases — reasons</h2>
            <p>Write why each case went beyond its TAT. Reasons print on the performance PDF.</p>
          </div>
          <label className="check">
            <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
            <span>Only without a reason</span>
          </label>
        </div>
        {late.length === 0 ? (
          <Empty icon="checkCircle" title={onlyMissing ? 'Every late case has a reason' : 'No out of TAT cases'} text="Nothing to explain in this period." />
        ) : (
          <ul className="late-list">
            {late.map(({ c, tat }) => (
              <li key={c.id}>
                <div className="late-case">
                  <Link to={`/cases/${c.id}`} className="mono strong">{c.caseNo}</Link>
                  <strong>{c.customerName}</strong>
                  <span className="bank-code">{bankById[c.bankId]?.code}</span>
                  <div className="chips">
                    {c.legs.map((l) => (
                      <TypeChip key={l.id} type={l.type} />
                    ))}
                  </div>
                  <TatBadge c={c} tat={tat} />
                </div>
                <TatReason c={c} compact />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="card table-card">
        <div className="table-wrap">
          <table className="table bank-perf-table">
            <thead>
              <tr className="group-row">
                <th colSpan={7} />
                <th colSpan={OUTCOMES.length} className="outcome-group">Outcome of closed cases</th>
              </tr>
              <tr>
                <th>Bank</th>
                <th className="num">Cases</th>
                <th className="num">Closed</th>
                <th className="num">Open</th>
                <th className="num">Out of TAT</th>
                <th>Within TAT</th>
                <th className="num" title="Average turnaround: case created → last submission">Avg time</th>
                {OUTCOMES.map((o, i) => (
                  <th key={o.key} className={`num outcome-col ${i === 0 ? 'first' : ''}`}>
                    <span className={`outcome-dot tone-${o.tone}`} />
                    {OUTCOME_HEAD[o.key] || o.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {per.map(({ b, s }) => (
                <tr key={b.id}>
                  <td>
                    <div className="bank-cell">
                      <span className="bank-code">{b.code}</span>
                      {b.name}
                    </div>
                  </td>
                  <td className="num strong">{s.total}</td>
                  <td className="num">{s.closed}</td>
                  <td className="num">{s.open}</td>
                  <td className="num">{s.late ? <span className="txt-red strong">{s.late}</span> : 0}</td>
                  <td><Meter pct={s.tatPct} /></td>
                  <td className="num">{dur(s.avgTurnaroundMs)}</td>
                  {OUTCOMES.map((o, i) => {
                    const v = s.outcomes[o.key] || 0;
                    return (
                      <td key={o.key} className={`num outcome-col ${i === 0 ? 'first' : ''} ${v ? 'strong' : 'zero'}`}>
                        {v}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {per.length > 1 && (
              <tfoot>
                <tr>
                  <td className="strong">All banks</td>
                  <td className="num strong">{overall.total}</td>
                  <td className="num strong">{overall.closed}</td>
                  <td className="num strong">{overall.open}</td>
                  <td className="num strong">{overall.late}</td>
                  <td><Meter pct={overall.tatPct} /></td>
                  <td className="num strong">{dur(overall.avgTurnaroundMs)}</td>
                  {OUTCOMES.map((o, i) => (
                    <td key={o.key} className={`num outcome-col strong ${i === 0 ? 'first' : ''}`}>
                      {overall.outcomes[o.key] || 0}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}

const OUTCOME_HEAD = { POSITIVE: 'Positive', NEGATIVE: 'Negative', RISK_ALERT: 'Risk', CNV: 'CNV', REFER_TO_CREDIT: 'Refer' };

function Meter({ pct }) {
  if (pct == null) return <span className="muted">—</span>;
  return (
    <div className="meter">
      <div className="meter-track">
        <div style={{ width: `${pct}%` }} className={pct < 80 ? 'low' : ''} />
      </div>
      <span>{pct}%</span>
    </div>
  );
}

/* ---------------- Field executive performance (Field Officer Performance Review template) ---------------- */
function ExecutivePerformance({ from, to, setFrom, setTo }) {
  const { user } = useAuth();
  const { cases, executives, ols, logins } = useData();
  const navigate = useNavigate();
  const params = new URLSearchParams(useLocation().search);
  const [execId, setExecId] = useState(params.get('id') || '');
  const [picked, setPicked] = useState('');
  const scoped = useMemo(() => cases.filter((c) => inRange(c, from, to)), [cases, from, to]);
  const scopedLogins = useMemo(() => logins.filter((s) => s.loginAt.slice(0, 10) >= from && s.loginAt.slice(0, 10) <= to), [logins, from, to]);
  const team = useMemo(() => executives.map((e) => fieldOfficerReview(e, scoped)).sort((a, z) => z.handled - a.handled), [executives, scoped]);
  const extra = useMemo(() => Object.fromEntries(executiveStats(executives, scoped, scopedLogins).map((r) => [r.exec.id, r])), [executives, scoped, scopedLogins]);
  const sel = team.find((r) => r.exec.id === execId);
  const t = team.reduce((a, r) => ({ handled: a.handled + r.handled, closed: a.closed + r.closed, within: a.within + r.within, out: a.out + r.out }), { handled: 0, closed: 0, within: 0, out: 0 });
  const managerName = sel ? managerOf(sel.exec, ols, user) : '';
  const choose = (id) => {
    setExecId(id);
    setPicked('');
  };

  return (
    <>
      <div className="filters card">
        <select value={execId} onChange={(e) => choose(e.target.value)} aria-label="Executive">
          <option value="">Whole team</option>
          {executives.map((e) => (
            <option key={e.id} value={e.id}>{e.name} · {e.employeeId}</option>
          ))}
        </select>
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <span className="spacer" />
        {sel && (
          <button className="btn btn-primary" onClick={() => navigate(`/reports/field-officer-review?id=${execId}&from=${from}&to=${to}`)}>
            <Icon name="download" /> Field officer review PDF
          </button>
        )}
      </div>

      {!sel ? (
        <>
          <div className="stats stats-4">
            <Stat label="Cases handled" value={t.handled} icon="folder" foot="Verifications assigned in period" />
            <Stat label="Cases closed" value={t.closed} tone="ink" icon="checkCircle" foot={`${fmt1(pctOf(t.closed, t.handled))} of handled`} />
            <Stat label="Closed within TAT" value={t.within} tone="green" icon="clock" foot={`${fmt1(pctOf(t.within, t.closed))} of closed`} />
            <Stat label="Out of TAT" value={t.out} tone="red" icon="alert" foot={`${fmt1(pctOf(t.out, t.closed))} of closed`} />
          </div>
          <section className="card">
            <div className="card-head">
              <div>
                <h2>Closed within vs out of TAT, by executive</h2>
                <p>Select an executive below for the full field officer review</p>
              </div>
            </div>
            <BarRows
              series={FO_TAT_SERIES}
              rows={team.filter((r) => r.closed).map((r) => ({ key: r.exec.id, label: r.exec.name, sub: `${fmt1(pctOf(r.within, r.closed))} within`, values: { within: r.within, out: r.out } }))}
            />
          </section>
          <div className="card table-card">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Executive</th>
                    <th className="num">Handled</th>
                    <th className="num">Closed</th>
                    <th className="num">Within TAT</th>
                    <th className="num">Out of TAT</th>
                    <th>Within-TAT rate</th>
                    <th className="num">Positive</th>
                    <th className="num">Risk Alert</th>
                    <th className="num">Negative</th>
                    <th className="num">Rating</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {team.map((r) => {
                    const n = (k) => r.outcomes.find((o) => o.key === k)?.count || 0;
                    const x = extra[r.exec.id];
                    return (
                      <tr key={r.exec.id} className="row-link" onClick={() => choose(r.exec.id)}>
                        <td>
                          <div className="person-cell">
                            <Avatar name={r.exec.name} photo={r.exec.photo} size={30} />
                            <div>
                              <strong>{r.exec.name}</strong>
                              <div className="muted small">{r.exec.employeeId} · {r.exec.location}</div>
                            </div>
                          </div>
                        </td>
                        <td className="num strong">{r.handled}</td>
                        <td className="num">{r.closed}</td>
                        <td className="num">{r.within}</td>
                        <td className="num">{r.out ? <span className="txt-red strong">{r.out}</span> : 0}</td>
                        <td><Meter pct={r.closed ? Math.round(pctOf(r.within, r.closed)) : null} /></td>
                        <td className="num">{n('POSITIVE')}</td>
                        <td className="num">{n('RISK_ALERT')}</td>
                        <td className="num">{n('NEGATIVE')}</td>
                        <td className="num">{x?.rating == null ? '—' : `${x.rating.toFixed(1)} ★`}</td>
                        <td className="num"><Icon name="chevronRight" size={16} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="card rv-card">
            <div className="card-head">
              <div>
                <h2>Field officer performance review</h2>
                <p>{sel.exec.name} · {fmtDate(from)} – {fmtDate(to)}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => choose('')}>
                <Icon name="chevronLeft" size={15} /> Whole team
              </button>
            </div>
            <FoHeader r={sel} managerName={managerName} period={`${fmtDate(from)} – ${fmtDate(to)}`} />
            <FoKpis r={sel} />
            <FoTatTable r={sel} />
          </section>
          <section className="card rv-card">
            <div className="card-head">
              <div>
                <h2>Status outcome</h2>
                <p>Click a status to see its case IDs</p>
              </div>
            </div>
            <FoOutcomes r={sel} picked={picked} onPick={(k) => setPicked(picked === k ? '' : k)} />
            {picked && <DrillDown r={sel} status={picked} />}
          </section>
        </>
      )}
    </>
  );
}

const FO_TAT_SERIES = [
  { key: 'within', label: 'Closed within TAT', color: TAT_COLORS.onTime },
  { key: 'out', label: 'Closed out of TAT', color: TAT_COLORS.late },
];

export function managerOf(exec, ols, user) {
  if (exec.reportingManagerName) return exec.reportingManagerName;
  if (!exec.reportingManagerId) return '';
  return ols.find((o) => o.id === exec.reportingManagerId)?.name || (exec.reportingManagerId === user.id ? user.name : '');
}

function DrillDown({ r, status }) {
  const { bankById } = useData();
  const rows = r.items.filter(({ c }) => (status === 'PENDING' ? !c.outcome : c.outcome === status));
  return (
    <div className="table-wrap rv-drill">
      <table className="table">
        <thead>
          <tr>
            <th>Case</th>
            <th>Customer</th>
            <th>Bank</th>
            <th>Verification</th>
            <th>TAT</th>
            <th>Submitted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ c, l }) => (
            <tr key={l.id}>
              <td><Link to={`/cases/${c.id}`} className="mono strong">{c.caseNo}</Link></td>
              <td>{c.customerName}</td>
              <td><span className="bank-code">{bankById[c.bankId]?.code}</span></td>
              <td><TypeChip type={l.type} /></td>
              <td>{c.tatType === 'OGL' ? 'OGL 24 h' : 'Local 8 h'}</td>
              <td className="small">{l.submittedAt ? fmtDate(l.submittedAt) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Operational lead performance (Back-End Performance Review template) ---------------- */
function OlPerformance({ from, to, setFrom, setTo }) {
  const { user, isAdmin } = useAuth();
  const { cases, ols, bankById } = useData();
  const navigate = useNavigate();
  const [personId, setPersonId] = useState(isAdmin ? '' : user.id);
  const people = useMemo(() => caseActors(cases, ols), [cases, ols]);
  // An OL sees only their own back-end performance; the admin can pick anyone or the whole office.
  const who = isAdmin ? personId : user.id;
  const scoped = useMemo(() => casesHandledBy(cases.filter((c) => inRange(c, from, to)), who), [cases, from, to, who]);
  const review = useMemo(() => backendReview(scoped, bankById), [scoped, bankById]);
  const name = who ? people.find((p) => p.id === who)?.name || user.name : 'All back-end';

  return (
    <>
      <div className="filters card">
        {isAdmin && (
          <select value={personId} onChange={(e) => setPersonId(e.target.value)} aria-label="Operational lead">
            <option value="">All back-end</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.role === 'ADMIN' ? ' (Admin)' : ''}</option>
            ))}
          </select>
        )}
        <DateRange from={from} to={to} setFrom={setFrom} setTo={setTo} />
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => navigate(`/reports/backend-review?person=${who}&from=${from}&to=${to}`)}>
          <Icon name="download" /> Back-end review PDF
        </button>
      </div>
      <p className="muted small rv-scope">
        {name}: cases {who ? 'they created or gave the final status to' : 'created in the period'}, {fmtDate(from)} – {fmtDate(to)}.
      </p>
      {who && people.find((p) => p.id === who)?.role !== 'ADMIN' && (
        <section className="card rv-card">
          <AttendanceStrip personId={who} from={from} to={to} title="Attendance in this period" />
        </section>
      )}
      <section className="card rv-card">
        <div className="card-head">
          <div>
            <h2>Back-end performance</h2>
            <p>Bank-wise closure and TAT snapshot</p>
          </div>
        </div>
        <BackendSnapshot review={review} />
      </section>
      <section className="card rv-card">
        <div className="card-head">
          <div>
            <h2>Status insights</h2>
            <p>Positive, Risk Alert and Negative by bank</p>
          </div>
        </div>
        <BackendStatus review={review} />
      </section>
      <section className="card rv-card">
        <div className="card-head">
          <div>
            <h2>Overall performance</h2>
            <p>The improvement and appreciation text can be edited on the PDF page before printing</p>
          </div>
        </div>
        <BackendOverall review={review} text={DEFAULT_BACKEND_TEXT} editable={false} />
      </section>
    </>
  );
}

/* ---------------- Final case reports ---------------- */
function CaseReports() {
  const { cases, banks, bankById } = useData();
  const [bank, setBank] = useState('');
  const [q, setQ] = useState('');
  const closed = cases
    .filter((c) => c.outcome && (!bank || c.bankId === bank) && `${c.caseNo} ${c.customerName}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.outcomeAt.localeCompare(a.outcomeAt));
  return (
    <>
      <div className="filters card">
        <div className="input-icon search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search case ID or customer" />
        </div>
        <select value={bank} onChange={(e) => setBank(e.target.value)} aria-label="Bank">
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </div>
      <div className="card table-card">
        {closed.length === 0 ? (
          <Empty icon="report" title="No final reports yet" text="Reports appear here once a case has its final status." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Customer</th>
                  <th>Bank</th>
                  <th>Verifications</th>
                  <th>Outcome</th>
                  <th>Closed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {closed.map((c) => {
                  const o = OUTCOMES.find((x) => x.key === c.outcome);
                  return (
                    <tr key={c.id}>
                      <td className="mono strong">{c.caseNo}</td>
                      <td>{c.customerName}</td>
                      <td><span className="bank-code">{bankById[c.bankId]?.code}</span></td>
                      <td>
                        <div className="chips">
                          {c.legs.map((l) => <TypeChip key={l.id} type={l.type} />)}
                        </div>
                      </td>
                      <td><Pill tone={o.tone}>{o.label}</Pill></td>
                      <td className="small">{fmtDate(c.outcomeAt)}</td>
                      <td className="num">
                        <Link className="btn btn-ghost btn-sm" to={`/cases/${c.id}/report`}>
                          <Icon name="report" size={15} /> Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

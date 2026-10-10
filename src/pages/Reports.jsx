import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/AppContext';
import { Empty, PageHeader, Pill, Segmented, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import { OUTCOMES } from '../config/verification';
import { bankStats, inRange, monthStartISO } from '../utils/stats';
import { fmtDate, todayISO } from '../utils/format';
import { fmtDuration } from '../utils/tat';

export default function Reports() {
  const [tab, setTab] = useState('performance');
  return (
    <div className="page">
      <PageHeader title="Reports" subtitle="Bank-wise performance PDFs and final case reports for handover" />
      <div className="toolbar">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'performance', label: 'Bank performance' },
            { value: 'cases', label: 'Case reports' },
          ]}
        />
      </div>
      {tab === 'performance' ? <Performance /> : <CaseReports />}
    </div>
  );
}

function Performance() {
  const { cases, banks } = useData();
  const navigate = useNavigate();
  const [bank, setBank] = useState('');
  const [from, setFrom] = useState(monthStartISO());
  const [to, setTo] = useState(todayISO());

  const shown = bank ? banks.filter((b) => b.id === bank) : banks;
  const stats = useMemo(
    () => shown.map((b) => ({ b, s: bankStats(cases.filter((c) => c.bankId === b.id && inRange(c, from, to))) })),
    [cases, shown, from, to],
  );

  const openPdf = () => navigate(`/reports/bank-performance?bank=${bank}&from=${from}&to=${to}`);

  return (
    <>
      <div className="filters card">
        <select value={bank} onChange={(e) => setBank(e.target.value)} aria-label="Bank">
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <div className="date-range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        </div>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={openPdf}>
          <Icon name="download" /> Performance PDF
        </button>
      </div>

      <div className="card table-card">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bank</th>
                <th className="num">Cases</th>
                <th className="num">Closed</th>
                <th className="num">Open</th>
                <th className="num">Out of TAT</th>
                <th>Within TAT</th>
                <th className="num">Avg turnaround</th>
                {OUTCOMES.map((o) => (
                  <th key={o.key} className="num">{o.short}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.map(({ b, s }) => (
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
                  <td className="num">{s.outOfTat ? <span className="txt-red strong">{s.outOfTat}</span> : 0}</td>
                  <td>
                    {s.tatPct == null ? (
                      <span className="muted">—</span>
                    ) : (
                      <div className="meter">
                        <div className="meter-track">
                          <div style={{ width: `${s.tatPct}%` }} className={s.tatPct < 80 ? 'low' : ''} />
                        </div>
                        <span>{s.tatPct}%</span>
                      </div>
                    )}
                  </td>
                  <td className="num">{s.avgTurnaroundMs ? fmtDuration(s.avgTurnaroundMs) : '—'}</td>
                  {OUTCOMES.map((o) => (
                    <td key={o.key} className="num">{s.outcomes[o.key] || ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

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

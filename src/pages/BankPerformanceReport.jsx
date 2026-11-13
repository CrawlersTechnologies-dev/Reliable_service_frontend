import { Link, useLocation } from 'react-router-dom';
import { useData } from '../context/AppContext';
import { Logo } from '../components/ui';
import Icon from '../components/Icon';
import { AGENCY, OUTCOMES, TYPE_LIST } from '../config/verification';
import { OUTCOME_COLORS, OUTCOME_ORDER, TAT_COLORS, bankStats, inRange } from '../utils/stats';
import { BarRows, Donut } from '../components/Charts';
import { fmtDate, fmtDateTime, fmtLongDate } from '../utils/format';
import { fmtDuration } from '../utils/tat';
import WordButton from '../components/WordButton';

export default function BankPerformanceReport() {
  const { cases, banks, execById } = useData();
  const p = new URLSearchParams(useLocation().search);
  const bankId = p.get('bank') || '';
  const from = p.get('from') || '';
  const to = p.get('to') || '';
  const list = bankId ? banks.filter((b) => b.id === bankId) : banks;
  const scoped = cases.filter((c) => (!bankId || c.bankId === bankId) && inRange(c, from, to));
  const overall = bankStats(scoped);
  const per = list.map((b) => ({ b, s: bankStats(scoped.filter((c) => c.bankId === b.id)) }));
  const title = bankId ? list[0]?.name : 'All banks';

  return (
    <div className="report-shell">
      <div className="report-toolbar no-print">
        <Link to="/reports" className="btn btn-ghost">
          <Icon name="chevronLeft" /> Reports
        </Link>
        <span />
        <WordButton filename={`Bank_performance_${(title || 'all').replace(/\W+/g, '_')}_${from || 'start'}_${to || 'today'}.docx`} />
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
          <h1 className="r-title">Bank Performance Report</h1>
          <p className="r-sub">
            {title} · {from ? fmtLongDate(from) : 'Start'} – {to ? fmtLongDate(to) : 'Today'} · generated {fmtDateTime(new Date())}
          </p>

          <div className="r-kpis">
            <div><span>Total cases</span><strong>{overall.total}</strong></div>
            <div><span>Closed</span><strong>{overall.closed}</strong></div>
            <div><span>Within TAT</span><strong>{overall.tatPct == null ? '—' : `${overall.tatPct}%`}</strong></div>
            <div><span>Avg turnaround</span><strong>{overall.avgTurnaroundMs ? fmtDuration(overall.avgTurnaroundMs) : '—'}</strong></div>
            <div className="bad"><span>Out of TAT (open)</span><strong>{overall.outOfTat}</strong></div>
          </div>

          <div className="r-charts">
            <div>
              <div className="r-chart-title">Outcome of closed cases</div>
              <Donut
                size={150}
                thickness={24}
                sub="closed"
                data={OUTCOME_ORDER.map((k) => ({ key: k, label: OUTCOMES.find((o) => o.key === k).label, value: overall.outcomes[k] || 0, color: OUTCOME_COLORS[k] }))}
              />
            </div>
            <div>
              <div className="r-chart-title">{bankId ? 'Within TAT vs out of TAT' : 'TAT by bank'}</div>
              <BarRows
                series={[
                  { key: 'onTime', label: 'Within TAT', color: TAT_COLORS.onTime },
                  { key: 'late', label: 'Out of TAT', color: TAT_COLORS.late },
                ]}
                rows={per
                  .filter(({ s }) => s.tatMet + s.late > 0)
                  .map(({ b, s }) => ({ key: b.id, label: b.code, values: { onTime: s.tatMet, late: s.late } }))}
              />
            </div>
          </div>

          <div className="r-bar">Outcome summary</div>
          <table className="r-table">
            <thead>
              <tr>
                {!bankId && <th>Bank</th>}
                <th>Cases</th>
                {OUTCOMES.map((o) => <th key={o.key}>{o.label}</th>)}
                <th>Open</th>
                <th>TAT met / missed</th>
              </tr>
            </thead>
            <tbody>
              {(bankId ? per.slice(0, 1) : per).map(({ b, s }) => (
                <tr key={b.id}>
                  {!bankId && <td>{b.name}</td>}
                  <td>{s.total}</td>
                  {OUTCOMES.map((o) => <td key={o.key}>{s.outcomes[o.key] || 0}</td>)}
                  <td>{s.open}</td>
                  <td>{s.tatMet} / {s.tatMissed}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="r-bar">Verification mix</div>
          <table className="r-table">
            <thead>
              <tr>{TYPE_LIST.map((t) => <th key={t.key}>{t.label}</th>)}</tr>
            </thead>
            <tbody>
              <tr>{TYPE_LIST.map((t) => <td key={t.key}>{overall.byType[t.key]}</td>)}</tr>
            </tbody>
          </table>

          <div className="r-bar">Delay reasons — out of TAT cases</div>
          {(() => {
            const late = overall.rows
              .filter(({ tat }) => tat.state === 'MISSED' || tat.state === 'OUT_OF_TAT')
              .sort((a, b) => a.c.createdAt.localeCompare(b.c.createdAt));
            if (!late.length) return <p className="r-note">No case went beyond its TAT in this period.</p>;
            return (
              <table className="r-table r-dense">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Date</th>
                    {!bankId && <th>Bank</th>}
                    <th>Customer</th>
                    <th>Executive</th>
                    <th>Delay</th>
                    <th>Reason for delay</th>
                  </tr>
                </thead>
                <tbody>
                  {late.map(({ c, tat }) => (
                    <tr key={c.id}>
                      <td>{c.caseNo}</td>
                      <td>{fmtDate(c.createdAt)}</td>
                      {!bankId && <td>{banks.find((b) => b.id === c.bankId)?.code}</td>}
                      <td>{c.customerName}</td>
                      <td>{c.legs.map((l) => (l.internal ? 'Internal' : execById[l.executiveId]?.name)).filter(Boolean).join(', ')}</td>
                      <td className="txt-red">+{fmtDuration(tat.overdue)}{tat.state === 'OUT_OF_TAT' ? ' (open)' : ''}</td>
                      <td className={c.tatReason ? '' : 'txt-red'}>{c.tatReason?.text || 'Reason not updated yet'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
          {scoped.some((c) => c.holidays?.length) && (
            <p className="r-note">
              Holiday-adjusted cases (TAT extended after confirming with the client):{' '}
              {scoped
                .filter((c) => c.holidays?.length)
                .map((c) => `${c.caseNo} (${c.holidays.map((h) => `${fmtDate(h.date)}${h.note ? ` – ${h.note}` : ''}`).join(', ')})`)
                .join('; ')}
            </p>
          )}
          <div className="r-reviewed">
            Report reviewed by: {AGENCY.reviewer} ({AGENCY.reviewerTitle})
          </div>
          <div className="r-foot">
            <span>{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</span>
            <span>Bank performance</span>
          </div>
        </section>
      </div>
    </div>
  );
}

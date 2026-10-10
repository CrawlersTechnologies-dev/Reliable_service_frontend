import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useData, useNow } from '../context/AppContext';
import { Empty, PageHeader, Pill, Segmented, TatBadge, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import { OUTCOMES, TAT_TYPES, TYPE_LIST } from '../config/verification';
import { CASE_STATUS, caseStatus, caseTat } from '../utils/tat';
import { fmtDate, fmtTime } from '../utils/format';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'in-tat', label: 'In process' },
  { value: 'out-of-tat', label: 'Pending · out of TAT' },
  { value: 'qa', label: 'QA pending' },
  { value: 'closed', label: 'Closed' },
];

const matchTab = (tab, x) =>
  tab === 'all' ||
  (tab === 'in-tat' && x.tat.state === 'IN_TAT') ||
  (tab === 'out-of-tat' && x.tat.state === 'OUT_OF_TAT') ||
  (tab === 'qa' && x.status === 'QA_PENDING') ||
  (tab === 'closed' && x.status === 'CLOSED');

export default function Cases() {
  const { cases, banks, bankById, executives, execById } = useData();
  const now = useNow();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);

  const [tab, setTab] = useState(params.get('tab') || 'all');
  const [f, setF] = useState({ q: '', bank: params.get('bank') || '', type: '', exec: '', tatType: '', outcome: '', from: '', to: '' });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const activeFilters = Object.entries(f).filter(([k, v]) => k !== 'q' && v).length;

  const rows = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    return cases
      .map((c) => ({ c, tat: caseTat(c, now), status: caseStatus(c) }))
      .filter(({ c }) => {
        if (q && !`${c.caseNo} ${c.customerName} ${c.product}`.toLowerCase().includes(q)) return false;
        if (f.bank && c.bankId !== f.bank) return false;
        if (f.type && !c.legs.some((l) => l.type === f.type)) return false;
        if (f.exec && !c.legs.some((l) => l.executiveId === f.exec)) return false;
        if (f.tatType && c.tatType !== f.tatType) return false;
        if (f.outcome && c.outcome !== f.outcome) return false;
        if (f.from && c.createdAt.slice(0, 10) < f.from) return false;
        if (f.to && c.createdAt.slice(0, 10) > f.to) return false;
        return true;
      });
  }, [cases, f, now]);

  const counts = Object.fromEntries(TABS.map((t) => [t.value, rows.filter((x) => matchTab(t.value, x)).length]));
  const visible = rows
    .filter((x) => matchTab(tab, x))
    .sort((a, b) => {
      // overdue first (most overdue on top), then newest
      if (a.tat.state === 'OUT_OF_TAT' && b.tat.state !== 'OUT_OF_TAT') return -1;
      if (b.tat.state === 'OUT_OF_TAT' && a.tat.state !== 'OUT_OF_TAT') return 1;
      if (a.tat.state === 'OUT_OF_TAT') return b.tat.overdue - a.tat.overdue;
      return b.c.createdAt.localeCompare(a.c.createdAt);
    });

  function exportCsv() {
    const head = ['Case ID', 'Created', 'Bank', 'Customer', 'Product', 'Verifications', 'Executives', 'TAT', 'TAT status', 'Case status', 'Outcome'];
    const lines = visible.map(({ c, tat, status }) => [
      c.caseNo, new Date(c.createdAt).toLocaleString('en-IN'), bankById[c.bankId]?.name, c.customerName, c.product,
      c.legs.map((l) => l.type).join(' + '), c.legs.map((l) => execById[l.executiveId]?.name).join(' + '),
      c.tatType, tat.state, CASE_STATUS[status].label, c.outcome || '',
    ]);
    const csv = [head, ...lines].map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `cases-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="page">
      <PageHeader
        title="Cases"
        subtitle="In process = within TAT · Pending = crossed TAT (red, counting extra time)"
        actions={
          <>
            <button className="btn btn-ghost" onClick={exportCsv}>
              <Icon name="download" /> Export CSV
            </button>
            <Link className="btn btn-primary" to="/cases/new">
              <Icon name="plus" /> New case
            </Link>
          </>
        }
      />

      <div className="toolbar">
        <Segmented value={tab} onChange={setTab} options={TABS.map((t) => ({ ...t, count: counts[t.value] }))} />
      </div>

      <div className="filters card">
        <div className="input-icon search">
          <Icon name="search" size={16} />
          <input value={f.q} onChange={set('q')} placeholder="Search case ID, customer, product" />
        </div>
        <select value={f.bank} onChange={set('bank')} aria-label="Bank">
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <select value={f.type} onChange={set('type')} aria-label="Verification type">
          <option value="">All types</option>
          {TYPE_LIST.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <select value={f.exec} onChange={set('exec')} aria-label="Executive">
          <option value="">All executives</option>
          {executives.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select value={f.tatType} onChange={set('tatType')} aria-label="TAT type">
          <option value="">Local + OGL</option>
          {Object.values(TAT_TYPES).map((t) => (
            <option key={t.key} value={t.key}>{t.label} ({t.hours}h)</option>
          ))}
        </select>
        <select value={f.outcome} onChange={set('outcome')} aria-label="Outcome">
          <option value="">Any outcome</option>
          {OUTCOMES.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
        <div className="date-range">
          <input type="date" value={f.from} onChange={set('from')} aria-label="From date" />
          <span>to</span>
          <input type="date" value={f.to} onChange={set('to')} aria-label="To date" />
        </div>
        {activeFilters > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={() => setF({ q: f.q, bank: '', type: '', exec: '', tatType: '', outcome: '', from: '', to: '' })}>
            <Icon name="x" size={14} /> Clear {activeFilters}
          </button>
        )}
      </div>

      <div className="card table-card">
        {visible.length === 0 ? (
          <Empty icon="search" title="No cases match" text="Try another tab or clear the filters." />
        ) : (
          <div className="table-wrap">
            <table className="table cases-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Customer</th>
                  <th>Bank</th>
                  <th>Verifications</th>
                  <th>Executive</th>
                  <th>TAT</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map(({ c, tat, status }) => {
                  const outcome = OUTCOMES.find((o) => o.key === c.outcome);
                  return (
                    <tr key={c.id} className={`row-link ${tat.state === 'OUT_OF_TAT' ? 'row-late' : ''}`} onClick={() => navigate(`/cases/${c.id}`)}>
                      <td>
                        <Link to={`/cases/${c.id}`} className="mono strong" onClick={(e) => e.stopPropagation()}>
                          {c.caseNo}
                        </Link>
                        <div className="muted small">
                          {fmtDate(c.createdAt)} · {fmtTime(c.createdAt)}
                        </div>
                      </td>
                      <td>
                        <strong>{c.customerName}</strong>
                        <div className="muted small">{c.product}</div>
                      </td>
                      <td>
                        <span className="bank-code">{bankById[c.bankId]?.code}</span>
                      </td>
                      <td>
                        <div className="chips">
                          {c.legs.map((l) => (
                            <TypeChip key={l.id} type={l.type} />
                          ))}
                        </div>
                        {c.legs.length > 1 && <div className="muted small">Combined · one report</div>}
                      </td>
                      <td className="small">
                        {c.legs.map((l) => (
                          <div key={l.id}>{execById[l.executiveId]?.name || '—'}</div>
                        ))}
                      </td>
                      <td>
                        <div className="muted small">{TAT_TYPES[c.tatType].label} · {TAT_TYPES[c.tatType].hours}h</div>
                        <TatBadge c={c} tat={tat} />
                      </td>
                      <td>
                        {outcome ? <Pill tone={outcome.tone}>{outcome.label}</Pill> : <Pill tone={CASE_STATUS[status].tone}>{CASE_STATUS[status].label}</Pill>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

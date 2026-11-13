import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import * as api from '../api';
import { useData } from '../context/AppContext';
import Icon from '../components/Icon';
import { AGENCY } from '../config/verification';
import WordButton from '../components/WordButton';

// "Daily Sampler Visit Summary" — one page per sampler + bank + branch, date-wise register
// (client format). ?from=&to=&samplerId=&bankId=
const fmtDay = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).replace(' ', '-');
const fmtD = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const n = (v) => v.toLocaleString('en-IN');

function daysBetween(from, to) {
  const out = [];
  const d = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  while (d <= end && out.length < 62) {
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

function periodLabel(from, to) {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  const lastDay = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
  const wholeMonth = a.getDate() === 1 && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear() && b.getDate() === lastDay;
  const month = a.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toUpperCase();
  return {
    banner: wholeMonth ? `MONTHLY REPORT • ${month}` : `SAMPLING REPORT • ${fmtD(from).toUpperCase()} – ${fmtD(to).toUpperCase()}`,
    period: `${String(a.getDate()).padStart(2, '0')}–${String(b.getDate()).padStart(2, '0')} ${b.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`.toUpperCase(),
  };
}

export default function SamplingSummaryReport() {
  const { execById, bankById } = useData();
  const p = new URLSearchParams(useLocation().search);
  const from = p.get('from');
  const to = p.get('to');
  const samplerId = p.get('samplerId') || '';
  const bankId = p.get('bankId') || '';
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.sampling
      .list({ from, to, samplerId, bankId })
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [from, to, samplerId, bankId]);

  const groups = useMemo(() => {
    if (!rows) return [];
    const m = new Map();
    rows.forEach((r) => {
      const key = `${r.samplerId}|${r.bankId}|${r.branch.toLowerCase()}`;
      const g = m.get(key) || { key, samplerId: r.samplerId, bankId: r.bankId, branch: r.branch, entries: [] };
      g.entries.push(r);
      m.set(key, g);
    });
    return [...m.values()].sort((a, b) => (execById[a.samplerId]?.name || '').localeCompare(execById[b.samplerId]?.name || ''));
  }, [rows, execById]);

  const days = from && to ? daysBetween(from, to) : [];
  const label = from && to ? periodLabel(from, to) : { banner: '', period: '' };

  return (
    <div className="report-shell">
      <div className="report-toolbar no-print">
        <Link to="/sampling" className="btn btn-ghost">
          <Icon name="chevronLeft" /> Sampling logins
        </Link>
        <span className="toolbar-hint">{groups.length} sampler / branch page{groups.length === 1 ? '' : 's'}</span>
        <WordButton filename={`Sampling_summary_${from}_${to}.docx`} disabled={!groups.length} />
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!groups.length}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>
      <div className="report">
        {error && <p className="txt-red">{error}</p>}
        {rows && !groups.length && (
          <section className="r-page">
            <p className="r-note">No sampling entries in this period.</p>
          </section>
        )}
        {groups.map((g) => {
          const byDate = new Map(g.entries.map((e) => [e.date, e]));
          const sum = (k) => g.entries.reduce((t, e) => t + e[k], 0);
          const products = [...new Set(g.entries.map((e) => e.product).filter(Boolean))].join(', ') || '—';
          const cats = [...new Set(g.entries.map((e) => e.samplerCategory).filter(Boolean))];
          const category = cats.length ? cats.map((c) => `${c} sampler`).join(' / ').toUpperCase() : '—';
          return (
            <section className="r-page ss-page" key={g.key}>
              <div className="ss-head">
                <h1>{AGENCY.name.toUpperCase()}</h1>
                <p>RCU AGENCY | DAILY SAMPLER VISIT SUMMARY</p>
                <div className="ss-banner">{label.banner}</div>
              </div>
              <table className="ss-info">
                <tbody>
                  <tr>
                    <th>Sampler name</th>
                    <th>Sampler category</th>
                    <th>Bank name</th>
                  </tr>
                  <tr>
                    <td>{(execById[g.samplerId]?.name || 'Sampler').toUpperCase()}</td>
                    <td>{category}</td>
                    <td>{(bankById[g.bankId]?.name || '').toUpperCase()}</td>
                  </tr>
                  <tr>
                    <th>Branch name</th>
                    <th>Product</th>
                    <th>Reporting period</th>
                  </tr>
                  <tr>
                    <td>{g.branch.toUpperCase()}</td>
                    <td>{products.toUpperCase()}</td>
                    <td>{label.period}</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="ss-h2">Monthly date-wise register</h2>
              <p className="ss-note">The sampler, category, bank, branch and product appear only in the header. The register contains counts and photo status.</p>
              <table className="ss-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Total logins</th>
                    <th>Total screened</th>
                    <th>Total sampled</th>
                    <th>Total query</th>
                    <th>Photo attached</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((d) => {
                    const e = byDate.get(d);
                    return (
                      <tr key={d}>
                        <td className="ss-date">{fmtDay(d)}</td>
                        <td>{e ? n(e.totalFiles) : '—'}</td>
                        <td>{e ? n(e.totalScreened) : '—'}</td>
                        <td>{e ? n(e.totalSampled) : '—'}</td>
                        <td>{e ? n(e.totalQuery) : '—'}</td>
                        <td className={e ? '' : 'muted'}>{e ? (e.sheetUrl ? 'Yes' : 'No') : 'No visit'}</td>
                      </tr>
                    );
                  })}
                  <tr className="ss-total">
                    <td>MONTH TOTAL</td>
                    <td>{n(sum('totalFiles'))}</td>
                    <td>{n(sum('totalScreened'))}</td>
                    <td>{n(sum('totalSampled'))}</td>
                    <td>{n(sum('totalQuery'))}</td>
                    <td>{g.entries.length} entries</td>
                  </tr>
                </tbody>
              </table>

              <h2 className="ss-h2">Monthly totals</h2>
              <table className="ss-totals">
                <tbody>
                  <tr>
                    <th>Total logins</th>
                    <th>Total screened</th>
                    <th>Total sampled</th>
                    <th>Total query</th>
                  </tr>
                  <tr>
                    <td>{n(sum('totalFiles'))}</td>
                    <td>{n(sum('totalScreened'))}</td>
                    <td>{n(sum('totalSampled'))}</td>
                    <td>{n(sum('totalQuery'))}</td>
                  </tr>
                </tbody>
              </table>
              <p className="ss-rates">
                Screening rate {sum('totalFiles') ? ((sum('totalScreened') / sum('totalFiles')) * 100).toFixed(1) : '0.0'}% · Sampling rate{' '}
                {sum('totalScreened') ? ((sum('totalSampled') / sum('totalScreened')) * 100).toFixed(1) : '0.0'}%
              </p>
              <div className="r-foot">
                <span>{AGENCY.name.toUpperCase()} | {AGENCY.address}</span>
                <span>Generated {new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

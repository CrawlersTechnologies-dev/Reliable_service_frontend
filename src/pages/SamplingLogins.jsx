import { useCallback, useEffect, useMemo, useState } from 'react';
import * as api from '../api';
import { fileUrl } from '../api';
import { useAuth, useData, useToast } from '../context/AppContext';
import { Empty, Field, Modal, PageHeader, Segmented, Stat } from '../components/ui';
import Icon from '../components/Icon';
import { fmtDate, fmtLongDate, todayISO } from '../utils/format';
import { AppLogins } from './AppLogins';
import { useNavigate } from 'react-router-dom';
import { PRODUCTS, SAMPLER_CATEGORIES } from '../config/verification';

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const pct = (a, b) => (b ? (a / b) * 100 : 0);
const fmtPct = (v) => `${v.toFixed(1)}%`;

export default function SamplingLogins() {
  const [tab, setTab] = useState('daily');
  return (
    <div className="page">
      <PageHeader title="Sampling logins" subtitle="Daily bank-branch sampling by each sampler, and executive app logins" />
      <div className="toolbar">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'daily', label: 'Daily sampling' },
            { value: 'app', label: 'App logins' },
          ]}
        />
      </div>
      {tab === 'daily' ? <DailySampling /> : <AppLogins />}
    </div>
  );
}

function DailySampling() {
  const { isAdmin } = useAuth();
  const { executives, execById, banks, bankById } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ from: daysAgo(6), to: todayISO(), samplerId: '', bankId: '' });
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const load = useCallback(() => {
    setError('');
    api.sampling
      .list(f)
      .then(setRows)
      .catch((e) => setError(e.message));
  }, [f]);
  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const t = { files: 0, screened: 0, sampled: 0, query: 0 };
    (rows || []).forEach((r) => {
      t.files += r.totalFiles;
      t.screened += r.totalScreened;
      t.sampled += r.totalSampled;
      t.query += r.totalQuery;
    });
    return t;
  }, [rows]);

  const bySampler = useMemo(() => {
    const m = new Map();
    (rows || []).forEach((r) => {
      const x = m.get(r.samplerId) || { id: r.samplerId, days: new Set(), files: 0, screened: 0, sampled: 0, query: 0 };
      x.days.add(r.date);
      x.files += r.totalFiles;
      x.screened += r.totalScreened;
      x.sampled += r.totalSampled;
      x.query += r.totalQuery;
      m.set(r.samplerId, x);
    });
    return [...m.values()].sort((a, b) => b.files - a.files);
  }, [rows]);

  async function remove(r) {
    if (!window.confirm(`Delete the ${fmtDate(r.date)} entry of ${execById[r.samplerId]?.name} (${r.branch})?`)) return;
    try {
      await api.sampling.remove(r.id);
      toast('Entry deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  }

  return (
    <>
      <div className="filters card">
        <div className="date-range">
          <input type="date" value={f.from} onChange={set('from')} aria-label="From" />
          <span>to</span>
          <input type="date" value={f.to} onChange={set('to')} aria-label="To" />
        </div>
        <select value={f.samplerId} onChange={set('samplerId')} aria-label="Sampler">
          <option value="">All samplers</option>
          {executives.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <select value={f.bankId} onChange={set('bankId')} aria-label="Bank">
          <option value="">All banks</option>
          {banks.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <span className="spacer" />
        <button
          className="btn btn-ghost"
          onClick={() => navigate(`/reports/sampling-summary?from=${f.from}&to=${f.to}&samplerId=${f.samplerId}&bankId=${f.bankId}`)}
          title="Daily Sampler Visit Summary (PDF) for the selected period"
        >
          <Icon name="download" /> Summary report
        </button>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" /> Daily sampling entry
        </button>
      </div>

      {error && <div className="alert alert-red">{error}</div>}

      <div className="stats stats-4">
        <Stat label="Total logins" value={totals.files} icon="file" foot={`${rows?.length ?? 0} entries`} />
        <Stat label="Total screened" value={totals.screened} tone="yellow" icon="search" foot={`Screening rate ${fmtPct(pct(totals.screened, totals.files))}`} />
        <Stat label="Total sampled" value={totals.sampled} tone="green" icon="checkCircle" foot={`Sampling rate ${fmtPct(pct(totals.sampled, totals.screened))} of screened`} />
        <Stat label="Total query" value={totals.query} tone="red" icon="alert" foot={`${fmtPct(pct(totals.query, totals.sampled))} of sampled`} />
      </div>

      {rows === null ? (
        <div className="boot"><div className="spinner" /></div>
      ) : rows.length === 0 ? (
        <div className="card"><Empty icon="activity" title="No sampling entries in this range" text="Samplers submit them from the app, or add one here." /></div>
      ) : (
        <>
          <section className="card table-card">
            <div className="card-head pad">
              <div>
                <h2>By sampler</h2>
                <p>Totals for the selected period</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sampler</th>
                    <th className="num">Days</th>
                    <th className="num">Logins</th>
                    <th className="num">Screened</th>
                    <th className="num">Sampled</th>
                    <th className="num">Query</th>
                    <th>Screening rate</th>
                    <th>Sampling rate</th>
                  </tr>
                </thead>
                <tbody>
                  {bySampler.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <strong>{execById[x.id]?.name || '—'}</strong>
                        <div className="muted small">{execById[x.id]?.employeeId}</div>
                      </td>
                      <td className="num">{x.days.size}</td>
                      <td className="num strong">{x.files}</td>
                      <td className="num">{x.screened}</td>
                      <td className="num">{x.sampled}</td>
                      <td className="num">{x.query}</td>
                      <td><RateBar value={pct(x.screened, x.files)} tone="yellow" /></td>
                      <td><RateBar value={pct(x.sampled, x.screened)} tone="red" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card table-card">
            <div className="card-head pad">
              <div>
                <h2>Daily entries</h2>
                <p>Newest first · click the sheet to open the login sheet image</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Sampler</th>
                    <th>Bank / branch</th>
                    <th className="num">Files</th>
                    <th className="num">Screened</th>
                    <th className="num">Sampled</th>
                    <th className="num">Query</th>
                    <th className="num">Screening</th>
                    <th className="num">Sampling</th>
                    <th>Sheet</th>
                    {isAdmin && <th />}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="small">{fmtDate(r.date)}</td>
                      <td>
                        <strong>{execById[r.samplerId]?.name || '—'}</strong>
                        {r.createdBy && r.createdBy.id !== r.samplerId && <div className="muted small">entered by {r.createdBy.name}</div>}
                      </td>
                      <td>
                        <span className="bank-code">{bankById[r.bankId]?.code}</span>
                        <div className="muted small">{r.branch}{r.product ? ` · ${r.product}` : ''}{r.samplerCategory ? ` · ${r.samplerCategory}` : ''}</div>
                      </td>
                      <td className="num strong">{r.totalFiles}</td>
                      <td className="num">{r.totalScreened}</td>
                      <td className="num">{r.totalSampled}</td>
                      <td className="num">{r.totalQuery}</td>
                      <td className="num">{fmtPct(r.screeningRate)}</td>
                      <td className="num">{fmtPct(r.samplingRate)}</td>
                      <td>
                        <a className="sheet-thumb" href={fileUrl(r.sheetUrl)} target="_blank" rel="noreferrer" title="Open login sheet">
                          <img src={fileUrl(r.sheetUrl)} alt="Login sheet" loading="lazy" />
                        </a>
                      </td>
                      {isAdmin && (
                        <td className="num">
                          <button className="icon-btn" title="Delete entry" onClick={() => remove(r)}>
                            <Icon name="trash" size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {adding && (
        <SamplingForm
          executives={executives.filter((e) => e.status === 'Active')}
          banks={banks.filter((b) => b.status === 'Active')}
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            toast('Daily sampling submitted');
            load();
          }}
        />
      )}
    </>
  );
}

function RateBar({ value, tone }) {
  return (
    <div className={`rate rate-${tone}`}>
      <div className="rate-track">
        <div style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span>{fmtPct(value)}</span>
    </div>
  );
}

const STATS = [
  { key: 'totalFiles', label: 'Total logins', icon: 'file', tone: 'ink' },
  { key: 'totalScreened', label: 'Total screened', icon: 'search', tone: 'ink' },
  { key: 'totalSampled', label: 'Total sampled', icon: 'checkCircle', tone: 'red' },
  { key: 'totalQuery', label: 'Total query', icon: 'alert', tone: 'red' },
];
const MAX_SHEET = 5 * 1024 * 1024;

// "Daily Sampling Entry" — same fields as the sampler's form in the app.
function SamplingForm({ executives, banks, onClose, onSaved }) {
  const [v, setV] = useState({ samplerId: '', samplerCategory: 'Full-time', bankId: '', branch: '', product: '', totalFiles: '', totalScreened: '', totalSampled: '', totalQuery: '', remarks: '' });
  const [sheet, setSheet] = useState(null);
  const [preview, setPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV((s) => ({ ...s, [k]: e.target.value }));
  const n = (k) => (v[k] === '' ? 0 : Number(v[k]));
  const screening = pct(n('totalScreened'), n('totalFiles'));
  const sampling = pct(n('totalSampled'), n('totalScreened'));

  function pick(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png)$/.test(file.type)) return setErrors((e) => ({ ...e, sheet: 'Only JPG or PNG images' }));
    if (file.size > MAX_SHEET) return setErrors((e) => ({ ...e, sheet: 'Image is larger than 5 MB' }));
    setErrors((e) => ({ ...e, sheet: '' }));
    setSheet(file);
    setPreview(URL.createObjectURL(file));
  }

  function validate() {
    const e = {};
    if (!v.samplerId) e.samplerId = 'Choose the sampler';
    if (!v.bankId) e.bankId = 'Choose the bank';
    if (v.branch.trim().length < 2) e.branch = 'Enter the branch name';
    STATS.forEach((s) => {
      if (v[s.key] === '' || !/^\d+$/.test(v[s.key])) e[s.key] = 'Whole number';
    });
    if (!v.samplerCategory) e.samplerCategory = 'Choose full-time or part-time';
    if (!e.totalScreened && n('totalScreened') > n('totalFiles')) e.totalScreened = 'More than total logins';
    if (!e.totalSampled && n('totalSampled') > n('totalScreened')) e.totalSampled = 'More than screened';
    if (!e.totalQuery && n('totalQuery') > n('totalFiles')) e.totalQuery = 'More than total logins';
    if (!sheet) e.sheet = 'Login sheet image is mandatory';
    setErrors(e);
    return !Object.values(e).some(Boolean);
  }

  async function submit() {
    if (!validate()) return;
    setBusy(true);
    try {
      await api.sampling.create(v, sheet);
      onSaved();
    } catch (e) {
      setErrors((x) => ({ ...x, form: e.message }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      width={720}
      title="Daily sampling entry"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={submit}>
            <Icon name="check" size={16} /> {busy ? 'Submitting…' : 'Submit daily sampling'}
          </button>
        </>
      }
    >
      <div className="sampling-form">
        <div className="sf-date">
          <Icon name="calendar" size={18} /> Visit date: <strong>{fmtLongDate(todayISO())}</strong> <em>auto</em>
        </div>

        <div className="form-grid">
          <Field label="Sampler name" required error={errors.samplerId}>
            <select value={v.samplerId} onChange={set('samplerId')}>
              <option value="">Choose sampler</option>
              {executives.map((e) => (
                <option key={e.id} value={e.id}>{e.name} — {e.location}</option>
              ))}
            </select>
          </Field>
          <Field label="Bank name" required error={errors.bankId}>
            <select value={v.bankId} onChange={set('bankId')}>
              <option value="">Choose bank</option>
              {banks.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Sampler category" required error={errors.samplerCategory}>
            <Segmented
              value={v.samplerCategory}
              onChange={(c) => setV((s) => ({ ...s, samplerCategory: c }))}
              options={SAMPLER_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
          </Field>
          <Field label="Product" hint="e.g. Vehicle Finance, Home Loan">
            <input value={v.product} onChange={set('product')} list="sampling-products" placeholder="Product sampled" />
            <datalist id="sampling-products">
              {['Vehicle Finance', ...PRODUCTS].map((p) => <option key={p} value={p} />)}
            </datalist>
          </Field>
          <Field label="Branch name" required className="span-2" error={errors.branch}>
            <input value={v.branch} onChange={set('branch')} placeholder="Enter branch name" />
          </Field>
        </div>
        <p className="muted small">A sampler can submit one entry per bank branch per day — add another entry for each extra bank visited.</p>

        <h4 className="sf-head"><Icon name="bars" size={16} /> Daily login statistics</h4>
        <div className="sf-stats">
          {STATS.map((s) => (
            <label key={s.key} className={`sf-stat tone-${s.tone} ${errors[s.key] ? 'has-error' : ''}`}>
              <span className="sf-stat-icon"><Icon name={s.icon} size={20} /></span>
              <span className="sf-stat-body">
                <span className="field-label">{s.label}<em>*</em></span>
                <input type="number" min="0" step="1" inputMode="numeric" value={v[s.key]} onChange={set(s.key)} placeholder={`Enter ${s.label.toLowerCase()}`} />
                {errors[s.key] && <span className="field-error">{errors[s.key]}</span>}
              </span>
            </label>
          ))}
        </div>

        <h4 className="sf-head"><Icon name="pie" size={16} /> Performance summary</h4>
        <div className="sf-rates">
          <div><span>Screening rate <em>(screened ÷ files)</em></span><RateBar value={screening} tone="yellow" /></div>
          <div><span>Sampling rate <em>(sampled ÷ screened)</em></span><RateBar value={sampling} tone="red" /></div>
        </div>

        <div className={`sf-upload ${errors.sheet ? 'has-error' : ''}`}>
          {preview ? <img src={preview} alt="Login sheet preview" /> : <span className="sf-upload-icon"><Icon name="image" size={24} /></span>}
          <div>
            <strong>Login sheet image <em>*</em></strong>
            <span className="muted small">Upload or capture the bank login sheet · JPG, PNG (max 5 MB)</span>
            {errors.sheet && <span className="field-error">{errors.sheet}</span>}
          </div>
          <label className="btn btn-dark btn-sm">
            <Icon name="upload" size={14} /> {sheet ? 'Change image' : 'Choose image'}
            <input type="file" accept="image/jpeg,image/png" capture="environment" hidden onChange={(e) => pick(e.target.files[0])} />
          </label>
        </div>

        <Field label="Remarks (optional)">
          <input value={v.remarks} onChange={set('remarks')} placeholder="e.g. Branch closed early; files received late" />
        </Field>
        {errors.form && <div className="alert alert-red">{errors.form}</div>}
      </div>
    </Modal>
  );
}

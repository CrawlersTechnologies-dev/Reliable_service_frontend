// Sections of the two client templates. Used on the Reports screen and on the
// printable landscape PDFs, so both always show the same numbers.
import { Columns, Donut, PctBars } from './Charts';
import { AGENCY, OUTCOMES } from '../config/verification';
import { DEFAULT_BACKEND_TEXT, FO_STATUS_COLORS, IMPROVEMENT_ROWS, OUTCOME_MEANING, TAT_RED, TAT_YELLOW, fmt1, pctOf, statusSlices } from '../utils/reviews';

const TAT_SERIES = [
  { key: 'inTat', label: 'In TAT', color: TAT_YELLOW },
  { key: 'outTat', label: 'Out of TAT', color: TAT_RED },
];

// Text the reviewer can adjust before printing (prints as plain text)
export function EditableText({ value, onChange, rows = 3, editable = true }) {
  return (
    <>
      {editable && <textarea className="rv-edit no-print" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />}
      <div className={`rv-text ${editable ? 'print-only' : ''}`}>{value}</div>
    </>
  );
}

export function Kpi({ label, value, sub, tone = 'dark', accent = 'yellow' }) {
  return (
    <div className={`rv-kpi rv-kpi-${tone} rv-accent-${accent}`}>
      <span className="rv-kpi-label">{label}</span>
      <strong>{value}</strong>
      {sub && <span className="rv-kpi-sub">{sub}</span>}
    </div>
  );
}

/* ================= Back-end (OL) performance ================= */

export function BackendSnapshot({ review }) {
  const { banks, overall: o } = review;
  return (
    <>
      <div className="rv-kpis">
        <Kpi tone="light" accent="red" label="Banks handled" value={o.banks} sub="Distinct banks in selected period" />
        <Kpi tone="light" accent="yellow" label="Total cases" value={o.total} sub={`${o.closed} closed · ${o.open} open`} />
        <Kpi tone="light" accent="yellow" label="In TAT closed" value={`${o.inTat} · ${fmt1(pctOf(o.inTat, o.closed))}`} sub="Within target turnaround time" />
        <Kpi tone="light" accent="red" label="Out of TAT closed" value={`${o.outTat} · ${fmt1(pctOf(o.outTat, o.closed))}`} sub="Beyond target turnaround time" />
      </div>
      <div className="rv-split">
      <table className="rv-table">
        <thead>
          <tr>
            <th>Bank</th>
            <th>Total cases</th>
            <th>Closed</th>
            <th>In TAT closed</th>
            <th>In TAT %</th>
            <th>Out of TAT closed</th>
            <th>Out of TAT %</th>
          </tr>
        </thead>
        <tbody>
          {banks.map((b) => (
            <tr key={b.bankId}>
              <td className="strong">{b.name}</td>
              <td>{b.total}</td>
              <td>{b.closed}</td>
              <td>{b.inTat}</td>
              <td>{fmt1(pctOf(b.inTat, b.closed))}</td>
              <td>{b.outTat}</td>
              <td>{fmt1(pctOf(b.outTat, b.closed))}</td>
            </tr>
          ))}
          <tr className="rv-total">
            <td>OVERALL</td>
            <td>{o.total}</td>
            <td>{o.closed}</td>
            <td>{o.inTat}</td>
            <td>{fmt1(pctOf(o.inTat, o.closed))}</td>
            <td>{o.outTat}</td>
            <td>{fmt1(pctOf(o.outTat, o.closed))}</td>
          </tr>
        </tbody>
      </table>
      <div className="rv-chart">
        <h4>Closure performance by bank</h4>
        <ClosureColumns banks={banks} />
      </div>
      </div>
      <p className="rv-note">TAT % = share of closed cases. A closed case is in TAT when its field work was submitted within Local 8 h / OGL 24 h.</p>
    </>
  );
}

function ClosureColumns({ banks, height }) {
  return (
    <Columns
      height={height}
      yLabel="Closed cases"
      series={TAT_SERIES}
      groups={banks.filter((b) => b.closed).map((b) => ({ key: b.bankId, label: b.name, values: { inTat: b.inTat, outTat: b.outTat } }))}
    />
  );
}

export function BackendStatus({ review }) {
  const { banks, overall: o } = review;
  const withClosed = banks.filter((b) => b.closed);
  const showOther = o.other > 0;
  return (
    <>
      <div className="rv-donuts">
        {withClosed.length === 0 && <p className="muted">No closed cases in this period.</p>}
        {withClosed.map((b) => (
          <div key={b.bankId} className="rv-donut">
            <h4>{b.name}</h4>
            <Donut stacked size={150} thickness={24} sub="closed" data={statusSlices(b)} />
          </div>
        ))}
      </div>
      <h3 className="rv-sub">Bank-wise status details</h3>
      <table className="rv-table">
        <thead>
          <tr>
            <th>Bank</th>
            <th>Positive</th>
            <th>Positive %</th>
            <th>Risk Alert</th>
            <th>Risk Alert %</th>
            <th>Negative</th>
            <th>Negative %</th>
            {showOther && <th>CNV / Refer</th>}
          </tr>
        </thead>
        <tbody>
          {withClosed.map((b) => (
            <tr key={b.bankId}>
              <td className="strong">{b.name}</td>
              <td>{b.POSITIVE}</td>
              <td>{fmt1(pctOf(b.POSITIVE, b.closed))}</td>
              <td>{b.RISK_ALERT}</td>
              <td>{fmt1(pctOf(b.RISK_ALERT, b.closed))}</td>
              <td>{b.NEGATIVE}</td>
              <td>{fmt1(pctOf(b.NEGATIVE, b.closed))}</td>
              {showOther && <td>{b.other}</td>}
            </tr>
          ))}
          <tr className="rv-total">
            <td>OVERALL</td>
            <td>{o.POSITIVE}</td>
            <td>{fmt1(pctOf(o.POSITIVE, o.closed))}</td>
            <td>{o.RISK_ALERT}</td>
            <td>{fmt1(pctOf(o.RISK_ALERT, o.closed))}</td>
            <td>{o.NEGATIVE}</td>
            <td>{fmt1(pctOf(o.NEGATIVE, o.closed))}</td>
            {showOther && <td>{o.other}</td>}
          </tr>
        </tbody>
      </table>
      <p className="rv-note">
        Positive = Yellow • Risk Alert = Amber • Negative = Red. Percentages are of closed cases.
        {showOther && ' CNV and Refer to Credit are shown separately and not counted in the three statuses.'}
      </p>
    </>
  );
}

export function BackendOverall({ review, text, setText, editable }) {
  const { banks, overall: o } = review;
  const inPct = pctOf(o.inTat, o.closed);
  return (
    <>
      <div className="rv-overall">
        <div className="rv-chart">
          <h4>Overall TAT split</h4>
          <Donut
            stacked
            size={170}
            thickness={26}
            center={o.closed ? fmt1(inPct) : '—'}
            sub="in TAT"
            data={[
              { key: 'in', label: 'In TAT', value: o.inTat, color: TAT_YELLOW },
              { key: 'out', label: 'Out of TAT', value: o.outTat, color: TAT_RED },
            ]}
          />
        </div>
        <div className="rv-chart">
          <h4>Closure performance by bank</h4>
          <ClosureColumns banks={banks} height={260} />
        </div>
      <div className="rv-chart">
        <h4>Risk &amp; quality signals</h4>
        <PctBars
          rows={[
            { key: 'risk', label: 'Risk Alert', value: pctOf(o.RISK_ALERT, o.closed), color: '#e8890c' },
            { key: 'neg', label: 'Negative', value: pctOf(o.NEGATIVE, o.closed), color: TAT_RED },
            { key: 'ref', label: 'Refer to Credit', value: pctOf(o.REFER_TO_CREDIT, o.closed), color: '#6b7480' },
          ]}
        />
        <p className="rv-note">Share of closed cases (%).</p>
      </div>
      </div>
      <div className="rv-two">
        <div className="rv-box">
          <h4>Improvement priorities</h4>
          {editable && <textarea className="rv-edit no-print" rows={4} value={text.priorities} onChange={(e) => setText({ ...text, priorities: e.target.value })} />}
          <ul className={`rv-bullets ${editable ? 'print-only' : ''}`}>
            {text.priorities.split('\n').filter((l) => l.trim()).map((l, i) => (
              <li key={i}>{l.replace(/^[•\-\s]+/, '')}</li>
            ))}
          </ul>
        </div>
        <div className="rv-box rv-box-yellow">
          <h4>Appreciation</h4>
          <EditableText editable={editable} rows={2} value={text.appreciation} onChange={(v) => setText({ ...text, appreciation: v })} />
          <p className="rv-focus">
            <strong>Next review focus:</strong>
          </p>
          <EditableText editable={editable} rows={2} value={text.focus} onChange={(v) => setText({ ...text, focus: v })} />
        </div>
      </div>
    </>
  );
}

export { DEFAULT_BACKEND_TEXT };

/* ================= Field officer performance ================= */

export function FoHeader({ r, managerName, period }) {
  const e = r.exec;
  return (
    <table className="rv-info">
      <tbody>
        <tr>
          <th>Executive name</th>
          <td>{e.name}</td>
          <th>Location</th>
          <td>{e.location || '—'}</td>
        </tr>
        <tr>
          <th>Employee ID</th>
          <td>{e.employeeId}</td>
          <th>Company name</th>
          <td>{e.companyName || AGENCY.name}</td>
        </tr>
        <tr>
          <th>Reporting manager</th>
          <td>{managerName || '—'}</td>
          <th>Review period</th>
          <td>{period}</td>
        </tr>
      </tbody>
    </table>
  );
}

export function FoKpis({ r, compact }) {
  return (
    <div className={`rv-kpis ${compact ? 'compact' : ''}`}>
      <Kpi tone="dark" label="Total cases handled" value={r.handled} sub="Assigned in review period" />
      <Kpi tone="red" label="Cases closed" value={r.closed} sub={`${fmt1(pctOf(r.closed, r.handled))} of handled cases`} />
      <Kpi tone="dark" label="Closed within TAT" value={r.within} sub={`${fmt1(pctOf(r.within, r.closed))} of closed cases`} />
      <Kpi tone="red" label="Out of TAT" value={r.out} sub={`${fmt1(pctOf(r.out, r.closed))} of closed cases`} />
    </div>
  );
}

export function FoTatTable({ r }) {
  return (
    <>
      <h3 className="rv-sub dark">TAT performance by assignment type</h3>
      <table className="rv-table rv-red">
        <thead>
          <tr>
            <th>Geographical type</th>
            <th>Cases handled</th>
            <th>TAT rule</th>
            <th>Closed within TAT</th>
            <th>Closed out of TAT</th>
            <th>Within-TAT rate*</th>
          </tr>
        </thead>
        <tbody>
          {r.byType.map((t) => (
            <tr key={t.key}>
              <td>{t.label}</td>
              <td>{t.handled}</td>
              <td>{t.hours} hours</td>
              <td>{t.within}</td>
              <td>{t.out}</td>
              <td>{t.closed ? fmt1(pctOf(t.within, t.closed)) : '—'}</td>
            </tr>
          ))}
          <tr className="rv-total">
            <td>TOTAL</td>
            <td>{r.handled}</td>
            <td>—</td>
            <td>{r.within}</td>
            <td>{r.out}</td>
            <td>{r.closed ? fmt1(pctOf(r.within, r.closed)) : '—'}</td>
          </tr>
        </tbody>
      </table>
      <p className="rv-note">*Within-TAT rate = cases closed within the prescribed TAT ÷ all closed cases in that geographical type.</p>
    </>
  );
}

export function FoOutcomes({ r, onPick, picked }) {
  const total = r.handled;
  return (
    <>
      <h3 className="rv-sub dark">Outcome distribution — all {total} handled cases</h3>
      <table className="rv-table rv-red">
        <thead>
          <tr>
            <th>Status</th>
            <th>Case count</th>
            <th>Share of total</th>
            <th>What it means</th>
          </tr>
        </thead>
        <tbody>
          {r.outcomes.map((o) => (
            <tr key={o.key} className={`${onPick ? 'row-link' : ''} ${picked === o.key ? 'is-picked' : ''}`} onClick={onPick ? () => onPick(o.key) : undefined}>
              <td>
                <span className="swatch" style={{ background: FO_STATUS_COLORS[o.key] }} /> {o.label}
              </td>
              <td>{o.count}</td>
              <td>{fmt1(pctOf(o.count, total))}</td>
              <td>{OUTCOME_MEANING[o.key]}</td>
            </tr>
          ))}
          <tr className="rv-total">
            <td>TOTAL</td>
            <td>{total}</td>
            <td>{total ? '100.0%' : '—'}</td>
            <td>Status counts reconcile to handled cases</td>
          </tr>
        </tbody>
      </table>
      <div className="rv-two">
        <div className="rv-chart">
          <h4>Status mix</h4>
          <Donut size={160} thickness={28} sub="handled" data={r.outcomes.map((o) => ({ key: o.key, label: o.label, value: o.count, color: FO_STATUS_COLORS[o.key] }))} />
        </div>
        <div>
          <h4 className="rv-h4">Quality review checks</h4>
          <ul className="rv-bullets">
            <li>Every closed case has a recorded final status.</li>
            <li>Status percentages = status count ÷ total handled × 100.</li>
            <li>Risk Alert and Negative cases stay visible for supervisor follow-up.</li>
            <li>CNV, Refer to Credit and pending cases are shown separately, never forced into the three statuses.</li>
            <li>Totals update automatically when a case changes.</li>
          </ul>
        </div>
      </div>
    </>
  );
}

export function FoFinal({ r, text, setText, editable }) {
  return (
    <>
      <div className="rv-two rv-final">
        <div className="rv-box">
          <h4>Final review summary</h4>
          <EditableText editable={editable} rows={4} value={text.summary} onChange={(v) => setText({ ...text, summary: v })} />
        </div>
        <div className="rv-box">
          <h4>Appreciation</h4>
          <EditableText editable={editable} rows={4} value={text.appreciation} onChange={(v) => setText({ ...text, appreciation: v })} />
        </div>
      </div>
      <div className="rv-banner">Improvement</div>
      <table className="rv-table rv-red rv-left">
        <thead>
          <tr>
            <th>Focus area</th>
            <th>Expected improvement</th>
            <th>Review frequency</th>
          </tr>
        </thead>
        <tbody>
          {IMPROVEMENT_ROWS.map(([a, b, c]) => (
            <tr key={a}>
              <td>{a}</td>
              <td>{b}</td>
              <td>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="rv-closing">
        <strong>Manager's closing note</strong>
        <EditableText editable={editable} rows={2} value={text.note} onChange={(v) => setText({ ...text, note: v })} />
      </div>
      {r.out > 0 && <p className="rv-note">{r.out} case(s) closed out of TAT — delay reasons are recorded on each case.</p>}
    </>
  );
}

// Case IDs behind each status (the template's drill-down), printed on page 2
export function FoCaseIds({ r, only }) {
  const groups = r.outcomes
    .filter((o) => o.count && (!only || o.key === only))
    .map((o) => ({ ...o, ids: [...new Set(r.items.filter(({ c }) => (o.key === 'PENDING' ? !c.outcome : c.outcome === o.key)).map(({ c }) => c.caseNo))] }));
  if (!groups.length) return null;
  return (
    <div className="rv-ids">
      {groups.map((g) => (
        <div key={g.key}>
          <span className="swatch" style={{ background: FO_STATUS_COLORS[g.key] }} />
          <strong>{g.label}:</strong> <span className="mono">{g.ids.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}

// One landscape page of a review PDF, in the client template's style
export function ReviewPage({ kicker, title, sub, page, total, children }) {
  return (
    <section className="r-page r-land">
      <header className="rv-band">
        <div>
          <h1>{title}</h1>
          {sub && <p>{sub}</p>}
        </div>
        <span className="rv-kicker">
          {kicker} <b>{String(page).padStart(2, '0')}/{String(total).padStart(2, '0')}</b>
        </span>
      </header>
      <div className="rv-body">{children}</div>
      <div className="r-foot">
        <span>{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</span>
        <span>Page {page} of {total}</span>
      </div>
    </section>
  );
}

export const outcomeLabel = (k) => OUTCOMES.find((o) => o.key === k)?.label || k;

// These review PDFs are landscape only — rendered as a <style> tag while the page is open
export const LANDSCAPE = '@page { size: A4 landscape; margin: 0; }';

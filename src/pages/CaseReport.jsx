import { Link, useParams } from 'react-router-dom';
import { useData } from '../context/AppContext';
import { Logo } from '../components/ui';
import { fileUrl } from '../api';
import Icon from '../components/Icon';
import { AGENCY, DECLARATION_QUESTIONS, OUTCOMES, QA_PARAMS, TAT_TYPES, typeOf } from '../config/verification';
import { caseStatus, caseSubmittedAt, caseTat, fmtDuration } from '../utils/tat';
import { fmtDateTime, fmtLongDate } from '../utils/format';
import { buildRemarks } from '../utils/remarks';

const chunk = (arr, n) => arr.reduce((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), []);

function KvTable({ rows }) {
  return (
    <table className="r-kv">
      <tbody>
        {chunk(rows, 2).map((pair, i) => (
          <tr key={i}>
            {pair.map(([k, v]) => (
              <FragmentPair key={k} k={k} v={v} />
            ))}
            {pair.length === 1 && (
              <>
                <th />
                <td />
              </>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
const FragmentPair = ({ k, v }) => (
  <>
    <th>{k}</th>
    <td>{v === '' || v == null ? '—' : String(v)}</td>
  </>
);

const Bar = ({ children }) => <div className="r-bar">{children}</div>;
const Footer = ({ n, total }) => (
  <div className="r-foot">
    <span>{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</span>
    <span>Page {n} of {total}</span>
  </div>
);

export default function CaseReport() {
  const { id } = useParams();
  const { cases, bankById, execById } = useData();
  const c = cases.find((x) => x.id === id);
  if (!c) return <div className="page"><p>Case not found.</p></div>;

  const bank = bankById[c.bankId];
  const tat = caseTat(c);
  const submittedAt = caseSubmittedAt(c);
  const status = caseStatus(c);
  const outcome = OUTCOMES.find((o) => o.key === c.outcome);
  const execNames = [...new Set(c.legs.map((l) => execById[l.executiveId]?.name))].join(', ');
  const typeNames = c.legs.map((l) => typeOf(l.type).label).join(' + ');
  const tatLabel = tat.state === 'MET' || tat.state === 'IN_TAT' ? 'WITHIN TAT' : `OUT OF TAT (+${fmtDuration(tat.overdue)})`;
  const total = 2 + c.legs.length * 2 + (c.feedback ? 1 : 0);
  let page = 1;

  return (
    <div className="report-shell">
      <div className="report-toolbar no-print">
        <Link to={`/cases/${c.id}`} className="btn btn-ghost">
          <Icon name="chevronLeft" /> Back to case
        </Link>
        <div className="report-toolbar-note">
          {status !== 'CLOSED' && <span className="pill pill-amber">Draft — final status not set yet</span>}
        </div>
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>

      <div className="report">
        {/* Page 1 — case information */}
        <section className="r-page">
          <div className="r-cover">
            <Logo />
            <p className="r-tagline">{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</p>
          </div>
          <h1 className="r-title">Field Verification &amp; Quality Assurance Report</h1>
          <p className="r-sub">Customer Visit Closure Report • Application-generated final PDF</p>

          <Bar>Case information</Bar>
          <KvTable
            rows={[
              ['Case ID', c.caseNo],
              ['Client name', bank?.name],
              ['Customer name', c.customerName],
              ['Field executive', execNames],
              ['Assignment date', fmtLongDate(c.createdAt)],
              ['Visit date', submittedAt ? fmtLongDate(submittedAt) : 'Pending'],
              ['Verification type', typeNames],
              ['Product', c.product],
              ['TAT', `${TAT_TYPES[c.tatType].label} · ${TAT_TYPES[c.tatType].hours} hours`],
              ['TAT status', tatLabel],
            ]}
          />

          <Bar>Case process</Bar>
          <table className="r-table">
            <thead>
              <tr>
                <th>Stage</th>
                <th>Owner</th>
                <th>System status</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Field visit &amp; questionnaire</td><td>Field executive</td><td>{submittedAt ? 'Submitted' : 'In progress'}</td></tr>
              <tr><td>Photo &amp; evidence capture</td><td>Field executive</td><td>{submittedAt ? 'Submitted' : 'In progress'}</td></tr>
              <tr><td>Customer confirmation</td><td>Customer / person met</td><td>{c.feedback ? 'Captured' : 'Awaited'}</td></tr>
              <tr><td>QA &amp; cross-check</td><td>Admin / Operations</td><td>{c.outcome ? 'Completed' : 'Pending'}</td></tr>
              <tr><td>Final case outcome</td><td>Admin / Operations</td><td>{outcome ? outcome.label : 'Pending'}</td></tr>
            </tbody>
          </table>
          <div className="r-tatlogic">
            <span>TAT colour logic</span>
            <span className="ok">Within {TAT_TYPES[c.tatType].hours}h</span>
            <span className="bad">Above {TAT_TYPES[c.tatType].hours}h</span>
          </div>
          <Footer n={page++} total={total} />
        </section>

        {c.legs.map((l) => {
          const t = typeOf(l.type);
          const fields = t.fields.filter((f) => !f.showIf || f.showIf(l.findings));
          const done = l.status === 'SUBMITTED';
          const photos = t.photos.map((p, i) => ({ slot: i, label: p, url: l.photos[i] || null, has: !!l.photos[i], optional: i >= 4 })).filter((p) => p.has || !p.optional);
          return [
            <section className="r-page" key={`${l.id}-a`}>
              <h2 className="r-h2">{t.label} verification</h2>
              <Bar>Allocation</Bar>
              <KvTable
                rows={[
                  ['Address', l.address],
                  ['Executive', execById[l.executiveId]?.name],
                  ['Route', `${l.fromPlace || '—'} → ${l.toPlace || '—'}${l.km != null && l.km !== '' ? ` (${l.km} km)` : ''}`],
                  ['Submitted', done ? fmtDateTime(l.submittedAt) : 'Pending'],
                  ...(t.isDocument ? [['Document', l.documentName], ['Attachments', `${l.attachments.length} files`]] : []),
                ]}
              />
              <Bar>Field findings</Bar>
              {done ? <KvTable rows={fields.map((f) => [f.label, l.findings[f.key]])} /> : <p className="r-note">Awaiting executive submission.</p>}
              <Bar>Visit remarks — structured findings</Bar>
              <div className="r-remarks">
                {done ? (
                  buildRemarks(l.type, l.findings, l).map(([k, v]) => (
                    <p key={k}>
                      <strong>{k}:</strong> {v}
                    </p>
                  ))
                ) : (
                  <p className="r-note">Remarks will be generated when the visit is submitted.</p>
                )}
              </div>
              <Footer n={page++} total={total} />
            </section>,
            <section className="r-page" key={`${l.id}-b`}>
              <h2 className="r-h2">Field visit evidence — {t.label}</h2>
              <Bar>Photo evidence</Bar>
              <div className="r-photos">
                {photos.map((p, i) => (
                  <div className="r-photo" key={i}>
                    <div className="r-photo-head">{p.slot < 4 ? `PHOTO 0${p.slot + 1}` : `EXTRA 0${p.slot - 3}`} · {p.label}</div>
                    <div className="r-photo-body">
                      {p.url ? (
                        <img src={fileUrl(p.url)} alt={p.label} />
                      ) : (
                        <>
                          <strong>{p.slot < 4 ? `PHOTO 0${p.slot + 1}` : `EXTRA 0${p.slot - 3}`}</strong>
                          <span>{p.label}</span>
                        </>
                      )}
                    </div>
                    <div className="r-photo-foot">{p.has ? 'Captured in application' : 'Not captured'}</div>
                  </div>
                ))}
              </div>
              <Bar>Evidence &amp; admin check</Bar>
              <table className="r-table">
                <thead>
                  <tr>
                    <th>Evidence</th>
                    <th>Executive submission</th>
                    <th>Admin cross-check</th>
                  </tr>
                </thead>
                <tbody>
                  {photos.map((p, i) => (
                    <tr key={i}>
                      <td>{p.label}</td>
                      <td>{p.has ? 'Captured' : 'Not captured'}</td>
                      <td>{c.qaChecks?.photographs ? 'Verified' : 'To be verified'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Footer n={page++} total={total} />
            </section>,
          ];
        })}

        {/* QA & final decision */}
        <section className="r-page">
          <h2 className="r-h2">Admin quality assurance &amp; final decision</h2>
          <Bar>Admin cross-check</Bar>
          <table className="r-table">
            <thead>
              <tr>
                <th>QA parameter</th>
                <th>Admin status</th>
                <th>Cross-check remarks</th>
              </tr>
            </thead>
            <tbody>
              {QA_PARAMS.map((p) => (
                <tr key={p.key}>
                  <td>{p.label}</td>
                  <td>{c.qaChecks?.[p.key] ? 'Verified' : 'Pending'}</td>
                  <td>{p.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Bar>Admin cross-check remarks</Bar>
          <div className="r-box">{c.qaRemarks || 'No remarks entered.'}</div>
          <Bar>Admin finalisation</Bar>
          <KvTable
            rows={[
              ['Verified by', c.outcomeBy?.name || '—'],
              ['Verification date', c.outcomeAt ? fmtDateTime(c.outcomeAt) : '—'],
              ['QA completion', c.outcome ? 'Completed' : 'Pending'],
              ['Report generated', fmtDateTime(new Date())],
            ]}
          />
          <p className="r-outcome-label">Final case outcome</p>
          <div className="r-outcomes">
            {OUTCOMES.map((o) => (
              <div key={o.key} className={`r-outcome ${c.outcome === o.key ? `on tone-${o.tone}` : ''}`}>
                {o.label.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="r-reviewed">
            Final report reviewed by: {AGENCY.reviewer} ({AGENCY.reviewerTitle})
          </div>
          <Footer n={page++} total={total} />
        </section>

        {c.feedback && (
          <section className="r-page r-watermark">
            <h2 className="r-h2">Customer visit confirmation &amp; quality assurance</h2>
            <Bar>Customer declaration</Bar>
            <p className="r-text">To Whom It May Concern,</p>
            <p className="r-text">
              This is to confirm that, during the field verification visit conducted by the representative of {AGENCY.name} – Investigation Agency, the customer / person met has confirmed the following:
            </p>
            <table className="r-table">
              <thead>
                <tr>
                  <th>Confirmation</th>
                  <th>Customer confirmation</th>
                </tr>
              </thead>
              <tbody>
                {DECLARATION_QUESTIONS.map((q) => (
                  <tr key={q.key}>
                    <td>{q.title}</td>
                    <td>{c.feedback[q.key] ? q.text : `Not confirmed — ${q.text.toLowerCase()}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="r-text small">The above statements are documented solely on the basis of the confirmation provided by the customer / person met.</p>
            <Bar>Customer acknowledgment</Bar>
            <p className="r-text">I hereby acknowledge that the above details have been recorded based on the information provided by me.</p>
            <KvTable
              rows={[
                ['Customer / person met', c.feedback.respondentName || c.customerName],
                ['Rating', '★'.repeat(c.feedback.rating) + '☆'.repeat(5 - c.feedback.rating)],
                ['Date', fmtDateTime(c.feedback.submittedAt)],
                ['Digital confirmation', 'Captured via feedback link'],
              ]}
            />
            <Footer n={page++} total={total} />
          </section>
        )}
      </div>
    </div>
  );
}

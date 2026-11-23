import { Link, useParams } from 'react-router-dom';
import { useData } from '../context/AppContext';
import { Logo } from '../components/ui';
import { fileUrl } from '../api';
import Icon from '../components/Icon';
import { caseInfoRows } from '../components/CaseInfoFields';
import { AGENCY, DECLARATION_KN, DECLARATION_QUESTIONS, OUTCOMES, QA_PARAMS, TAT_TYPES, VISIT_RESULTS, reportLabel, typeOf } from '../config/verification';
import { caseStatus, caseSubmittedAt, caseTat } from '../utils/tat';
import { fmtDateTime, fmtLongDate } from '../utils/format';
import { buildRemarks } from '../utils/remarks';
import WordButton from '../components/WordButton';
import signature from '../assets/signature.png';
import stamp from '../assets/stamp.png';

const chunk = (arr, n) => arr.reduce((a, x, i) => (i % n ? a[a.length - 1].push(x) : a.push([x]), a), []);

function KvTable({ rows, dense = false }) {
  return (
    <table className={`r-kv ${dense ? 'r-kv-dense' : ''}`}>
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

// how much allocation fits under the case information on page 1
const ALLOC_UNITS_PAGE1 = 21;
const ALLOC_UNITS_FULL_COVER = 15; // above this the page-1 heading is printed in one compact line

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
  // current executive only (earlier executives of a transferred case are not printed)
  const execNames = [...new Set(c.legs.map((l) => (l.internal || !l.executiveId ? 'Handled internally' : execById[l.executiveId]?.name)).filter(Boolean))].join(', ');
  // evidence page only for legs that have photo slots and were not entered manually without photos
  const notTraced = (l) => l.status === 'SUBMITTED' && l.visitResult && l.visitResult !== 'TRACED';
  const hasEvidence = (l) => (notTraced(l) ? l.photoDetails?.length > 0 : typeOf(l.type).photos.length > 0 && !(l.manual && !l.photos.some(Boolean)));
  // combined case: residence first, then business / office…, then office checks; one overall remarks page at the end
  const ORDER = ['RESIDENCE', 'RESI_CUM_OFFICE', 'BUSINESS', 'OFFICE', 'PROPERTY', 'DOCUMENT', 'INTERNAL_DOCUMENT', 'BANK_STATEMENT'];
  const legs = [...c.legs].sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
  const combined = legs.length > 1;
  // documents are named by what was checked: "Residence + Business + Salary Certificate + Bank Statement"
  const legName = (l) => (typeOf(l.type).isDocument ? l.documentName || reportLabel(typeOf(l.type)) : reportLabel(typeOf(l.type)));
  const typeNames = legs.map(legName).join(' + ');
  // field and internal document checks print together under one "Document check" heading
  const groups = [];
  for (const l of legs) {
    const t = typeOf(l.type);
    const key = t.isDocument ? 'DOC' : l.id;
    let g = groups.find((x) => x.key === key);
    if (!g) groups.push((g = { key, title: t.isDocument ? 'Document check' : `${reportLabel(t)} verification`, legs: [] }));
    g.legs.push(l);
  }
  const evidenceTitle = (l) => (typeOf(l.type).isDocument ? `Document check — ${legName(l)}` : `${reportLabel(typeOf(l.type))} verification`);
  const tatLabel = tat.state === 'MET' || tat.state === 'IN_TAT' ? 'WITHIN TAT' : 'OUT OF TAT';
  let page = 1;

  const allocRows = (l) => {
    const t = typeOf(l.type);
    const done = l.status === 'SUBMITTED';
    const nt = notTraced(l);
    const result = VISIT_RESULTS.find((r) => r.key === l.visitResult);
    const docRows = t.isDocument
      ? [
          ['Document type', l.documentName],
          ['Document No.', l.documentNo || l.findings?.documentNo],
          ...(l.holderName || l.holderRelation ? [['Document holder', [l.holderName, l.holderRelation && `(${l.holderRelation})`].filter(Boolean).join(' ')]] : []),
        ]
      : [];
    if (l.internal) {
      // office document check: status here, the remarks go to the remarks section (not the allocation)
      const fields = t.fields.filter((f) => !['documentNo', 'details'].includes(f.key) && (!f.showIf || f.showIf(l.findings)) && l.findings?.[f.key] !== undefined && l.findings?.[f.key] !== '');
      return [
        ...docRows,
        [t.placeLabel, l.address],
        ['Handled by', l.completedBy?.name ? `${l.completedBy.name} (${l.completedBy.role === 'ADMIN' ? 'Admin' : 'Operations'})` : 'Admin / Operations'],
        ['Completed', done ? fmtDateTime(l.submittedAt) : 'Pending'],
        ...(l.attachments.length ? [['Attachments', `${l.attachments.length} file${l.attachments.length === 1 ? '' : 's'}`]] : []),
        ...(done ? fields.map((f) => [f.label, l.findings[f.key]]) : []),
      ];
    }
    return [
      ...docRows,
      ['Address', [l.address, l.pincode].filter(Boolean).join(' – ')],
      ['Executive', l.executiveId ? execById[l.executiveId]?.name : 'Handled internally (office)'],
      ['Route', `${l.fromPlace || '—'} → ${l.toPlace || '—'}${l.km != null && l.km !== '' ? ` (${l.km} km)` : ''}`],
      ['Submitted', done ? `${fmtDateTime(l.submittedAt)}${l.manual ? ' (entered by office)' : ''}` : 'Awaiting executive submission'],
      ...(done && result ? [['Visit result', result.label]] : []),
      ...(done && nt && l.nonVisitReason && !combined ? [['Reason (not conducted)', l.nonVisitReason]] : []),
      ...(l.editedBy ? [['Details edited by', `${l.editedBy.name} · ${fmtDateTime(l.editedAt)}`]] : []),
    ];
  };
  // allocations sit on page 1 under the case information; very large cases (4+ locations) get one allocation page
  // (measured in table rows: one row holds two fields; a heading bar ≈ 1.3 rows)
  const allocUnits = groups.reduce((n, g) => n + 1.3 + g.legs.reduce((m, l) => m + Math.ceil(allocRows(l).length / 2) + (g.legs.length > 1 ? 0.6 : 0), 0), 0);
  const allocOwnPage = allocUnits > ALLOC_UNITS_PAGE1;
  const total = 2 + (allocOwnPage ? 1 : 0) + legs.filter(hasEvidence).length + (combined ? 1 : 0) + (c.feedback ? 1 : 0);
  const allocation = groups.map((g) => (
    <div key={`${g.key}-a`} className="r-alloc">
      <Bar>{`Allocation — ${g.title}`}</Bar>
      {g.legs.map((l) => (
        <div key={l.id}>
          {g.legs.length > 1 && <p className="r-alloc-sub">{legName(l)}</p>}
          <KvTable dense rows={allocRows(l)} />
        </div>
      ))}
    </div>
  ));
  // remark paragraphs; the internal document remarks have no heading and print as written
  const paras = (l) =>
    buildRemarks(l.type, l.findings, l).map(([k, v], i) => (
      <p key={i} className={k ? '' : 'r-asis'}>
        {k && (
          <>
            <strong>{k}:</strong>{' '}
          </>
        )}
        {v}
      </p>
    ));
  // single-location case: its remarks follow the allocation on page 1 (combined cases have their own remarks page)
  const single = !combined && legs[0];
  const singleRemarks = single && !notTraced(single) && (
    <>
      <Bar>{single.internal ? 'Remarks' : 'Visit remarks — structured findings'}</Bar>
      <div className="r-remarks">
        {single.status === 'SUBMITTED' ? (
          paras(single)
        ) : (
          <p className="r-note">{single.internal ? 'Remarks will appear once the details are added.' : 'Remarks will be generated when the visit is submitted.'}</p>
        )}
      </div>
    </>
  );

  return (
    <div className="report-shell">
      <div className="report-toolbar no-print">
        <Link to={`/cases/${c.id}`} className="btn btn-ghost">
          <Icon name="chevronLeft" /> Back to case
        </Link>
        <div className="report-toolbar-note">
          {status !== 'CLOSED' && <span className="pill pill-amber">Draft — final status not set yet</span>}
        </div>
        <WordButton filename={`${c.caseNo}_verification_report.docx`} />
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>

      <div className="report">
        {/* Page 1 — case information */}
        <section className={`r-page r-first ${allocUnits > ALLOC_UNITS_FULL_COVER && !allocOwnPage ? 'r-first-compact' : ''}`}>
          <div className="r-cover">
            <Logo />
            <p className="r-tagline">{AGENCY.name.toUpperCase()} | {AGENCY.tagline}</p>
          </div>
          <h1 className="r-title">Field Verification &amp; Quality Assurance Report</h1>
          <p className="r-sub">Customer Visit Closure Report • Application-generated final PDF</p>

          <Bar>Case information</Bar>
          <KvTable
            dense
            rows={[
              ['Case ID', c.caseNo],
              ['Client name', bank?.name],
              ...caseInfoRows(c).filter(([k, v]) => v && ['Banker case ID', 'Branch'].includes(k)),
              ['Customer name', c.customerName],
              ...caseInfoRows(c).filter(([k, v]) => v && k === 'Additional names'),
              ['Product', c.product],
              ...caseInfoRows(c).filter(([k, v]) => v && k === 'Loan amount'),
              ['Contact number', c.contact],
              ...caseInfoRows(c).filter(([k, v]) => v && ['PAN', 'Dedupe check', 'Customer profile', 'DSA / DST'].includes(k)),
              ...(c.coApplicantName ? [['Co-applicant', [c.coApplicantName, c.coApplicantContact].filter(Boolean).join(' · ')]] : []),
              ['Field executive', execNames],
              ['Verification type', typeNames],
              ['Assignment date', fmtLongDate(c.createdAt)],
              ['Visit date', submittedAt ? fmtLongDate(submittedAt) : 'Pending'],
              ['TAT', TAT_TYPES[c.tatType].label],
              ['TAT status', tatLabel],
              ...(c.holidays?.length
                ? [['Holiday intimation', c.holidays.map((h) => `${fmtLongDate(h.date)}${h.note ? ` — ${h.note}` : ''}`).join('; ')]]
                : []),
              ...(c.tatReason ? [['Reason for delay', c.tatReason.text]] : []),
            ]}
          />

          {!allocOwnPage && allocation}
          {singleRemarks}

          <Footer n={page++} total={total} />
        </section>

        {allocOwnPage && (
          <section className="r-page">
            <h2 className="r-h2">Allocation details</h2>
            {allocation}
            <Footer n={page++} total={total} />
          </section>
        )}

        {combined && (
          <section className="r-page">
            <h2 className="r-h2">Overall combined remarks</h2>
            <p className="r-sub">{typeNames} — one report for all locations of this case</p>
            {groups.map((g) => (
              <div key={g.key} className="r-combined">
                <Bar>{g.title}</Bar>
                <div className="r-remarks">
                  {g.legs.map((l) => {
                    const result = VISIT_RESULTS.find((r) => r.key === l.visitResult);
                    const doc = g.legs.length > 1 || typeOf(l.type).isDocument ? `${legName(l)} — ` : '';
                    return l.status !== 'SUBMITTED' ? (
                      <p key={l.id} className="r-note">{doc}Pending.</p>
                    ) : notTraced(l) ? (
                      <p key={l.id}>
                        <strong>{doc}{result?.label}:</strong> {l.nonVisitReason}
                      </p>
                    ) : (
                      <div key={l.id}>{paras(l)}</div>
                    );
                  })}
                </div>
              </div>
            ))}
            <Footer n={page++} total={total} />
          </section>
        )}

        {/* photo evidence pages come after the allocation pages and the combined remarks */}
        {legs.filter(hasEvidence).map((l) => {
          const t = typeOf(l.type);
          const nt = notTraced(l);
          const photos = nt
            ? (l.photoDetails || []).map((p) => ({ slot: p.slot, label: p.label || 'Location photo', url: p.url, has: true, optional: false, gps: p }))
            : t.photos
                .map((p, i) => ({ slot: i, label: p, url: l.photos[i] || null, has: !!l.photos[i], optional: i >= 4, gps: (l.photoDetails || []).find((d) => d.slot === i) }))
                .filter((p) => p.has || !p.optional);
          return (
            <section className="r-page r-evidence" key={`${l.id}-b`}>
              <h2 className="r-h2">Field visit evidence — {evidenceTitle(l)}</h2>
              <p className="r-sub">
                Photos taken at the {t.placeLabel.toLowerCase()}
                {[l.address, l.pincode].filter(Boolean).length ? `: ${[l.address, l.pincode].filter(Boolean).join(' – ')}` : ''}
                {!l.internal && execById[l.executiveId] ? ` · ${execById[l.executiveId].name}` : ''}
              </p>
              <Bar>{`${evidenceTitle(l)} — ${photos.length} photo${photos.length === 1 ? '' : 's'}`}</Bar>
              <div className={`r-photos r-photos-big ${photos.length <= 2 ? 'few' : photos.length <= 4 ? 'mid' : ''}`}>
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
                    <div className="r-photo-foot">
                      {!p.has
                        ? 'Not captured'
                        : p.gps?.lat && p.gps?.lng
                          ? `GPS ${Number(p.gps.lat).toFixed(5)}, ${Number(p.gps.lng).toFixed(5)}${p.gps.takenAt ? ` · ${fmtDateTime(p.gps.takenAt)}` : ''}`
                          : `Captured in application${p.gps?.takenAt ? ` · ${fmtDateTime(p.gps.takenAt)}` : ''}`}
                    </div>
                  </div>
                ))}
              </div>
              <Footer n={page++} total={total} />
            </section>
          );
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
          <p className="r-outcome-label">Final case outcome</p>
          <div className="r-outcomes">
            {OUTCOMES.map((o) => (
              <div key={o.key} className={`r-outcome ${c.outcome === o.key ? `on tone-${o.tone}` : ''}`}>
                {o.label.toUpperCase()}
              </div>
            ))}
          </div>
          <div className="r-auth-sign">
            <div>
              <span className="noc-label">Final status</span>
              <strong>{outcome ? outcome.label : 'Pending'}</strong>
              {c.outcomeAt && <span>{fmtDateTime(c.outcomeAt)}</span>}
            </div>
            <div className="noc-sign-agency">
              <span className="noc-label">For {AGENCY.name}</span>
              <div className="noc-sign-art">
                <img src={signature} alt="Signature" />
                <img src={stamp} alt="Seal" className="noc-stamp" />
              </div>
              <span>Authorised signatory</span>
            </div>
          </div>
          <Footer n={page++} total={total} />
        </section>

        {c.feedback && (
          <section className="r-page noc">
            <header className="noc-head">
              <Logo />
              <div className="noc-title">
                <h2>No Objection Certificate</h2>
                <span className="kn">{DECLARATION_KN.nocTitle}</span>
                <em>Customer declaration &amp; visit confirmation</em>
              </div>
            </header>
            <div className="noc-strip">
              <div><span>Ref. no.</span><strong>NOC/{c.caseNo}</strong></div>
              <div><span>NOC date</span><strong>{fmtLongDate(c.feedback.submittedAt)}</strong></div>
              <div><span>Client bank</span><strong>{bank?.name}</strong></div>
              <div><span>Customer</span><strong>{c.customerName}</strong></div>
              <div><span>Verification</span><strong>{typeNames}</strong></div>
              <div><span>Field executive</span><strong>{execNames || '—'}</strong></div>
              <div><span>Visit date</span><strong>{submittedAt ? fmtLongDate(submittedAt) : '—'}</strong></div>
              <div><span>Banker case ID</span><strong>{c.bankerCaseId || '—'}</strong></div>
            </div>

            <p className="r-text">To Whom It May Concern,</p>
            <p className="r-text">
              This is to confirm that, during the field verification visit conducted by the representative of {AGENCY.name} – Investigation Agency, the
              customer / person met has confirmed the following and has <strong>no objection</strong> regarding the conduct of the visit:
            </p>
            <p className="r-text kn">{DECLARATION_KN.intro}</p>

            <table className="noc-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Declaration | {DECLARATION_KN.heading}</th>
                  <th>Customer response</th>
                </tr>
              </thead>
              <tbody>
                {DECLARATION_QUESTIONS.map((q, i) => {
                  const ok = c.feedback[q.key];
                  return (
                    <tr key={q.key}>
                      <td className="noc-n">{i + 1}</td>
                      <td>
                        <strong>{q.title}</strong> <span className="kn noc-kn-inline">({q.titleKn})</span>
                        <p>{q.text}</p>
                        <p className="kn">{q.textKn}</p>
                      </td>
                      <td className="noc-resp">
                        <span className={`noc-pill ${ok ? 'yes' : 'no'}`}>{ok ? '✔ Confirmed' : '✘ Not confirmed'}</span>
                        <span className="kn">{ok ? DECLARATION_KN.confirmed : DECLARATION_KN.notConfirmed}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="noc-rating">
              <div>
                <span className="noc-label">Customer rating of the visit</span>
                <span className="noc-stars">
                  {'★'.repeat(c.feedback.rating)}
                  <i>{'★'.repeat(5 - c.feedback.rating)}</i>
                </span>
                <strong>
                  {c.feedback.rating}/5 · {['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'][c.feedback.rating]}
                </strong>
              </div>
              {c.feedback.comments && (
                <blockquote>
                  <span className="noc-label">Customer comments</span>“{c.feedback.comments}”
                </blockquote>
              )}
            </div>

            <div className="noc-ack">
              <span className="noc-label">Customer acknowledgment | {DECLARATION_KN.heading}</span>
              <p>I hereby acknowledge that the above details have been recorded based on the information provided by me, and I have no objection regarding this verification visit.</p>
              <p className="kn">{DECLARATION_KN.acknowledgment}</p>
              <p className="noc-note">
                The above statements are documented solely on the basis of the confirmation provided by the customer / person met. <span className="kn">{DECLARATION_KN.closing}</span>
              </p>
            </div>

            <div className="noc-sign">
              <div>
                <span className="noc-label">Customer / person met</span>
                <strong>{c.feedback.respondentName || c.customerName}</strong>
                <span>Digitally confirmed via secure feedback link</span>
                <span>{fmtDateTime(c.feedback.submittedAt)}</span>
              </div>
              <div className="noc-sign-agency">
                <span className="noc-label">For {AGENCY.name}</span>
                <div className="noc-sign-art">
                  <img src={signature} alt="Signature" />
                  <img src={stamp} alt="Seal" className="noc-stamp" />
                </div>
                <span>Authorised signatory</span>
              </div>
            </div>

            <Footer n={page++} total={total} />
          </section>
        )}
      </div>
    </div>
  );
}

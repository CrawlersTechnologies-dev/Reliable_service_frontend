import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import { fileUrl } from '../api';
import { useData, useNow, useToast } from '../context/AppContext';
import { Avatar, Empty, PageHeader, Pill, Stars, TatBadge, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import { DECLARATION_QUESTIONS, OUTCOMES, QA_PARAMS, TAT_TYPES, typeOf } from '../config/verification';
import { CASE_STATUS, LEG_STATUS, caseStatus, caseSubmittedAt, caseTat, deadlineOf, legTat } from '../utils/tat';
import { copyText, feedbackUrl, fmtDateTime } from '../utils/format';
import { directionsLink, legMapLink } from '../utils/maps';
import { buildRemarks } from '../utils/remarks';


const DEMO_TOOLS = true; // shows "simulate executive app" buttons until the mobile app exists

export default function CaseDetail() {
  const { id } = useParams();
  const { cases, bankById, executives, execById, refresh } = useData();
  const toast = useToast();
  const now = useNow(15000);
  const c = cases.find((x) => x.id === id);

  if (!c) return <Empty icon="search" title="Case not found" action={<Link className="btn btn-ghost" to="/cases">Back to cases</Link>} />;

  const status = caseStatus(c);
  const tat = caseTat(c, now);
  const bank = bankById[c.bankId];
  const allSubmitted = c.legs.every((l) => l.status === 'SUBMITTED');

  const act = async (fn, ok) => {
    try {
      await fn();
      await refresh();
      if (ok) toast(ok);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page">
      <PageHeader
        back={
          <Link to="/cases" className="back-link">
            <Icon name="chevronLeft" size={16} /> Cases
          </Link>
        }
        title={c.customerName}
        subtitle={
          <>
            <span className="mono">{c.caseNo}</span> · {bank?.name} · {c.product}
          </>
        }
        actions={
          <Link className={`btn ${allSubmitted ? 'btn-dark' : 'btn-ghost'}`} to={`/cases/${c.id}/report`} title={allSubmitted ? '' : 'Preview — the report fills in as executives submit'}>
            <Icon name="report" /> {c.outcome ? 'Final report' : 'Report preview'}
          </Link>
        }
      />

      <div className="case-top">
        <TatBadge c={c} tat={tat} variant="big" />
        <div className="card case-facts">
          <div>
            <span>Status</span>
            <Pill tone={CASE_STATUS[status].tone}>{CASE_STATUS[status].label}</Pill>
          </div>
          <div>
            <span>TAT</span>
            <strong>
              {TAT_TYPES[c.tatType].label} · {TAT_TYPES[c.tatType].hours}h
            </strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{fmtDateTime(c.createdAt)}</strong>
          </div>
          <div>
            <span>Due</span>
            <strong>{fmtDateTime(deadlineOf(c))}</strong>
          </div>
          <div>
            <span>Created by</span>
            <strong>
              {c.createdBy.name} <em className="muted">({c.createdBy.role === 'ADMIN' ? 'Admin' : 'OL'})</em>
            </strong>
          </div>
          <div>
            <span>Type</span>
            <strong>{c.legs.length > 1 ? `Combined · ${c.legs.length} locations` : typeOf(c.legs[0].type).label}</strong>
          </div>
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          {c.legs.map((l, i) => (
            <LegPanel
              key={l.id}
              c={c}
              leg={l}
              index={i}
              now={now}
              exec={execById[l.executiveId]}
              executives={executives}
              onReassign={(eid) => act(() => api.cases.reassign(c.id, l.id, eid), 'Executive reassigned')}
              onSimulate={() => act(() => api.cases.simulateVisit(c.id, l.id), l.status === 'ASSIGNED' ? 'Visit started (demo)' : 'Visit submitted (demo)')}
            />
          ))}
        </div>
        <aside className="detail-side">
          <QaPanel c={c} allSubmitted={allSubmitted} onSave={(data) => act(() => api.cases.setOutcome(c.id, data), 'Case status saved')} />
          <FeedbackPanel c={c} />
          <Timeline c={c} execById={execById} />
        </aside>
      </div>
    </div>
  );
}

function LegPanel({ c, leg, index, now, exec, executives, onReassign, onSimulate }) {
  const t = typeOf(leg.type);
  const map = legMapLink(leg);
  const dir = directionsLink(leg.fromPlace, leg.toPlace);
  const fields = t.fields.filter((f) => !f.showIf || f.showIf(leg.findings));
  const lt = legTat(c, leg, now);

  return (
    <section className={`card leg-panel tone-${t.tone}`}>
      <div className="leg-head">
        <div className="leg-title">
          <span className="leg-num">{index + 1}</span>
          <div>
            <h3>{t.label} verification</h3>
            <div className="chips">
              <Pill tone={LEG_STATUS[leg.status].tone}>{LEG_STATUS[leg.status].label}</Pill>
              {c.legs.length > 1 && <TatBadge c={c} tat={lt} />}
            </div>
          </div>
        </div>
        {DEMO_TOOLS && leg.status !== 'SUBMITTED' && (
          <button className="btn btn-ghost btn-xs demo-btn" onClick={onSimulate} title="Stand-in for the executive app">
            Demo: {leg.status === 'ASSIGNED' ? 'start visit' : 'submit visit'}
          </button>
        )}
      </div>

      <div className="leg-info">
        {leg.address && (
          <div className="info-block span-2">
            <span className="info-label">
              <Icon name="pin" size={14} /> {t.placeLabel}
            </span>
            <p>{leg.address}</p>
            <div className="chips">
              {map && (
                <a className="btn btn-ghost btn-xs" href={map} target="_blank" rel="noreferrer">
                  <Icon name="external" size={13} /> Open in Maps
                </a>
              )}
              {leg.lat && <span className="mono muted small">{leg.lat}, {leg.lng}</span>}
            </div>
          </div>
        )}
        {(leg.fromPlace || leg.toPlace || leg.km != null) && (
          <div className="info-block">
            <span className="info-label">
              <Icon name="route" size={14} /> Route
            </span>
            <p>
              {leg.fromPlace || '—'} → {leg.toPlace || '—'}
              {leg.km != null && leg.km !== '' && <strong> · {leg.km} km</strong>}
            </p>
            {dir && (
              <a className="link small" href={dir} target="_blank" rel="noreferrer">
                Directions
              </a>
            )}
          </div>
        )}
        <div className="info-block">
          <span className="info-label">
            <Icon name="phone" size={14} /> Contact
          </span>
          <p className="mono">{leg.contactPerson || leg.contact || c.contact}</p>
        </div>
        {leg.trigger && (
          <div className="trigger span-2">
            <Icon name="alert" size={16} />
            <div>
              <strong>Trigger</strong>
              <p>{leg.trigger}</p>
            </div>
          </div>
        )}
        {t.isDocument && (
          <div className="info-block span-2">
            <span className="info-label">
              <Icon name="file" size={14} /> {leg.documentName || 'Document'} · {leg.attachments.length} attachments
            </span>
            <ul className="file-list">
              {leg.attachments.map((a, i) => (
                <li key={i}>
                  <Icon name={a.type === 'application/pdf' ? 'file' : 'image'} size={14} />{' '}
                  {a.url ? (
                    <a className="link" href={fileUrl(a.url)} target="_blank" rel="noreferrer">{a.name}</a>
                  ) : (
                    a.name
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="leg-exec">
        <Avatar name={exec?.name || '?'} photo={exec?.photo} size={38} />
        <div className="leg-exec-who">
          <strong>{exec?.name || 'Unassigned'}</strong>
          <span className="muted small">
            {exec?.employeeId} · {exec?.location} · {exec?.mobile}
          </span>
        </div>
        {leg.status !== 'SUBMITTED' && (
          <select className="sm-select" value={leg.executiveId} onChange={(e) => onReassign(e.target.value)} aria-label="Reassign executive">
            {executives
              .filter((e) => e.status === 'Active' || e.id === leg.executiveId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.id === leg.executiveId ? `Assigned: ${e.name}` : `Reassign to ${e.name} (${e.location})`}
                </option>
              ))}
          </select>
        )}
      </div>

      {leg.status === 'SUBMITTED' && (
        <div className="findings">
          <div className="findings-head">
            <h4>Executive findings</h4>
            <span className="muted small">Submitted {fmtDateTime(leg.submittedAt)}</span>
          </div>
          <dl className="kv">
            {fields.map((f) => (
              <div key={f.key}>
                <dt>{f.label}</dt>
                <dd>{leg.findings[f.key] ?? '—'}</dd>
              </div>
            ))}
          </dl>
          <div className="remarks">
            {buildRemarks(leg.type, leg.findings, leg).map(([title, text]) => (
              <p key={title}>
                <strong>{title}:</strong> {text}
              </p>
            ))}
          </div>
          <div className="photo-strip">
            {t.photos.map((p, i) => (
              leg.photos[i] ? (
                <a key={i} className="photo-slot has" href={fileUrl(leg.photos[i])} target="_blank" rel="noreferrer" title={p}>
                  <img src={fileUrl(leg.photos[i])} alt={p} loading="lazy" />
                  <span>{p}</span>
                </a>
              ) : (
                <div key={i} className="photo-slot">
                  <Icon name="image" size={18} />
                  <span>{p}</span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function QaPanel({ c, allSubmitted, onSave }) {
  const [outcome, setOutcome] = useState(c.outcome || '');
  const [remarks, setRemarks] = useState(c.qaRemarks || '');
  const [checks, setChecks] = useState(c.qaChecks || {});
  const [editing, setEditing] = useState(!c.outcome);
  useEffect(() => {
    setOutcome(c.outcome || '');
    setRemarks(c.qaRemarks || '');
    setChecks(c.qaChecks || {});
    setEditing(!c.outcome);
  }, [c.outcome, c.qaRemarks]);

  const current = OUTCOMES.find((o) => o.key === c.outcome);

  return (
    <section className="card qa-card">
      <div className="card-head">
        <div>
          <h2>QA & final status</h2>
          <p>Set before the report goes to the bank</p>
        </div>
      </div>
      {!allSubmitted && (
        <div className="alert alert-yellow">
          <Icon name="clock" size={16} /> Waiting for {c.legs.filter((l) => l.status !== 'SUBMITTED').length} verification(s) from the field.
        </div>
      )}
      {c.outcome && !editing ? (
        <div className="qa-done">
          <Pill tone={current.tone}>{current.label}</Pill>
          <p className="small">
            by {c.outcomeBy?.name} · {fmtDateTime(c.outcomeAt)}
          </p>
          {c.qaRemarks && <blockquote>{c.qaRemarks}</blockquote>}
          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            <Icon name="edit" size={14} /> Change status
          </button>
        </div>
      ) : (
        <fieldset disabled={!allSubmitted} className="qa-form">
          <div className="qa-checks">
            {QA_PARAMS.map((p) => (
              <label key={p.key} className="check">
                <input type="checkbox" checked={!!checks[p.key]} onChange={(e) => setChecks({ ...checks, [p.key]: e.target.checked })} />
                <span>{p.label}</span>
              </label>
            ))}
          </div>
          <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="QA observations, discrepancies or approval remarks" />
          <div className="outcomes">
            {OUTCOMES.map((o) => (
              <button type="button" key={o.key} className={`outcome tone-${o.tone} ${outcome === o.key ? 'on' : ''}`} onClick={() => setOutcome(o.key)}>
                {o.label}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-block" disabled={!outcome} onClick={() => onSave({ outcome, qaRemarks: remarks, qaChecks: checks })}>
            Save final status
          </button>
        </fieldset>
      )}
    </section>
  );
}

function FeedbackPanel({ c }) {
  const toast = useToast();
  const url = feedbackUrl(c.feedbackToken);
  const msg = `Dear ${c.customerName}, please share your feedback on our field executive's visit: ${url} — Reliable Services`;
  const fb = c.feedback;
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>Customer feedback</h2>
          <p>Share with the customer — not visible to executives</p>
        </div>
      </div>
      <div className="copy-row">
        <input readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Feedback link" />
        <button className="icon-btn boxed" title="Copy link" onClick={async () => toast((await copyText(url)) ? 'Link copied' : 'Could not copy')}>
          <Icon name="copy" size={16} />
        </button>
        <a className="icon-btn boxed" title="Send on WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/91${c.contact}?text=${encodeURIComponent(msg)}`}>
          <Icon name="whatsapp" size={16} />
        </a>
      </div>
      {fb ? (
        <div className="fb-received">
          <div className="fb-top">
            <Stars value={fb.rating} size={18} />
            <span className="muted small">{fmtDateTime(fb.submittedAt)}</span>
          </div>
          <ul className="fb-answers">
            {DECLARATION_QUESTIONS.map((q) => (
              <li key={q.key} className={fb[q.key] ? 'yes' : 'no'}>
                <Icon name={fb[q.key] ? 'check' : 'alert'} size={14} strokeWidth={2.4} /> {q.title}
              </li>
            ))}
          </ul>
          {fb.comments && <blockquote>{fb.comments}</blockquote>}
        </div>
      ) : (
        <p className="muted small">No feedback yet.</p>
      )}
    </section>
  );
}

function Timeline({ c, execById }) {
  const events = [
    { at: c.createdAt, text: `Case created by ${c.createdBy.name}` },
    ...c.legs.flatMap((l) => [
      l.startedAt && { at: l.startedAt, text: `${execById[l.executiveId]?.name} started ${typeOf(l.type).label.toLowerCase()} visit` },
      l.submittedAt && { at: l.submittedAt, text: `${execById[l.executiveId]?.name} submitted ${typeOf(l.type).label.toLowerCase()}` },
    ]),
    c.feedback && { at: c.feedback.submittedAt, text: 'Customer feedback received' },
    c.outcomeAt && { at: c.outcomeAt, text: `Marked ${OUTCOMES.find((o) => o.key === c.outcome)?.label} by ${c.outcomeBy?.name}` },
  ]
    .filter(Boolean)
    .sort((a, b) => a.at.localeCompare(b.at));
  const submitted = caseSubmittedAt(c);
  return (
    <section className="card">
      <div className="card-head">
        <h2>Timeline</h2>
      </div>
      <ol className="timeline">
        {events.map((e, i) => (
          <li key={i}>
            <span className="muted small">{fmtDateTime(e.at)}</span>
            <p>{e.text}</p>
          </li>
        ))}
      </ol>
      {submitted && <p className="muted small">TAT clock stopped at final submission.</p>}
    </section>
  );
}

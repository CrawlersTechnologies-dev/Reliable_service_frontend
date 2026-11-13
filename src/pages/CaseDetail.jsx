import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import * as api from '../api';
import { fileUrl } from '../api';
import { useData, useNow, useToast } from '../context/AppContext';
import { Avatar, Empty, Field, Modal, PageHeader, Pill, Stars, TatBadge, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import TatReason from '../components/TatReason';
import CaseInfoFields, { caseInfoRows, infoFromCase, infoPayload, validateInfo } from '../components/CaseInfoFields';
import { DECLARATION_QUESTIONS, OUTCOMES, QA_PARAMS, TAT_TYPES, VISIT_RESULTS, typeOf } from '../config/verification';
import { CASE_STATUS, LEG_STATUS, caseStatus, caseSubmittedAt, caseTat, deadlineOf, legTat } from '../utils/tat';
import { copyText, feedbackUrl, fmtDate, fmtDateTime } from '../utils/format';
import { directionsLink, legMapLink } from '../utils/maps';
import { buildRemarks } from '../utils/remarks';


const DEMO_TOOLS = true; // shows "simulate executive app" buttons until the mobile app exists

export default function CaseDetail() {
  const { id } = useParams();
  const { cases, bankById, executives, execById, refresh } = useData();
  const toast = useToast();
  const now = useNow(15000);
  const c = cases.find((x) => x.id === id);
  const [manualLeg, setManualLeg] = useState(null);
  const [editLeg, setEditLeg] = useState(null);
  const [reworkLeg, setReworkLeg] = useState(null);
  const [holidayOpen, setHolidayOpen] = useState(false);

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
          <div>
            <span>Customer contact</span>
            <strong className="mono">
              {c.contact}
              {c.altContact && <em className="muted"> · {c.altContact}</em>}
            </strong>
          </div>
          <div>
            <span>Holiday</span>
            <strong>
              {c.holidays?.length ? (
                <>
                  +{c.holidays.length} day{c.holidays.length > 1 ? 's' : ''} <em className="muted">({c.holidays.map((h) => fmtDate(h.date)).join(', ')})</em>
                </>
              ) : (
                <em className="muted">None</em>
              )}{' '}
              <button className="link-btn" onClick={() => setHolidayOpen(true)}>
                {c.holidays?.length ? 'Change' : 'Add holiday'}
              </button>
            </strong>
          </div>
          {c.coApplicantName && (
            <div>
              <span>Co-applicant</span>
              <strong>
                {c.coApplicantName}
                {c.coApplicantContact && <em className="muted mono"> · {c.coApplicantContact}</em>}
              </strong>
            </div>
          )}
        </div>
      </div>

      <CaseInfoCard c={c} />

      {(tat.state === 'OUT_OF_TAT' || tat.state === 'MISSED' || c.tatReason || caseStatus(c) !== 'CLOSED') && (
        <section className="card tat-reason-card">
          <div className="card-head">
            <div>
              <h2>Delay reason &amp; holiday intimation</h2>
              <p>
                Admin and operations leads can record why the case is delayed — before or after the TAT is crossed — and intimate holidays. Both print on the
                case report and the bank performance report.
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setHolidayOpen(true)}>
              <Icon name="calendar" size={14} /> {c.holidays?.length ? `Holidays (${c.holidays.length})` : 'Add holiday'}
            </button>
          </div>
          <TatReason c={c} />
        </section>
      )}

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
              onManual={() => setManualLeg(l)}
              onEdit={() => setEditLeg(l)}
              onRework={() => setReworkLeg(l)}
            />
          ))}
        </div>
        <aside className="detail-side">
          <QaPanel c={c} allSubmitted={allSubmitted} onSave={(data) => act(() => api.cases.setOutcome(c.id, data), 'Case status saved')} />
          {c.legs.some((l) => !l.internal) && <FeedbackPanel c={c} />}
          <Timeline c={c} execById={execById} />
        </aside>
      </div>

      {editLeg && (
        <EditSubmitted
          leg={editLeg}
          onClose={() => setEditLeg(null)}
          onSave={(data) =>
            act(async () => {
              await api.cases.editSubmitted(c.id, editLeg.id, data);
              setEditLeg(null);
            }, 'Details updated — they print on the report')
          }
        />
      )}
      {reworkLeg && (
        <ReworkModal
          leg={reworkLeg}
          exec={execById[reworkLeg.executiveId]}
          onClose={() => setReworkLeg(null)}
          onSave={(reason) =>
            act(async () => {
              await api.cases.rework(c.id, reworkLeg.id, reason);
              setReworkLeg(null);
            }, 'Sent back to the executive for re-work')
          }
        />
      )}
      {holidayOpen && (
        <HolidayModal
          c={c}
          onClose={() => setHolidayOpen(false)}
          onSave={(list) =>
            act(async () => {
              await api.cases.setHolidays(c.id, list);
              setHolidayOpen(false);
            }, list.length ? 'TAT adjusted for the holiday' : 'Holiday adjustment removed')
          }
        />
      )}
      {manualLeg && (
        <ManualDetails
          c={c}
          leg={manualLeg}
          onClose={() => setManualLeg(null)}
          onSave={(data) =>
            act(async () => {
              await api.cases.completeManually(c.id, manualLeg.id, data);
              setManualLeg(null);
            }, 'Details saved — set the final status to close the case')
          }
        />
      )}
    </div>
  );
}

function LegPanel({ c, leg, index, now, exec, executives, onReassign, onSimulate, onManual, onEdit, onRework }) {
  const t = typeOf(leg.type);
  const map = legMapLink(leg);
  const dir = directionsLink(leg.fromPlace, leg.toPlace);
  // manual entries may be partial: show only the answers that were filled in
  const fields = t.fields.filter((f) => (!f.showIf || f.showIf(leg.findings)) && (!leg.manual || (leg.findings[f.key] !== undefined && leg.findings[f.key] !== '')));
  const lt = legTat(c, leg, now);
  const submitted = leg.status === 'SUBMITTED';
  const result = VISIT_RESULTS.find((r) => r.key === leg.visitResult);
  const notTraced = submitted && leg.visitResult && leg.visitResult !== 'TRACED';
  const inRework = leg.rework && !leg.rework.resolvedAt;

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
              {submitted && result && <Pill tone={leg.visitResult === 'TRACED' ? 'green' : 'red'}>{result.label}</Pill>}
              {inRework && <Pill tone="amber">Re-work #{leg.rework.count}</Pill>}
            </div>
          </div>
        </div>
        <div className="leg-actions">
          {DEMO_TOOLS && !leg.internal && !submitted && (
            <button className="btn btn-ghost btn-xs demo-btn" onClick={onSimulate} title="Stand-in for the executive app">
              Demo: {leg.status === 'ASSIGNED' ? 'start visit' : 'submit visit'}
            </button>
          )}
          {(!submitted || leg.manual) && !c.outcome && (
            <button
              className={`btn btn-xs ${leg.internal && !submitted ? 'btn-primary' : 'btn-ghost'}`}
              onClick={onManual}
              title="Enter the details yourself (handled in the office)"
            >
              <Icon name="manual" size={13} /> {submitted ? 'Edit details' : 'Add details'}
            </button>
          )}
          {submitted && !leg.manual && !leg.internal && !c.outcome && (
            <>
              <button className="btn btn-ghost btn-xs" onClick={onEdit} title="Correct what the executive submitted">
                <Icon name="edit" size={13} /> Edit details
              </button>
              <button className="btn btn-ghost btn-xs" onClick={onRework} title="Send back to the executive's app">
                <Icon name="refresh" size={13} /> Re-work
              </button>
            </>
          )}
        </div>
      </div>

      <div className="leg-info">
        {leg.address && (
          <div className="info-block span-2">
            <span className="info-label">
              <Icon name="pin" size={14} /> {t.placeLabel}
            </span>
            <p>{leg.address}</p>
            <div className="chips">
              {map && !leg.internal && (
                <a className="btn btn-ghost btn-xs" href={map} target="_blank" rel="noreferrer">
                  <Icon name="external" size={13} /> Open in Maps
                </a>
              )}
              {leg.lat && !leg.internal && <span className="mono muted small">{leg.lat}, {leg.lng}</span>}
            </div>
          </div>
        )}
        {leg.pincode && !leg.internal && (
          <div className="info-block">
            <span className="info-label">
              <Icon name="pin" size={14} /> PIN code
            </span>
            <p className="mono">{leg.pincode}</p>
          </div>
        )}
        {!leg.internal && (leg.fromPlace || leg.toPlace || (leg.km != null && leg.km !== '')) && (
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
        {!leg.internal && (
          <div className="info-block">
            <span className="info-label">
              <Icon name="phone" size={14} /> Contact
            </span>
            <p className="mono">{leg.contactPerson || leg.contact || c.contact}</p>
          </div>
        )}
        {leg.trigger && (
          <div className="trigger span-2">
            <Icon name="alert" size={16} />
            <div>
              <strong>{leg.internal ? 'What to check' : 'Trigger'}</strong>
              <p>{leg.trigger}</p>
            </div>
          </div>
        )}
        {(t.isDocument || leg.attachments.length > 0) && (
          <div className="info-block span-2">
            <span className="info-label">
              <Icon name="file" size={14} /> {t.isDocument ? leg.documentName || 'Document' : 'Files'} · {leg.attachments.length} attachment{leg.attachments.length === 1 ? '' : 's'}
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

      {leg.internal ? (
        <div className="leg-exec">
          <span className="internal-badge">
            <Icon name="manual" size={18} />
          </span>
          <div className="leg-exec-who">
            <strong>Handled internally by Admin / OL</strong>
            <span className="muted small">
              {leg.completedBy ? `Details added by ${leg.completedBy.name} · ${fmtDateTime(leg.submittedAt)}` : 'No field executive — add the details when ready'}
            </span>
          </div>
        </div>
      ) : (
      <div className="leg-exec">
        <Avatar name={exec?.name || '?'} photo={exec?.photo} size={38} />
        <div className="leg-exec-who">
          <strong>{exec?.name || 'Unassigned'}</strong>
          <span className="muted small">
            {[exec?.employeeId, exec?.location, exec?.pincode && `PIN ${exec.pincode}`, exec?.mobile].filter(Boolean).join(' · ')}
          </span>
        </div>
        {!submitted && (
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
      )}

      {inRework && (
        <div className="rework-note">
          <Icon name="refresh" size={16} />
          <div>
            <strong>Sent back for re-work by {leg.rework.by?.name} · {fmtDateTime(leg.rework.at)}</strong>
            <p>{leg.rework.reason}</p>
          </div>
        </div>
      )}
      {leg.attempts?.length > 0 && (
        <div className="attempts">
          <strong>Visit attempts</strong>
          <ul>
            {leg.attempts.map((a, i) => (
              <li key={i}>
                <span className="muted small">{fmtDateTime(a.at)}</span> — Customer asked to visit later: {a.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {submitted && (
        <div className="findings">
          <div className="findings-head">
            <h4>{leg.manual ? 'Details (entered manually)' : notTraced ? `Verification not done — ${result?.label}` : 'Executive findings'}</h4>
            <span className="muted small">
              {leg.manual ? `By ${leg.completedBy?.name || 'Admin / OL'} · ` : 'Submitted '}
              {fmtDateTime(leg.submittedAt)}
              {leg.editedBy && ` · edited by ${leg.editedBy.name} ${fmtDateTime(leg.editedAt)}`}
            </span>
          </div>
          {notTraced && (
            <div className="not-traced">
              <strong>Executive's reason</strong>
              <p>{leg.nonVisitReason}</p>
            </div>
          )}
          {fields.length > 0 && !notTraced && (
          <dl className="kv">
            {fields.map((f) => (
              <div key={f.key}>
                <dt>{f.label}</dt>
                <dd>{leg.findings[f.key] ?? '—'}</dd>
              </div>
            ))}
          </dl>
          )}
          {!notTraced && (
          <div className="remarks">
            {buildRemarks(leg.type, leg.findings, leg).map(([title, text]) => (
              <p key={title}>
                <strong>{title}:</strong> {text}
              </p>
            ))}
          </div>
          )}
          {notTraced && leg.photoDetails?.length > 0 && (
            <div className="photo-strip">
              {leg.photoDetails.map((p) => (
                <a key={p.slot} className="photo-slot has" href={fileUrl(p.url)} target="_blank" rel="noreferrer" title={p.label}>
                  <img src={fileUrl(p.url)} alt={p.label} loading="lazy" />
                  <span>{p.label}</span>
                </a>
              ))}
            </div>
          )}
          {!notTraced && t.photos.length > 0 && leg.photos.some(Boolean) && (
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
          )}
        </div>
      )}
    </section>
  );
}

// Admin / OL enter a verification's details themselves (Bank statement, or any
// case handled in the office) — saving marks it submitted so the case can be closed.
function ManualDetails({ c, leg, onClose, onSave }) {
  const t = typeOf(leg.type);
  const [findings, setFindings] = useState({ ...(leg.findings || {}) });
  const [remarks, setRemarks] = useState(leg.manualRemarks || '');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const setF = (k) => (e) => setFindings((f) => ({ ...f, [k]: e.target.value }));
  const visible = t.fields.filter((f) => !f.showIf || f.showIf(findings));
  const empty = !remarks.trim() && !Object.values(findings).some((v) => v !== '' && v != null);

  async function save() {
    setBusy(true);
    const clean = Object.fromEntries(Object.entries(findings).filter(([, v]) => v !== '' && v != null));
    await onSave({ findings: clean, remarks: remarks.trim(), files });
    setBusy(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      width={760}
      title={`${t.label} — ${leg.manual ? 'edit' : 'add'} details`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy || empty} onClick={save}>
            {busy ? 'Saving…' : 'Save & mark completed'}
          </button>
        </>
      }
    >
      <p className="muted small manual-note">
        {t.internal
          ? 'Enter what was verified. Fill what you have — blank fields are left out of the report.'
          : `Use this when the case is handled in the office instead of a field visit. ${leg.status !== 'ASSIGNED' ? 'The executive has already started this visit. ' : ''}Blank fields are left out of the report.`}
        {' '}After saving, set the final status to close the case.
      </p>
      <div className="form-grid">
        {visible.map((f) => (
          <Field key={f.key} label={f.label} className={f.type === 'textarea' ? 'span-2' : ''}>
            {f.type === 'select' ? (
              <select value={findings[f.key] ?? ''} onChange={setF(f.key)}>
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea rows={2} value={findings[f.key] ?? ''} onChange={setF(f.key)} />
            ) : (
              <input type={f.type === 'number' ? 'number' : 'text'} value={findings[f.key] ?? ''} onChange={setF(f.key)} />
            )}
          </Field>
        ))}
        <Field label="Remarks" className="span-2" hint="Printed on the bank report">
          <textarea rows={3} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g. Statement verified with the branch manager; matches the bank's records." />
        </Field>
        <Field label={t.internal ? 'Attach statement / proof (optional)' : 'Attach proof (optional)'} className="span-2">
          <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files))} />
        </Field>
      </div>
    </Modal>
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
          <Icon name="clock" size={16} /> Waiting for {c.legs.filter((l) => l.status !== 'SUBMITTED').length} verification(s).
          {c.legs.some((l) => l.internal && l.status !== 'SUBMITTED') && ' Use "Add details" on the internal one.'}
        </div>
      )}
      {c.outcome && !editing ? (
        <div className="qa-done">
          <Pill tone={current.tone}>{current.label}</Pill>
          <p className="small">
            by {c.outcomeBy?.name} · {fmtDateTime(c.outcomeAt)}
          </p>
          {c.qaRemarks && <blockquote>{c.qaRemarks}</blockquote>}
          {c.deleteAt && (
            <p className="retention-note">
              <Icon name="trash" size={14} /> This case, its photos and documents will be permanently deleted on <strong>{fmtDate(c.deleteAt)}</strong>.
              Download the report before then.
            </p>
          )}
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
    ...c.legs.flatMap((l) => {
      const label = typeOf(l.type).label.toLowerCase();
      return [
        // reassignment history: kept here for admin / OL only
        ...(l.transfers || []).map((t) => ({
          at: t.at,
          text: `${label[0].toUpperCase()}${label.slice(1)} moved from ${t.from?.name || 'unassigned'} to ${t.to?.name} by ${t.by?.name}`,
          tone: 'transfer',
        })),
        !l.manual && l.startedAt && { at: l.startedAt, text: `${execById[l.executiveId]?.name || 'Executive'} started ${label} visit` },
        l.submittedAt &&
          (l.manual
            ? { at: l.submittedAt, text: `${l.completedBy?.name || 'Admin / OL'} added ${label} details manually` }
            : { at: l.submittedAt, text: `${execById[l.executiveId]?.name || 'Executive'} submitted ${label}` }),
      ];
    }),
    c.tatReason && { at: c.tatReason.at, text: `Out-of-TAT reason added by ${c.tatReason.by?.name}` },
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
          <li key={i} className={e.tone ? `tl-${e.tone}` : ''}>
            <span className="muted small">{fmtDateTime(e.at)}</span>
            <p>{e.text}</p>
          </li>
        ))}
      </ol>
      {submitted && <p className="muted small">TAT clock stopped at final submission.</p>}
    </section>
  );
}

/* ---------------- Customer & bank details (editable by Admin / OL) ---------------- */
function CaseInfoCard({ c }) {
  const { refresh } = useData();
  const toast = useToast();
  const [form, setForm] = useState(null); // null = closed
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const rows = caseInfoRows(c);
  const missing = !c.bankerCaseId || !c.branchName || !c.loanAmount || !c.dedupeCheck || !c.profile;

  async function save() {
    const e = validateInfo(form);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.cases.updateDetails(c.id, infoPayload(form));
      await refresh();
      toast('Case details saved');
      setForm(null);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card case-info-card">
      <div className="card-head">
        <div>
          <h2>Customer &amp; bank details</h2>
          <p>{missing ? 'Some required details are missing on this case — fill them in.' : 'Printed on page 1 of the bank report'}</p>
        </div>
        <button
          className={`btn ${missing ? 'btn-primary' : 'btn-ghost'} btn-sm`}
          onClick={() => {
            setErrors({});
            setForm(infoFromCase(c));
          }}
        >
          <Icon name="edit" size={15} /> {missing ? 'Add details' : 'Edit details'}
        </button>
      </div>
      <dl className="info-grid">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className={k === 'PAN' ? 'mono' : ''}>{v || <span className="muted">—</span>}</dd>
          </div>
        ))}
      </dl>
      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title="Customer & bank details"
        width={760}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save details'}</button>
          </>
        }
      >
        {form && (
          <div className="form-grid">
            <CaseInfoFields form={form} setForm={setForm} errors={errors} caseId={c.id} />
          </div>
        )}
      </Modal>
    </section>
  );
}

/* ---------------- Edit what the executive submitted (Admin / OL) ---------------- */
function EditSubmitted({ leg, onClose, onSave }) {
  const t = typeOf(leg.type);
  const notTraced = leg.visitResult && leg.visitResult !== 'TRACED';
  const [findings, setFindings] = useState({ ...(leg.findings || {}) });
  const [reason, setReason] = useState(leg.nonVisitReason || '');
  const [busy, setBusy] = useState(false);
  const setF = (k) => (e) => setFindings((f) => ({ ...f, [k]: e.target.value }));
  const visible = t.fields.filter((f) => !f.showIf || f.showIf(findings));

  async function save() {
    setBusy(true);
    await onSave(notTraced ? { findings: {}, nonVisitReason: reason.trim() } : { findings });
    setBusy(false);
  }

  return (
    <Modal
      open
      onClose={onClose}
      width={760}
      title={`${t.label} — edit submitted details`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save changes'}</button>
        </>
      }
    >
      <p className="muted small manual-note">Changes print on the bank report. Photos stay as the executive took them. Your name is recorded as the editor.</p>
      {notTraced ? (
        <Field label="Reason the verification could not be done" className="span-2">
          <textarea rows={5} value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
      ) : (
        <div className="form-grid">
          {visible.map((f) => (
            <Field key={f.key} label={f.label} className={f.type === 'textarea' ? 'span-2' : ''}>
              {f.type === 'select' ? (
                <select value={findings[f.key] ?? ''} onChange={setF(f.key)}>
                  <option value="">—</option>
                  {f.options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : f.type === 'textarea' ? (
                <textarea rows={2} value={findings[f.key] ?? ''} onChange={setF(f.key)} />
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} value={findings[f.key] ?? ''} onChange={setF(f.key)} />
              )}
            </Field>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ---------------- Send a visit back to the executive ---------------- */
function ReworkModal({ leg, exec, onClose, onSave }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const t = typeOf(leg.type);
  return (
    <Modal
      open
      onClose={onClose}
      title={`Re-work — ${t.label}`}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={busy || reason.trim().length < 5}
            onClick={async () => {
              setBusy(true);
              await onSave(reason.trim());
              setBusy(false);
            }}
          >
            {busy ? 'Sending…' : 'Send for re-work'}
          </button>
        </>
      }
    >
      <p className="muted small manual-note">
        The visit moves to the <strong>Re-work</strong> tab in {exec?.name ? `${exec.name}'s` : "the executive's"} app with your note. Their answers and photos stay filled in; they correct what is needed and resubmit.
      </p>
      <Field label="What should be corrected?" required>
        <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Selfie with the house is missing; name board photo is blurred." autoFocus />
      </Field>
    </Modal>
  );
}

/* ---------------- Holiday adjustment of the TAT ---------------- */
function HolidayModal({ c, onClose, onSave }) {
  const [list, setList] = useState(c.holidays?.length ? c.holidays.map((h) => ({ date: h.date, note: h.note })) : [{ date: c.createdAt.slice(0, 10), note: '' }]);
  const [busy, setBusy] = useState(false);
  const set = (i, k) => (e) => setList((l) => l.map((h, j) => (j === i ? { ...h, [k]: e.target.value } : h)));
  const valid = list.every((h) => /^\d{4}-\d{2}-\d{2}$/.test(h.date));
  return (
    <Modal
      open
      onClose={onClose}
      title="Holiday — adjust TAT"
      footer={
        <>
          {c.holidays?.length > 0 && (
            <button className="btn btn-ghost" disabled={busy} onClick={() => onSave([])}>Remove adjustment</button>
          )}
          <span className="spacer" />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={busy || !valid || !list.length}
            onClick={async () => {
              setBusy(true);
              await onSave(list);
              setBusy(false);
            }}
          >
            Save
          </button>
        </>
      }
    >
      <p className="muted small manual-note">
        Each holiday adds 24 hours to this case's TAT, so a delay caused by the holiday is counted as within TAT on the reports. Use it after confirming the holiday with the client.
      </p>
      {list.map((h, i) => (
        <div key={i} className="holiday-row">
          <Field label={`Holiday ${list.length > 1 ? i + 1 : ''}`}>
            <input type="date" value={h.date} onChange={set(i, 'date')} />
          </Field>
          <Field label="Note">
            <input value={h.note} onChange={set(i, 'note')} placeholder="e.g. Dasara — bank closed" />
          </Field>
          {list.length > 1 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setList((l) => l.filter((_, j) => j !== i))} aria-label="Remove">
              <Icon name="x" size={15} />
            </button>
          )}
        </div>
      ))}
      {list.length < 5 && (
        <button className="link-btn" onClick={() => setList((l) => [...l, { date: '', note: '' }])}>
          <Icon name="plus" size={14} /> Add another day
        </button>
      )}
    </Modal>
  );
}

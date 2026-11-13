import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useData, useToast } from '../context/AppContext';
import { Field, Modal, PageHeader, Segmented, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import { DOCUMENT_NAMES, PINCODE_RE, TAT_TYPES, TYPE_LIST, typeOf } from '../config/verification';
import { coordsFromLink, directionsLink } from '../utils/maps';
import { copyText, feedbackUrl, fmtDateTime, inr } from '../utils/format';
import { caseStatus } from '../utils/tat';
import { rankByPincode, suggestExecutive } from '../utils/pincode';
import CaseInfoFields, { EMPTY_INFO, infoPayload, productOf, validateInfo } from '../components/CaseInfoFields';

let tmpId = 0;
const newLeg = (type) => ({
  key: ++tmpId,
  type,
  address: '',
  pincode: '',
  mapLink: '',
  fromPlace: '',
  toPlace: '',
  km: '',
  contact: '',
  trigger: '',
  executiveId: '',
  execPicked: false, // true once the user chooses an executive by hand (stop auto-suggesting)
  documentName: '',
  documentOther: '',
  docNo: '', // internal document check
  docDetails: '',
  docStatus: '',
  attachments: [],
  contactPerson: '',
});

const EMPTY_FORM = { ...EMPTY_INFO, bankId: '', tatType: 'LOCAL' };
const digits = (v) => v.replace(/\D/g, '');

export default function NewCase() {
  const { banks, executives, cases, refresh } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [createdAt] = useState(() => new Date());
  const [form, setForm] = useState(EMPTY_FORM);
  const [legs, setLegs] = useState([newLeg('RESIDENCE')]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const setLeg = (key, patch) => setLegs((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLeg = (type) => setLegs((ls) => [...ls, newLeg(type)]);
  const removeLeg = (key) => setLegs((ls) => ls.filter((l) => l.key !== key));

  // Open (not yet submitted) verifications per executive — tie-breaker when several are equally near.
  const openLoad = useMemo(() => {
    const m = {};
    cases.filter((c) => caseStatus(c) !== 'CLOSED').forEach((c) => c.legs.forEach((l) => {
      if (l.status !== 'SUBMITTED' && l.executiveId) m[l.executiveId] = (m[l.executiveId] || 0) + 1;
    }));
    return m;
  }, [cases]);
  const activeExecs = executives.filter((e) => e.status === 'Active');
  const activeBanks = banks.filter((b) => b.status === 'Active');
  const deadline = new Date(createdAt.getTime() + TAT_TYPES[form.tatType].hours * 3600e3);
  const product = productOf(form);

  function validate() {
    const e = {};
    if (!form.bankId) e.bankId = 'Choose the client bank';
    Object.assign(e, validateInfo(form));
    legs.forEach((l) => {
      const t = typeOf(l.type);
      const field = !t.isDocument && !t.internal;
      if (!t.isDocument && !l.address.trim()) e[`${l.key}.address`] = t.internal ? 'Enter the bank / branch' : 'Address is required';
      if (field && !PINCODE_RE.test(l.pincode)) e[`${l.key}.pincode`] = 'Enter the 6-digit PIN code';
      if (t.isDocument && l.pincode && !PINCODE_RE.test(l.pincode)) e[`${l.key}.pincode`] = 'Enter the 6-digit PIN code';
      if (!t.internal && !l.executiveId) e[`${l.key}.executiveId`] = 'Assign an executive';
      if (l.km !== '' && Number(l.km) < 0) e[`${l.key}.km`] = 'Distance cannot be negative';
      if (l.mapLink && !/^https:\/\//i.test(l.mapLink)) e[`${l.key}.mapLink`] = 'Paste a full https:// Google Maps link';
      if (t.isDocument) {
        if (!l.documentName) e[`${l.key}.documentName`] = 'Choose the document';
        if (l.documentName === 'Other' && !l.documentOther.trim()) e[`${l.key}.documentName`] = 'Enter the document name';
      }
    });
    setErrors(e);
    return e;
  }

  async function submit(ev) {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields', 'error');
      requestAnimationFrame(() => document.querySelector('.field-error')?.closest('.field')?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      return;
    }
    setBusy(true);
    try {
      const c = await api.cases.create({
        ...infoPayload(form),
        bankId: form.bankId,
        tatType: form.tatType,
        legs: legs.map(({ key, documentOther, execPicked, docNo, docDetails, docStatus, ...l }) => {
          const internal = typeOf(l.type).internal;
          return {
            ...l,
            ...(typeOf(l.type).isDocument && internal && {
              findings: Object.fromEntries(
                Object.entries({ documentNo: docNo.trim(), details: docDetails.trim(), documentStatus: docStatus }).filter(([, v]) => v),
              ),
            }),
            executiveId: internal ? '' : l.executiveId,
            documentName: l.documentName === 'Other' ? documentOther.trim() : l.documentName,
            contact: internal ? '' : digits(l.contact) || digits(form.contact),
            km: l.km === '' ? null : Number(l.km),
            attachments: l.attachments.map(({ file, name, type, size }) => ({ file, name, type, size })),
          };
        }),
      });
      await refresh();
      setCreated(c);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setCreated(null);
    setForm({ ...EMPTY_FORM, bankId: form.bankId, tatType: form.tatType });
    setLegs([newLeg('RESIDENCE')]);
    setErrors({});
    window.scrollTo({ top: 0 });
  }

  const combined = legs.length > 1;

  return (
    <div className="page">
      <PageHeader title="New case" subtitle="Allocate one or more verifications for a customer. Each location gets its own executive; the bank receives one combined report." />

      <form className="newcase" onSubmit={submit} noValidate>
        <div className="newcase-main">
          <section className="card form-card">
            <div className="card-head">
              <div>
                <h2>Customer & client</h2>
              </div>
              <span className="auto-date">
                <Icon name="calendar" size={15} /> {fmtDateTime(createdAt)} <em>auto</em>
              </span>
            </div>
            <div className="form-grid">
              <Field label="Client / bank" required error={errors.bankId}>
                <select value={form.bankId} onChange={set('bankId')}>
                  <option value="">Choose bank</option>
                  {activeBanks.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </Field>
              <CaseInfoFields form={form} setForm={setForm} errors={errors} />
              <Field label="TAT" className="span-2" hint={`Deadline: ${fmtDateTime(deadline)}. After this the case turns red and starts counting extra time.`}>
                <Segmented
                  value={form.tatType}
                  onChange={set('tatType')}
                  options={Object.values(TAT_TYPES).map((t) => ({ value: t.key, label: `${t.label} · ${t.hours}h` }))}
                />
              </Field>
            </div>
          </section>

          <section className="card form-card">
            <div className="card-head">
              <div>
                <h2>Verifications</h2>
                <p>Add one per location. Two or more makes a combined case (e.g. residence in Kalaburagi + business in Hubballi).</p>
              </div>
            </div>
            <div className="type-picker">
              {TYPE_LIST.map((t) => (
                <button type="button" key={t.key} className={`type-add tone-${t.tone}`} onClick={() => addLeg(t.key)} title={t.hint || `Add ${t.label} verification`}>
                  <Icon name="plus" size={15} strokeWidth={2.4} />
                  {t.label}
                </button>
              ))}
            </div>
          </section>

          {legs.map((l, i) => (
            <LegCard
              key={l.key}
              leg={l}
              index={i}
              count={legs.length}
              errors={errors}
              execs={activeExecs}
              openLoad={openLoad}
              defaultContact={form.contact}
              onChange={(patch) => setLeg(l.key, patch)}
              onRemove={() => removeLeg(l.key)}
            />
          ))}
          {legs.length === 0 && <div className="alert alert-yellow">Add at least one verification above.</div>}
        </div>

        <aside className="newcase-side">
          <div className="card summary">
            <h3>Summary</h3>
            <dl>
              <dt>Bank</dt>
              <dd>{banks.find((b) => b.id === form.bankId)?.name || '—'}</dd>
              <dt>Customer</dt>
              <dd>{form.customerName || '—'}</dd>
              {form.coApplicantName && (
                <>
                  <dt>Co-applicant</dt>
                  <dd>{form.coApplicantName}</dd>
                </>
              )}
              <dt>Product</dt>
              <dd>{product || '—'}</dd>
              {form.bankerCaseId && (
                <>
                  <dt>Banker case ID</dt>
                  <dd>{form.bankerCaseId}</dd>
                </>
              )}
              {Number(form.loanAmount) > 0 && (
                <>
                  <dt>Loan amount</dt>
                  <dd>{inr(Number(form.loanAmount))}</dd>
                </>
              )}
              <dt>TAT</dt>
              <dd>
                {TAT_TYPES[form.tatType].label} ({TAT_TYPES[form.tatType].hours}h) · due {fmtDateTime(deadline)}
              </dd>
              <dt>Case type</dt>
              <dd>{combined ? `Combined · ${legs.length} verifications` : legs.length ? 'Single verification' : '—'}</dd>
            </dl>
            <ul className="summary-legs">
              {legs.map((l) => (
                <li key={l.key}>
                  <TypeChip type={l.type} />
                  <span>
                    {typeOf(l.type).internal
                      ? <em className="muted">Admin / OL (internal)</em>
                      : executives.find((e) => e.id === l.executiveId)?.name || <em className="muted">No executive yet</em>}
                  </span>
                </li>
              ))}
            </ul>
            <button className="btn btn-primary btn-block" disabled={busy || !legs.length}>
              {busy ? 'Creating…' : 'Create case'}
            </button>
            <p className="muted small">A customer feedback link is generated with the case. Share it from here — executives never see it.</p>
          </div>
        </aside>
      </form>

      <Modal
        open={!!created}
        onClose={() => navigate(`/cases/${created.id}`)}
        title="Case created"
        footer={
          <>
            <button className="btn btn-ghost" onClick={reset}>Create another</button>
            <Link className="btn btn-primary" to={`/cases/${created?.id}`}>Open case</Link>
          </>
        }
      >
        {created && <CreatedBody c={created} />}
      </Modal>
    </div>
  );
}

function CreatedBody({ c }) {
  const toast = useToast();
  const url = feedbackUrl(c.feedbackToken);
  const msg = `Dear ${c.customerName}, after our field executive's visit please share your feedback here: ${url} — Reliable Services`;
  const field = c.legs.filter((l) => !l.internal).length;
  const internal = c.legs.length - field;
  return (
    <div className="created">
      <div className="created-id">
        <Icon name="checkCircle" size={28} />
        <div>
          <span className="muted">Case ID</span>
          <strong className="mono">{c.caseNo}</strong>
        </div>
      </div>
      {field > 0 && (
        <p>{field > 1 ? `${field} verifications were` : 'The verification was'} assigned and will appear in the executive app right away.</p>
      )}
      {internal > 0 && <p>Add the bank statement details from the case page when they are ready, then set the final status.</p>}
      {field > 0 && (
        <div className="feedback-box">
          <span className="field-label">Customer feedback link</span>
          <div className="copy-row">
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
            <button className="btn btn-dark btn-sm" onClick={async () => toast((await copyText(url)) ? 'Link copied' : 'Could not copy')}>
              <Icon name="copy" size={15} /> Copy
            </button>
            <a className="btn btn-ghost btn-sm" target="_blank" rel="noreferrer" href={`https://wa.me/91${c.contact}?text=${encodeURIComponent(msg)}`}>
              <Icon name="whatsapp" size={15} /> WhatsApp
            </a>
          </div>
          <span className="field-hint">Only admins and operational leads can see and share this link.</span>
        </div>
      )}
    </div>
  );
}

function LegCard({ leg, index, count, errors, execs, openLoad, defaultContact, onChange, onRemove }) {
  const t = typeOf(leg.type);
  const err = (k) => errors[`${leg.key}.${k}`];
  const coords = coordsFromLink(leg.mapLink);
  const dir = directionsLink(leg.fromPlace, leg.toPlace);
  const pinOk = PINCODE_RE.test(leg.pincode);

  // nearest executives first (by PIN code), then fewer open cases
  const ranked = useMemo(() => rankByPincode(execs, pinOk ? leg.pincode : '', openLoad), [execs, leg.pincode, pinOk, openLoad]);
  const suggestion = pinOk ? suggestExecutive(execs, leg.pincode, openLoad) : null;

  const onPincode = (v) => {
    const pincode = v.replace(/\D/g, '').slice(0, 6);
    const patch = { pincode };
    // auto-pick the nearest executive until the user chooses one by hand
    if (!leg.execPicked && !t.internal && PINCODE_RE.test(pincode)) {
      patch.executiveId = suggestExecutive(execs, pincode, openLoad)?.exec.id || '';
    }
    onChange(patch);
  };

  const onFiles = (files) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    onChange({ attachments: [...leg.attachments, ...list.map((f) => ({ file: f, name: f.name, type: f.type, size: f.size, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }))] });
  };

  const attachments = (label, min) => (
    <div className="span-2">
      <Field label={label} required={min > 0} error={err('attachments')}>
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFiles(e.dataTransfer.files);
          }}
        >
          <Icon name="upload" size={22} />
          <span>
            Drop files here or <u>browse</u>
          </span>
          <small>{min ? `${leg.attachments.length} / ${min} minimum` : `${leg.attachments.length} added`}</small>
          <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => onFiles(e.target.files)} />
        </div>
      </Field>
      {leg.attachments.length > 0 && (
        <ul className="thumbs">
          {leg.attachments.map((a, i) => (
            <li key={i}>
              {a.preview ? <img src={a.preview} alt="" /> : <Icon name="file" size={22} />}
              <span title={a.name}>{a.name}</span>
              <button type="button" onClick={() => onChange({ attachments: leg.attachments.filter((_, j) => j !== i) })} aria-label="Remove file">
                <Icon name="x" size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <section className={`card leg-card tone-${t.tone}`}>
      <div className="leg-head">
        <div className="leg-title">
          <span className="leg-num">{index + 1}</span>
          <div>
            <h3>{t.label} verification</h3>
            {t.hint && <span className="muted small">{t.hint}</span>}
          </div>
        </div>
        {count > 1 && (
          <button type="button" className="icon-btn" onClick={onRemove} title="Remove this verification">
            <Icon name="trash" size={17} />
          </button>
        )}
      </div>

      {t.isDocument && t.internal ? (
        <div className="form-grid">
          <div className="alert alert-yellow span-2">
            <Icon name="manual" size={16} /> Internal check document — no field visit. Fill the details now (they print on the bank report) or later from the case page.
          </div>
          <Field label="Document type" required error={err('documentName')}>
            <select value={leg.documentName} onChange={(e) => onChange({ documentName: e.target.value })}>
              <option value="">Choose document</option>
              {DOCUMENT_NAMES.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          {leg.documentName === 'Other' ? (
            <Field label="Specify document" required>
              <input value={leg.documentOther} onChange={(e) => onChange({ documentOther: e.target.value })} />
            </Field>
          ) : (
            <Field label="Document No.">
              <input value={leg.docNo} onChange={(e) => onChange({ docNo: e.target.value })} placeholder="e.g. KH/DVG/2024/1187" />
            </Field>
          )}
          {leg.documentName === 'Other' && (
            <Field label="Document No.">
              <input value={leg.docNo} onChange={(e) => onChange({ docNo: e.target.value })} placeholder="e.g. KH/DVG/2024/1187" />
            </Field>
          )}
          <Field label="Document status">
            <select value={leg.docStatus} onChange={(e) => onChange({ docStatus: e.target.value })}>
              <option value="">Not checked yet</option>
              {['Genuine', 'Fake', 'Could not verify'].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Verification details" className="span-2" hint="Printed on the bank report. Leave empty to fill in later.">
            <textarea rows={3} value={leg.docDetails} onChange={(e) => onChange({ docDetails: e.target.value })} placeholder="e.g. Checked with the Taluk office register — owner name, survey no. and issue date match." />
          </Field>
          <Field label={t.placeLabel} className="span-2">
            <input value={leg.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="e.g. Taluk Office, Davanagere" />
          </Field>
          {attachments('Document copies (photos / PDF, optional)', 0)}
        </div>
      ) : t.internal ? (
        <div className="form-grid">
          <div className="alert alert-yellow span-2">
            <Icon name="manual" size={16} /> No field visit. After creating the case, open it and use <strong>Add details</strong> to enter the statement findings, then set the final status.
          </div>
          <Field label={t.placeLabel} required className="span-2" error={err('address')}>
            <input value={leg.address} onChange={(e) => onChange({ address: e.target.value })} placeholder="e.g. Canara Bank, Vidyanagar branch, Hubballi" />
          </Field>
          <Field label="What to check" className="span-2">
            <textarea rows={2} value={leg.trigger} onChange={(e) => onChange({ trigger: e.target.value })} placeholder="e.g. Verify last 6 months statement and salary credits with the branch" />
          </Field>
          {attachments('Bank statement (PDF / photos, optional)', 0)}
        </div>
      ) : (
        <div className="form-grid">
          {t.isDocument && (
            <>
              <div className="alert alert-blue span-2">
                <Icon name="route" size={16} />
                <span>
                  Allocated to a field executive, who verifies the document at the issuing office and answers the questions in the app. For an office-only check,
                  choose <strong>Internal check document</strong> instead.
                </span>
              </div>
              <Field label="Document type" required error={err('documentName')}>
                <select value={leg.documentName} onChange={(e) => onChange({ documentName: e.target.value })}>
                  <option value="">Choose document</option>
                  {DOCUMENT_NAMES.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
              </Field>
              {leg.documentName === 'Other' ? (
                <Field label="Specify document" required>
                  <input value={leg.documentOther} onChange={(e) => onChange({ documentOther: e.target.value })} />
                </Field>
              ) : (
                <span />
              )}
              {attachments('Document copies for the executive (photos / PDF, optional)', 0)}
            </>
          )}

          <Field label={t.placeLabel} required={!t.isDocument} className="span-2" error={err('address')}>
            <textarea rows={2} value={leg.address} onChange={(e) => onChange({ address: e.target.value })} placeholder={t.isDocument ? 'e.g. Taluk Office, Davanagere' : 'Full address with landmark'} />
          </Field>

          <Field label="PIN code" required={!t.isDocument} error={err('pincode')} hint="The nearest executive is picked from this">
            <input inputMode="numeric" maxLength={6} value={leg.pincode} onChange={(e) => onPincode(e.target.value)} placeholder="580021" />
          </Field>
          <Field label="Google Maps link" error={err('mapLink')} hint={coords ? `Location read from link: ${coords.lat}, ${coords.lng}` : 'Paste the location link (optional)'}>
            <div className="input-icon">
              <Icon name="link" size={16} />
              <input value={leg.mapLink} onChange={(e) => onChange({ mapLink: e.target.value.trim() })} placeholder="https://maps.google.com/…" />
              {leg.mapLink && /^https:\/\//i.test(leg.mapLink) && (
                <a className="btn btn-ghost btn-xs" href={leg.mapLink} target="_blank" rel="noreferrer">
                  <Icon name="pin" size={14} /> Open
                </a>
              )}
            </div>
          </Field>

          <div className="span-2 route-row">
            <Field label="From (place)">
              <input value={leg.fromPlace} onChange={(e) => onChange({ fromPlace: e.target.value })} placeholder="e.g. Hubballi office" />
            </Field>
            <Icon name="route" size={18} className="route-icon" />
            <Field label="To (place)">
              <input value={leg.toPlace} onChange={(e) => onChange({ toPlace: e.target.value })} placeholder="e.g. Kalaburagi" />
            </Field>
            <Field label="Distance (km)" error={err('km')}>
              <input type="number" min="0" step="0.1" value={leg.km} onChange={(e) => onChange({ km: e.target.value })} />
            </Field>
            {dir && (
              <a className="link small route-check" href={dir} target="_blank" rel="noreferrer">
                Check route in Maps
              </a>
            )}
          </div>

          {!t.isDocument && (
            <Field label="Contact number at this location" hint={defaultContact ? `Leave blank to use ${defaultContact}` : 'Leave blank to use the customer number'}>
              <input inputMode="numeric" value={leg.contact} onChange={(e) => onChange({ contact: e.target.value })} />
            </Field>
          )}
          <Field label="Assign field executive" required error={err('executiveId')} className={t.isDocument ? 'span-2' : ''}>
            <select value={leg.executiveId} onChange={(e) => onChange({ executiveId: e.target.value, execPicked: true })}>
              <option value="">{pinOk ? 'Choose executive' : 'Enter the PIN code to see the nearest'}</option>
              {ranked.map(({ exec: e, match, open }) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.location}
                  {pinOk && match.label ? ` · ${match.label}` : ''} · {open} open
                </option>
              ))}
            </select>
            {suggestion && (
              <span className={`nearest ${leg.executiveId === suggestion.exec.id ? 'is-picked' : ''}`}>
                <Icon name="pin" size={13} /> Nearest: <strong>{suggestion.exec.name}</strong> ({suggestion.match.label}, PIN {suggestion.exec.pincode}, {suggestion.open} open)
                {leg.executiveId !== suggestion.exec.id && (
                  <button type="button" className="link-btn" onClick={() => onChange({ executiveId: suggestion.exec.id, execPicked: true })}>
                    Use
                  </button>
                )}
              </span>
            )}
            {pinOk && !suggestion && <span className="field-hint">No executive based in this district — choose manually.</span>}
          </Field>
          <Field label="Trigger (what the executive should check)" className="span-2">
            <textarea rows={2} value={leg.trigger} onChange={(e) => onChange({ trigger: e.target.value })} placeholder="e.g. Check properly whether the property belongs to the applicant's uncle" />
          </Field>
        </div>
      )}
    </section>
  );
}

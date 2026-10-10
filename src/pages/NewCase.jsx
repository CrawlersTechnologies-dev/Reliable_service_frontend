import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useData, useToast } from '../context/AppContext';
import { Field, Modal, PageHeader, Segmented, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import { DOCUMENT_NAMES, PRODUCTS, TAT_TYPES, TYPE_LIST, typeOf } from '../config/verification';
import { coordsFromLink, directionsLink, mapLinkFromCoords } from '../utils/maps';
import { copyText, feedbackUrl, fmtDateTime } from '../utils/format';
import { caseStatus } from '../utils/tat';

const MIN_DOCS = 6;
let tmpId = 0;
const newLeg = (type) => ({
  key: ++tmpId,
  type,
  address: '',
  mapLink: '',
  lat: '',
  lng: '',
  fromPlace: '',
  toPlace: '',
  km: '',
  contact: '',
  trigger: '',
  executiveId: '',
  documentName: '',
  documentOther: '',
  attachments: [],
  contactPerson: '',
});

export default function NewCase() {
  const { banks, executives, cases, refresh } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [createdAt] = useState(() => new Date());
  const [form, setForm] = useState({ bankId: '', customerName: '', product: '', contact: '', tatType: 'LOCAL' });
  const [legs, setLegs] = useState([newLeg('RESIDENCE')]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const setLeg = (key, patch) => setLegs((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLeg = (type) => setLegs((ls) => [...ls, newLeg(type)]);
  const removeLeg = (key) => setLegs((ls) => ls.filter((l) => l.key !== key));

  // Open (not yet submitted) verifications per executive — helps pick someone free.
  const openLoad = useMemo(() => {
    const m = {};
    cases.filter((c) => caseStatus(c) !== 'CLOSED').forEach((c) => c.legs.forEach((l) => {
      if (l.status !== 'SUBMITTED') m[l.executiveId] = (m[l.executiveId] || 0) + 1;
    }));
    return m;
  }, [cases]);
  const activeExecs = executives.filter((e) => e.status === 'Active');
  const activeBanks = banks.filter((b) => b.status === 'Active');
  const deadline = new Date(createdAt.getTime() + TAT_TYPES[form.tatType].hours * 3600e3);

  function validate() {
    const e = {};
    if (!form.bankId) e.bankId = 'Choose the client bank';
    if (!form.customerName.trim()) e.customerName = 'Enter the customer name';
    if (!form.product.trim()) e.product = 'Enter the product';
    if (!/^\d{10}$/.test(form.contact.replace(/\D/g, ''))) e.contact = 'Enter a 10-digit mobile number';
    legs.forEach((l) => {
      const t = typeOf(l.type);
      if (!t.isDocument && !l.address.trim()) e[`${l.key}.address`] = 'Address is required';
      if (!l.executiveId) e[`${l.key}.executiveId`] = 'Assign an executive';
      if (l.km !== '' && Number(l.km) < 0) e[`${l.key}.km`] = 'Distance cannot be negative';
      if (t.isDocument) {
        if (!l.documentName) e[`${l.key}.documentName`] = 'Choose the document';
        if (l.documentName === 'Other' && !l.documentOther.trim()) e[`${l.key}.documentName`] = 'Enter the document name';
        if (l.attachments.length < MIN_DOCS) e[`${l.key}.attachments`] = `Attach at least ${MIN_DOCS} photos / PDFs (${l.attachments.length} added)`;
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
        ...form,
        contact: form.contact.replace(/\D/g, ''),
        legs: legs.map(({ key, documentOther, ...l }) => ({
          ...l,
          documentName: l.documentName === 'Other' ? documentOther.trim() : l.documentName,
          contact: l.contact || form.contact.replace(/\D/g, ''),
          mapLink: l.mapLink || mapLinkFromCoords(l.lat, l.lng),
          km: l.km === '' ? null : Number(l.km),
          attachments: l.attachments.map(({ file, name, type, size }) => ({ file, name, type, size })),
        })),
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
    setForm({ bankId: form.bankId, customerName: '', product: '', contact: '', tatType: form.tatType });
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
              <Field label="Customer name" required error={errors.customerName}>
                <input value={form.customerName} onChange={set('customerName')} placeholder="As per application" />
              </Field>
              <Field label="Product" required error={errors.product}>
                <input list="products" value={form.product} onChange={set('product')} placeholder="For example, Used Car Loan" />
                <datalist id="products">
                  {PRODUCTS.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </Field>
              <Field label="Customer contact number" required error={errors.contact}>
                <input inputMode="numeric" value={form.contact} onChange={set('contact')} placeholder="10-digit mobile" maxLength={14} />
              </Field>
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
                  <span>{executives.find((e) => e.id === l.executiveId)?.name || <em className="muted">No executive yet</em>}</span>
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
  return (
    <div className="created">
      <div className="created-id">
        <Icon name="checkCircle" size={28} />
        <div>
          <span className="muted">Case ID</span>
          <strong className="mono">{c.caseNo}</strong>
        </div>
      </div>
      <p>
        {c.legs.length > 1 ? `${c.legs.length} verifications were` : 'The verification was'} assigned and will appear in the executive app right away.
      </p>
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
    </div>
  );
}

function LegCard({ leg, index, count, errors, execs, openLoad, defaultContact, onChange, onRemove }) {
  const t = typeOf(leg.type);
  const err = (k) => errors[`${leg.key}.${k}`];
  const link = leg.mapLink || mapLinkFromCoords(leg.lat, leg.lng);
  const dir = directionsLink(leg.fromPlace, leg.toPlace);

  const onLink = (v) => {
    const c = coordsFromLink(v);
    onChange(c ? { mapLink: v, lat: c.lat, lng: c.lng } : { mapLink: v });
  };
  const onCoord = (k, v) => onChange({ [k]: v, mapLink: '' });

  const place = `${leg.toPlace} ${leg.address}`.toLowerCase();
  const sortedExecs = [...execs].sort((a, b) => {
    const am = place.includes(a.location.toLowerCase()) ? 0 : 1;
    const bm = place.includes(b.location.toLowerCase()) ? 0 : 1;
    return am - bm || (openLoad[a.id] || 0) - (openLoad[b.id] || 0);
  });

  const onFiles = (files) => {
    const list = Array.from(files).filter((f) => f.type.startsWith('image/') || f.type === 'application/pdf');
    onChange({ attachments: [...leg.attachments, ...list.map((f) => ({ file: f, name: f.name, type: f.type, size: f.size, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null }))] });
  };

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

      <div className="form-grid">
        {t.isDocument && (
          <>
            <Field label="Document name" required error={err('documentName')}>
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
              <Field label="Contact person number" hint="If available">
                <input inputMode="numeric" value={leg.contactPerson} onChange={(e) => onChange({ contactPerson: e.target.value })} />
              </Field>
            )}
            <div className="span-2">
              <Field label={`Document attachments (min ${MIN_DOCS} photos / PDF)`} required error={err('attachments')}>
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
                  <small>{leg.attachments.length} / {MIN_DOCS} minimum</small>
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
          </>
        )}

        <Field label={t.placeLabel} required={!t.isDocument} className="span-2" error={err('address')}>
          <textarea rows={2} value={leg.address} onChange={(e) => onChange({ address: e.target.value })} placeholder={t.isDocument ? 'e.g. Taluk Office, Davanagere' : 'Full address with landmark and pin code'} />
        </Field>

        <Field label="Google Maps link" className="span-2" hint="Paste a link, or enter latitude / longitude below — the link is built automatically.">
          <div className="input-icon">
            <Icon name="link" size={16} />
            <input value={leg.mapLink} onChange={(e) => onLink(e.target.value)} placeholder="https://www.google.com/maps/search/?api=1&query=…" />
            {link && (
              <a className="btn btn-ghost btn-xs" href={link} target="_blank" rel="noreferrer">
                <Icon name="pin" size={14} /> Open in Maps
              </a>
            )}
          </div>
        </Field>
        <Field label="Latitude">
          <input inputMode="decimal" value={leg.lat} onChange={(e) => onCoord('lat', e.target.value)} placeholder="14.621080" />
        </Field>
        <Field label="Longitude">
          <input inputMode="decimal" value={leg.lng} onChange={(e) => onCoord('lng', e.target.value)} placeholder="76.701485" />
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
          <select value={leg.executiveId} onChange={(e) => onChange({ executiveId: e.target.value })}>
            <option value="">Choose executive</option>
            {sortedExecs.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} — {e.location} · {openLoad[e.id] || 0} open
              </option>
            ))}
          </select>
        </Field>
        <Field label="Trigger (what the executive should check)" className="span-2">
          <textarea rows={2} value={leg.trigger} onChange={(e) => onChange({ trigger: e.target.value })} placeholder="e.g. Check properly whether the property belongs to the applicant's uncle" />
        </Field>
      </div>
    </section>
  );
}

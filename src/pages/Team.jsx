import { useMemo, useState } from 'react';
import * as api from '../api';
import { useAuth, useData, useNow, useToast } from '../context/AppContext';
import { Avatar, Empty, Field, Modal, PageHeader, Pill } from '../components/ui';
import Icon from '../components/Icon';
import { USER_STATUS } from '../config/verification';
import { caseTat } from '../utils/tat';
import { copyText, fmtDate, todayISO } from '../utils/format';

const COPY = {
  OL: { title: 'Operational leads', single: 'operational lead', designation: 'Operations', empty: { employeeId: '', name: '', mobile: '', email: '', doj: '', status: 'Active', photo: '' } },
  EXECUTIVE: { title: 'Field executives', single: 'field executive', designation: 'Field Executive', empty: { employeeId: '', name: '', mobile: '', email: '', altMobile: '', address: '', location: '', doj: '', status: 'Active', photo: '' } },
};

const STATUS_TONE = { Active: 'green', Inactive: 'slate', Suspended: 'red' };

// Shrinks the uploaded photo so it stays light (backend will store the original).
function readPhoto(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const s = 192;
      const canvas = document.createElement('canvas');
      canvas.width = s;
      canvas.height = s;
      const min = Math.min(img.width, img.height);
      canvas.getContext('2d').drawImage(img, (img.width - min) / 2, (img.height - min) / 2, min, min, 0, 0, s, s);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = URL.createObjectURL(file);
  });
}

export default function Team({ role }) {
  const { isAdmin } = useAuth();
  const data = useData();
  const toast = useToast();
  const now = useNow(60000);
  const cfg = COPY[role];
  const people = role === 'OL' ? data.ols : data.executives;
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(cfg.empty);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [creds, setCreds] = useState(null); // { name, email, password } shown once after create / reset

  const load = useMemo(() => {
    const m = {};
    data.cases.forEach((c) => {
      const late = caseTat(c, now).state === 'OUT_OF_TAT';
      c.legs.forEach((l) => {
        if (l.status === 'SUBMITTED') return;
        m[l.executiveId] = m[l.executiveId] || { open: 0, late: 0 };
        m[l.executiveId].open++;
        if (late) m[l.executiveId].late++;
      });
    });
    return m;
  }, [data.cases, now]);

  const list = people.filter(
    (p) => (!status || p.status === status) && `${p.name} ${p.employeeId} ${p.mobile} ${p.location || ''}`.toLowerCase().includes(q.toLowerCase()),
  );

  const open = (p) => {
    setEditing(p || {});
    setForm(p ? { ...cfg.empty, ...p } : { ...cfg.empty, employeeId: '', doj: todayISO() });
    setErrors({});
    if (!p) api.users.nextEmployeeId(role).then((employeeId) => setForm((f) => (f.employeeId ? f : { ...f, employeeId }))).catch(() => {});
  };

  async function resetPassword() {
    if (!window.confirm(`Reset the password for ${editing.name}? Their current password will stop working.`)) return;
    try {
      const password = await api.users.resetPassword(editing.id);
      setEditing(null);
      setCreds({ name: editing.name, email: editing.email, password });
    } catch (x) {
      toast(x.message, 'error');
    }
  }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate() {
    const e = {};
    if (!form.employeeId.trim()) e.employeeId = 'Required';
    if (!form.name.trim()) e.name = 'Required';
    if (!/^\d{10}$/.test(form.mobile)) e.mobile = '10-digit mobile number';
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Valid email ID';
    if (!form.doj) e.doj = 'Required';
    if (role === 'EXECUTIVE') {
      if (form.altMobile && !/^\d{10}$/.test(form.altMobile)) e.altMobile = '10-digit number';
      if (!form.address.trim()) e.address = 'Required';
      if (!form.location.trim()) e.location = 'Required';
    }
    setErrors(e);
    return !Object.keys(e).length;
  }

  async function save(ev) {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.users.update(editing.id, form);
        toast('Details updated');
      } else {
        const { user, tempPassword } = await api.users.create({ ...form, role });
        setCreds({ name: user.name, email: user.email, password: tempPassword });
      }
      await data.refresh();
      setEditing(null);
    } catch (x) {
      toast(x.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title={cfg.title}
        subtitle={role === 'EXECUTIVE' ? 'Field officers using the mobile app' : 'Operations team — can create cases and set final status'}
        actions={
          isAdmin && (
            <button className="btn btn-primary" onClick={() => open(null)}>
              <Icon name="plus" /> Add {cfg.single}
            </button>
          )
        }
      />

      <div className="filters card">
        <div className="input-icon search">
          <Icon name="search" size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, mobile" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {USER_STATUS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="card table-card">
        {list.length === 0 ? (
          <Empty icon="users" title={`No ${cfg.title.toLowerCase()} found`} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Employee ID</th>
                  <th>Mobile</th>
                  <th>Email ID</th>
                  {role === 'EXECUTIVE' && <th>Location</th>}
                  <th>Joined</th>
                  {role === 'EXECUTIVE' && <th className="num">Open / late</th>}
                  <th>Status</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="person-cell">
                        <Avatar name={p.name} photo={p.photo} size={34} />
                        <div>
                          <strong>{p.name}</strong>
                          <div className="muted small">{p.designation}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono">{p.employeeId}</td>
                    <td className="mono">
                      {p.mobile}
                      {p.altMobile && <div className="muted small">{p.altMobile}</div>}
                    </td>
                    <td className="small">{p.email}</td>
                    {role === 'EXECUTIVE' && <td>{p.location}</td>}
                    <td className="small">{fmtDate(p.doj)}</td>
                    {role === 'EXECUTIVE' && (
                      <td className="num">
                        {load[p.id]?.open || 0}
                        {load[p.id]?.late ? <span className="txt-red strong"> / {load[p.id].late}</span> : <span className="muted"> / 0</span>}
                      </td>
                    )}
                    <td><Pill tone={STATUS_TONE[p.status]}>{p.status}</Pill></td>
                    {isAdmin && (
                      <td className="num">
                        <button className="btn btn-ghost btn-xs" onClick={() => open(p)}>
                          <Icon name="edit" size={13} /> Edit
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        width={640}
        title={editing?.id ? `Edit ${cfg.single}` : `Add ${cfg.single}`}
        footer={
          <>
            {editing?.id && (
              <button className="btn btn-ghost" style={{ marginRight: 'auto' }} onClick={resetPassword}>
                Reset password
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" form="person-form" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </>
        }
      >
        <form id="person-form" className="form-grid" onSubmit={save} noValidate>
          <div className="photo-pick span-2">
            <Avatar name={form.name || '?'} photo={form.photo} size={64} />
            <label className="btn btn-ghost btn-sm">
              <Icon name="upload" size={14} /> {form.photo ? 'Change photograph' : 'Upload photograph'}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const photo = await readPhoto(file);
                  setForm((f) => ({ ...f, photo }));
                }}
              />
            </label>
            {form.photo && (
              <button type="button" className="link-btn small" onClick={() => setForm((f) => ({ ...f, photo: '' }))}>Remove</button>
            )}
          </div>
          <Field label="Employee / user ID" required error={errors.employeeId}>
            <input value={form.employeeId} onChange={set('employeeId')} disabled={!!editing?.id} />
          </Field>
          <Field label="Full name" required error={errors.name}>
            <input value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Mobile number" required error={errors.mobile}>
            <input inputMode="numeric" maxLength={10} value={form.mobile} onChange={set('mobile')} />
          </Field>
          <Field label="Email ID" required error={errors.email} hint={!editing?.id ? 'Login details are sent here' : undefined}>
            <input type="email" value={form.email} onChange={set('email')} />
          </Field>
          {role === 'EXECUTIVE' && (
            <>
              <Field label="Alternative contact number" error={errors.altMobile}>
                <input inputMode="numeric" maxLength={10} value={form.altMobile} onChange={set('altMobile')} />
              </Field>
              <Field label="Location (base city)" required error={errors.location}>
                <input value={form.location} onChange={set('location')} placeholder="e.g. Hubballi" />
              </Field>
              <Field label="Complete address" required className="span-2" error={errors.address}>
                <textarea rows={2} value={form.address} onChange={set('address')} />
              </Field>
            </>
          )}
          <Field label="Designation">
            <input value={cfg.designation} disabled />
          </Field>
          <Field label="Date of joining" required error={errors.doj}>
            <input type="date" value={form.doj} onChange={set('doj')} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>
              {USER_STATUS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!creds}
        onClose={() => setCreds(null)}
        title="Login details"
        footer={<button className="btn btn-primary" onClick={() => setCreds(null)}>Done</button>}
      >
        {creds && (
          <div className="created">
            <p>
              Share these with <strong>{creds.name}</strong>. The password is shown only once — they should change it after signing in.
            </p>
            <div className="feedback-box">
              <span className="field-label">Email ID</span>
              <div className="copy-row"><input readOnly value={creds.email} onFocus={(e) => e.target.select()} /></div>
              <span className="field-label">Temporary password</span>
              <div className="copy-row">
                <input readOnly value={creds.password} onFocus={(e) => e.target.select()} />
                <button className="btn btn-dark btn-sm" onClick={async () => toast((await copyText(`Email: ${creds.email}\nPassword: ${creds.password}`)) ? 'Copied' : 'Could not copy')}>
                  <Icon name="copy" size={15} /> Copy
                </button>
              </div>
              <span className="field-hint">{role === 'EXECUTIVE' ? 'Executives sign in on the mobile app.' : 'Sign in at the admin panel login page.'}</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

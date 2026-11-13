import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useData, useToast } from '../context/AppContext';
import { Field, Modal, PageHeader, Pill } from '../components/ui';
import Icon from '../components/Icon';
import { caseStatus } from '../utils/tat';

// Admin only (the OL panel has no Banks page).
const NEW_MANAGER = { name: '', designation: '', mobile: '', email: '' };
const EMPTY = { name: '', code: '', managers: [{ ...NEW_MANAGER }], status: 'Active' };

export default function Banks() {
  const { banks, cases, refresh } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null); // null | {} (new) | bank
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState('');

  const open = (b) => {
    setEditing(b || {});
    setForm(
      b
        ? { name: b.name, code: b.code, status: b.status, managers: b.managers?.length ? b.managers.map((m) => ({ ...NEW_MANAGER, ...m })) : [{ ...NEW_MANAGER }] }
        : { ...EMPTY, managers: [{ ...NEW_MANAGER }] },
    );
    setErr('');
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setManager = (i, k) => (e) =>
    setForm((f) => ({ ...f, managers: f.managers.map((m, j) => (j === i ? { ...m, [k]: e.target.value } : m)) }));
  const addManager = () => setForm((f) => ({ ...f, managers: [...f.managers, { ...NEW_MANAGER }] }));
  const removeManager = (i) => setForm((f) => ({ ...f, managers: f.managers.filter((_, j) => j !== i) }));

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return setErr('Bank name and code are required.');
    // rows left completely blank are ignored
    const managers = form.managers.filter((m) => m.name.trim() || m.mobile.trim() || m.email.trim());
    if (managers.some((m) => !m.name.trim())) return setErr('Every manager row needs a name.');
    if (managers.some((m) => m.mobile && !/^\d{10}$/.test(m.mobile))) return setErr('Manager mobile numbers must be 10 digits.');
    try {
      const body = { name: form.name, code: form.code, status: form.status, managers };
      if (editing.id) await api.banks.update(editing.id, body);
      else await api.banks.create(body);
      await refresh();
      toast(editing.id ? 'Bank updated' : 'Bank added');
      setEditing(null);
    } catch (x) {
      setErr(x.message);
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Banks"
        subtitle="Client banks and their managers"
        actions={
          <button className="btn btn-primary" onClick={() => open(null)}>
            <Icon name="plus" /> Add bank
          </button>
        }
      />
      <div className="bank-grid">
        {banks.map((b) => {
          const mine = cases.filter((c) => c.bankId === b.id);
          const openCount = mine.filter((c) => caseStatus(c) !== 'CLOSED').length;
          return (
            <div key={b.id} className="card bank-card">
              <div className="bank-card-head">
                <span className="bank-mono">{b.code.slice(0, 4)}</span>
                <div>
                  <h3>{b.name}</h3>
                  <span className="muted small">
                    {b.managers?.length || 0} manager{b.managers?.length === 1 ? '' : 's'}
                  </span>
                </div>
                <Pill tone={b.status === 'Active' ? 'green' : 'slate'}>{b.status}</Pill>
              </div>
              {b.managers?.length ? (
                <ul className="manager-list">
                  {b.managers.map((m, i) => (
                    <li key={i}>
                      <div>
                        <strong>{m.name}</strong>
                        {m.designation && <span className="muted small"> · {m.designation}</span>}
                      </div>
                      <div className="muted small">
                        {[m.mobile, m.email].filter(Boolean).join(' · ') || '—'}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted small">No managers added yet.</p>
              )}
              <div className="bank-foot">
                <button className="link-btn" onClick={() => navigate(`/cases?bank=${b.id}`)}>
                  {mine.length} cases · {openCount} open <Icon name="chevronRight" size={14} />
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => open(b)}>
                  <Icon name="edit" size={13} /> Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        width={720}
        title={editing?.id ? 'Edit bank' : 'Add bank'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
            <button className="btn btn-primary" form="bank-form">Save</button>
          </>
        }
      >
        <form id="bank-form" className="form-grid" onSubmit={save}>
          <Field label="Bank name" required className="span-2">
            <input value={form.name} onChange={set('name')} placeholder="e.g. HDFC Bank Ltd" />
          </Field>
          <Field label="Short code" required hint="Shown on case lists">
            <input value={form.code} onChange={set('code')} placeholder="HDFC" maxLength={8} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>

          <div className="span-2 managers-edit">
            <div className="managers-head">
              <span className="field-label">Bank managers</span>
              <button type="button" className="btn btn-ghost btn-xs" onClick={addManager}>
                <Icon name="plus" size={13} /> Add manager
              </button>
            </div>
            {form.managers.map((m, i) => (
              <div className="manager-row" key={i}>
                <input value={m.name} onChange={setManager(i, 'name')} placeholder="Name" aria-label={`Manager ${i + 1} name`} />
                <input value={m.designation} onChange={setManager(i, 'designation')} placeholder="Designation" aria-label={`Manager ${i + 1} designation`} />
                <input value={m.mobile} onChange={setManager(i, 'mobile')} placeholder="Mobile" inputMode="numeric" maxLength={10} aria-label={`Manager ${i + 1} mobile`} />
                <input type="email" value={m.email} onChange={setManager(i, 'email')} placeholder="Email" aria-label={`Manager ${i + 1} email`} />
                <button type="button" className="icon-btn" onClick={() => removeManager(i)} title="Remove manager" disabled={form.managers.length === 1}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
          {err && <div className="alert alert-red span-2">{err}</div>}
        </form>
      </Modal>
    </div>
  );
}

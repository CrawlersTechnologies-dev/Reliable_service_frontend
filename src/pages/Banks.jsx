import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../api';
import { useAuth, useData, useToast } from '../context/AppContext';
import { Field, Modal, PageHeader, Pill } from '../components/ui';
import Icon from '../components/Icon';
import { caseStatus } from '../utils/tat';

const EMPTY = { name: '', code: '', contactPerson: '', contactNumber: '', email: '', city: '', status: 'Active' };

export default function Banks() {
  const { isAdmin } = useAuth();
  const { banks, cases, refresh } = useData();
  const toast = useToast();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(null); // null | {} (new) | bank
  const [form, setForm] = useState(EMPTY);
  const [err, setErr] = useState('');

  const open = (b) => {
    setEditing(b || {});
    setForm(b ? { ...EMPTY, ...b } : EMPTY);
    setErr('');
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim()) return setErr('Bank name and code are required.');
    try {
      if (editing.id) await api.banks.update(editing.id, form);
      else await api.banks.create(form);
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
        subtitle={isAdmin ? 'Client banks available while creating cases' : 'Client banks (only the admin can add or edit)'}
        actions={
          isAdmin && (
            <button className="btn btn-primary" onClick={() => open(null)}>
              <Icon name="plus" /> Add bank
            </button>
          )
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
                  <span className="muted small">{b.city || '—'}</span>
                </div>
                <Pill tone={b.status === 'Active' ? 'green' : 'slate'}>{b.status}</Pill>
              </div>
              <dl className="bank-meta">
                <div><dt>Contact</dt><dd>{b.contactPerson || '—'}</dd></div>
                <div><dt>Phone</dt><dd className="mono">{b.contactNumber || '—'}</dd></div>
                <div className="span-2"><dt>Email</dt><dd>{b.email || '—'}</dd></div>
              </dl>
              <div className="bank-foot">
                <button className="link-btn" onClick={() => navigate(`/cases?bank=${b.id}`)}>
                  {mine.length} cases · {openCount} open <Icon name="chevronRight" size={14} />
                </button>
                {isAdmin && (
                  <button className="btn btn-ghost btn-xs" onClick={() => open(b)}>
                    <Icon name="edit" size={13} /> Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
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
          <Field label="City">
            <input value={form.city} onChange={set('city')} />
          </Field>
          <Field label="Contact person">
            <input value={form.contactPerson} onChange={set('contactPerson')} />
          </Field>
          <Field label="Contact number">
            <input inputMode="numeric" value={form.contactNumber} onChange={set('contactNumber')} />
          </Field>
          <Field label="Email ID" className="span-2" hint="Where final reports are sent">
            <input type="email" value={form.email} onChange={set('email')} />
          </Field>
          <Field label="Status">
            <select value={form.status} onChange={set('status')}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </Field>
          {err && <div className="alert alert-red span-2">{err}</div>}
        </form>
      </Modal>
    </div>
  );
}

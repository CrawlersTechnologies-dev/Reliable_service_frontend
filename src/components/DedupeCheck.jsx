import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import Icon from './Icon';
import { OUTCOMES } from '../config/verification';
import { fmtDate } from '../utils/format';

const STATUS = { ASSIGNED: 'Assigned', IN_FIELD: 'In field', QA_PENDING: 'Awaiting QA', CLOSED: 'Closed' };

// "Dedupe check" button — looks for cases of the last 3 months with the same mobile number(s) or PAN.
export default function DedupeCheck({ form, setForm, excludeId = '' }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const mobiles = [form.contact, form.altContact, form.coApplicantContact].map((m) => String(m || '').replace(/\D/g, '').slice(-10)).filter((m) => m.length === 10);
  const pan = String(form.pan || '').trim().toUpperCase();
  const panOk = /^[A-Z]{5}\d{4}[A-Z]$/.test(pan);
  const ready = mobiles.length > 0 || panOk;

  async function run() {
    setBusy(true);
    setError('');
    try {
      const r = await api.cases.dedupe({ mobiles, pan: panOk ? pan : '', excludeId });
      setResult(r);
      // record the result in the "Dedupe check" field (can still be changed by hand)
      setForm((f) => ({ ...f, dedupeCheck: r.matches.length ? 'Yes' : 'No' }));
    } catch (e) {
      setError(e.message);
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="span-2 dedupe">
      <div className="dedupe-bar">
        <button type="button" className="btn btn-dark btn-sm" onClick={run} disabled={!ready || busy}>
          <Icon name="search" size={15} /> {busy ? 'Checking…' : 'Dedupe check'}
        </button>
        <span className="muted small">
          {ready
            ? `Searches the last 3 months by ${[mobiles.length ? `mobile ${mobiles.join(', ')}` : '', panOk ? `PAN ${pan}` : ''].filter(Boolean).join(' and ')}`
            : 'Enter the contact number or PAN first'}
        </span>
      </div>
      {error && <p className="field-error">{error}</p>}
      {result && !result.matches.length && (
        <div className="dedupe-result ok">
          <Icon name="checkCircle" size={18} />
          <div>
            <strong>No match found</strong>
            <span>No case in the last 3 months (since {fmtDate(result.since)}) has this mobile number or PAN.</span>
          </div>
        </div>
      )}
      {result && result.matches.length > 0 && (
        <div className="dedupe-result hit">
          <div className="dedupe-hit-head">
            <Icon name="alert" size={18} />
            <div>
              <strong>Match found — {result.matches.length} previous case{result.matches.length === 1 ? '' : 's'}</strong>
              <span>Since {fmtDate(result.since)}. Check them before creating this case.</span>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table dedupe-table">
              <thead>
                <tr>
                  <th>Case ID</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Bank</th>
                  <th>Verification</th>
                  <th>Status</th>
                  <th>Matched on</th>
                </tr>
              </thead>
              <tbody>
                {result.matches.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <Link to={`/cases/${m.id}`} target="_blank" className="mono strong">
                        {m.caseNo}
                      </Link>
                    </td>
                    <td>{fmtDate(m.createdAt)}</td>
                    <td>
                      {m.customerName}
                      <div className="muted small mono">
                        {m.contact}
                        {m.pan ? ` · ${m.pan}` : ''}
                      </div>
                    </td>
                    <td>{m.bankName}</td>
                    <td className="small">
                      {m.product}
                      <div className="muted">{m.types.join(' + ')}</div>
                    </td>
                    <td className="small">{m.outcome ? OUTCOMES.find((o) => o.key === m.outcome)?.label : STATUS[m.status] || m.status}</td>
                    <td>
                      {m.matchedOn.map((x) => (
                        <span key={x} className="pill pill-red">
                          {x}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

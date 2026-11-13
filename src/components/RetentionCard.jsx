import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../api';
import { useData } from '../context/AppContext';
import Icon from './Icon';
import { downloadMis } from '../utils/mis';
import { fmtDate } from '../utils/format';

const DAY = 24 * 60 * 60 * 1000;

// Admin dashboard: closed cases that will be permanently deleted in the next 7 days
// (data-retention rule), with a one-click MIS download and links to each report.
export default function RetentionCard() {
  const { bankById, execById } = useData();
  const [data, setData] = useState(null);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    api.cases.retention(7).then(setData).catch(() => setData(null));
  }, []);

  if (!data || !data.retentionDays) return null;
  const { due, log, retentionDays } = data;
  const daysLeft = (iso) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / DAY));

  return (
    <section className={`card retention-card ${due.length ? 'has-due' : ''}`}>
      <div className="card-head">
        <div>
          <h2>
            <Icon name="trash" size={18} /> Auto-deletion
          </h2>
          <p>
            Closed cases, with their photos and documents, are permanently deleted {retentionDays} days after closing. Download
            what you need before then.
          </p>
        </div>
        {due.length > 0 && (
          <button className="btn btn-primary" onClick={() => downloadMis(due, bankById, execById, 'before-deletion')}>
            <Icon name="download" /> MIS ({due.length})
          </button>
        )}
      </div>

      {due.length === 0 ? (
        <p className="muted retention-empty">No cases will be deleted in the next 7 days.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Case</th>
                <th>Customer</th>
                <th>Bank</th>
                <th>Closed</th>
                <th>Deletes on</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {due.map((c) => {
                const left = daysLeft(c.deleteAt);
                return (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/cases/${c.id}`}>{c.caseNo}</Link>
                    </td>
                    <td>{c.customerName}</td>
                    <td>{bankById[c.bankId]?.name || '—'}</td>
                    <td>{fmtDate(c.outcomeAt)}</td>
                    <td>
                      <span className={`retention-left ${left <= 1 ? 'urgent' : ''}`}>
                        {fmtDate(c.deleteAt)} · {left === 0 ? 'today' : `${left} day${left === 1 ? '' : 's'}`}
                      </span>
                    </td>
                    <td className="right">
                      <Link className="btn btn-ghost btn-sm" to={`/cases/${c.id}/report`}>
                        <Icon name="printer" size={14} /> Report
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {log.length > 0 && (
        <div className="retention-log">
          <button type="button" className="link-btn" onClick={() => setShowLog((v) => !v)}>
            {showLog ? 'Hide' : 'Show'} recently deleted ({log.length})
          </button>
          {showLog && (
            <ul>
              {log.map((l) => (
                <li key={`${l.caseNo}-${l.deletedAt}`}>
                  <strong>{l.caseNo}</strong> · {l.bankName || '—'} · closed {fmtDate(l.closedAt)} · deleted {fmtDate(l.deletedAt)}
                  {l.files ? ` · ${l.files} file${l.files === 1 ? '' : 's'}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

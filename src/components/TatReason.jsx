import { useEffect, useState } from 'react';
import * as api from '../api';
import { useData, useToast } from '../context/AppContext';
import Icon from './Icon';
import { fmtDateTime } from '../utils/format';

// Why did this case cross its TAT? Admin / OL write it; it shows on the case,
// the performance page and the bank performance PDF.
export default function TatReason({ c, compact = false }) {
  const { refresh } = useData();
  const toast = useToast();
  const [text, setText] = useState(c.tatReason?.text || '');
  const [editing, setEditing] = useState(!c.tatReason);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setText(c.tatReason?.text || '');
    setEditing(!c.tatReason);
  }, [c.tatReason?.text]);

  async function save() {
    setBusy(true);
    try {
      await api.cases.setTatReason(c.id, text.trim());
      await refresh();
      toast(text.trim() ? 'Reason saved' : 'Reason removed');
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (!editing && c.tatReason) {
    return (
      <div className={`tat-reason ${compact ? 'compact' : ''}`}>
        <p>{c.tatReason.text}</p>
        <div className="tat-reason-meta">
          <span className="muted small">
            {c.tatReason.by?.name} · {fmtDateTime(c.tatReason.at)}
          </span>
          <button type="button" className="link-btn small" onClick={() => setEditing(true)}>
            <Icon name="edit" size={12} /> Edit
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className={`tat-reason editing ${compact ? 'compact' : ''}`}>
      <textarea
        rows={compact ? 2 : 3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Why is this case delayed? e.g. customer not reachable, house locked, office open only after 4 pm"
        aria-label="Reason for out of TAT"
      />
      <div className="tat-reason-actions">
        {c.tatReason && (
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
        <button type="button" className="btn btn-dark btn-xs" disabled={busy || (!text.trim() && !c.tatReason)} onClick={save}>
          {busy ? 'Saving…' : 'Save reason'}
        </button>
      </div>
    </div>
  );
}

// Today's check-in / check-out for an operational lead (shown on the dashboard)
import { useEffect, useState } from 'react';
import * as api from '../api';
import { useToast } from '../context/AppContext';
import Icon from './Icon';
import { fmtTime } from '../utils/format';
import { fmtHours, isLate } from '../utils/attendance';

export default function CheckInCard() {
  const toast = useToast();
  const [rec, setRec] = useState(undefined); // undefined = loading, null = not checked in
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.attendance.today().then(setRec).catch(() => setRec(null));
  }, []);

  async function act(fn, ok) {
    setBusy(true);
    try {
      setRec(await fn());
      toast(ok);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  if (rec === undefined) return null;
  const worked = rec?.checkOut ? new Date(rec.checkOut) - new Date(rec.checkIn) : rec ? Date.now() - new Date(rec.checkIn) : null;
  return (
    <section className={`card checkin-card ${rec ? (rec.checkOut ? 'is-done' : 'is-in') : ''}`}>
      <div className="checkin-icon">
        <Icon name={rec ? (rec.checkOut ? 'checkCircle' : 'clock') : 'calendar'} size={22} />
      </div>
      <div className="checkin-text">
        <strong>{!rec ? 'You have not checked in today' : rec.checkOut ? 'Day complete' : 'Checked in'}</strong>
        <span>
          {!rec
            ? 'Check in when you start work — your attendance shows on your performance report.'
            : `In ${fmtTime(rec.checkIn)}${isLate(rec) ? ' (late)' : ''}${rec.checkOut ? ` · Out ${fmtTime(rec.checkOut)}` : ''} · ${fmtHours(worked)} worked`}
        </span>
      </div>
      {!rec && (
        <button className="btn btn-primary" disabled={busy} onClick={() => act(() => api.attendance.checkIn(), 'Checked in — have a good day')}>
          <Icon name="checkCircle" /> Check in
        </button>
      )}
      {rec && !rec.checkOut && (
        <button className="btn btn-dark" disabled={busy} onClick={() => act(() => api.attendance.checkOut(), 'Checked out')}>
          <Icon name="logout" /> Check out
        </button>
      )}
    </section>
  );
}

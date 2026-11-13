import { useMemo, useState } from 'react';
import { useData, useNow } from '../context/AppContext';
import { Avatar, Empty, Pill } from '../components/ui';
import Icon from '../components/Icon';
import { fmtDate, fmtTime, todayISO } from '../utils/format';
import { fmtDuration } from '../utils/tat';
import { mapLinkFromCoords } from '../utils/maps';

const localDay = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const weekAgo = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return localDay(d.toISOString());
};

export function AppLogins() {
  const { logins, executives, execById } = useData();
  const now = useNow(60000);
  const [exec, setExec] = useState('');
  const [from, setFrom] = useState(weekAgo());
  const [to, setTo] = useState(todayISO());

  const rows = useMemo(
    () =>
      logins
        .filter((l) => (!exec || l.executiveId === exec) && localDay(l.loginAt) >= from && localDay(l.loginAt) <= to)
        .sort((a, b) => b.loginAt.localeCompare(a.loginAt)),
    [logins, exec, from, to],
  );

  const today = localDay(new Date(now).toISOString());
  const summary = executives
    .filter((e) => !exec || e.id === exec)
    .map((e) => {
      const mine = rows.filter((r) => r.executiveId === e.id);
      const todays = logins.filter((l) => l.executiveId === e.id && localDay(l.loginAt) === today);
      const ms = mine.reduce((n, r) => n + ((r.logoutAt ? new Date(r.logoutAt) : new Date(now)) - new Date(r.loginAt)), 0);
      const days = new Set(mine.map((r) => localDay(r.loginAt))).size;
      return { e, today: todays[0], days, avg: days ? ms / days : 0, visits: mine.reduce((n, r) => n + r.visits, 0) };
    });

  return (
    <>
      <p className="muted small">Executive mobile app sessions — login / logout time, device and GPS location.</p>
      <div className="filters card">
        <select value={exec} onChange={(e) => setExec(e.target.value)} aria-label="Executive">
          <option value="">All executives</option>
          {executives.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <div className="date-range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
        </div>
      </div>

      <div className="login-cards">
        {summary.map(({ e, today: t, days, avg, visits }) => (
          <div className="card login-card" key={e.id}>
            <div className="lc-head">
              <Avatar name={e.name} photo={e.photo} size={38} />
              <div>
                <strong>{e.name}</strong>
                <span className="muted small">{e.employeeId} · {e.location}</span>
              </div>
            </div>
            <div className="lc-today">
              {e.status !== 'Active' ? (
                <Pill tone="red">{e.status}</Pill>
              ) : t ? (
                <Pill tone={t.logoutAt ? 'slate' : 'green'} icon={t.logoutAt ? 'logout' : 'login'}>
                  {t.logoutAt ? `Logged out ${fmtTime(t.logoutAt)}` : `Online since ${fmtTime(t.loginAt)}`}
                </Pill>
              ) : (
                <Pill tone="amber">Not logged in today</Pill>
              )}
            </div>
            <dl className="lc-stats">
              <div><dt>Days active</dt><dd>{days}</dd></div>
              <div><dt>Avg / day</dt><dd>{days ? fmtDuration(avg) : '—'}</dd></div>
              <div><dt>Visits</dt><dd>{visits}</dd></div>
            </dl>
          </div>
        ))}
      </div>

      <div className="card table-card">
        {rows.length === 0 ? (
          <Empty icon="activity" title="No logins in this range" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Executive</th>
                  <th>Date</th>
                  <th>Login</th>
                  <th>Logout</th>
                  <th className="num">Duration</th>
                  <th>Device</th>
                  <th>Login location</th>
                  <th className="num">Visits</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const e = execById[r.executiveId];
                  const end = r.logoutAt ? new Date(r.logoutAt) : new Date(now);
                  return (
                    <tr key={r.id}>
                      <td>
                        <strong>{e?.name}</strong>
                        <div className="muted small">{e?.employeeId}</div>
                      </td>
                      <td>{fmtDate(r.loginAt)}</td>
                      <td className="mono">{fmtTime(r.loginAt)}</td>
                      <td className="mono">{r.logoutAt ? fmtTime(r.logoutAt) : <Pill tone="green">Active now</Pill>}</td>
                      <td className="num">{fmtDuration(end - new Date(r.loginAt))}</td>
                      <td className="small">{r.device}</td>
                      <td>
                        <a className="link small" href={mapLinkFromCoords(r.lat, r.lng)} target="_blank" rel="noreferrer">
                          <Icon name="pin" size={13} /> {r.location}
                        </a>
                      </td>
                      <td className="num">{r.visits}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

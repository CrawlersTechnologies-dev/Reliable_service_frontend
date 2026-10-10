import { Link, useNavigate } from 'react-router-dom';
import { useAuth, useData, useNow } from '../context/AppContext';
import { Avatar, Empty, PageHeader, Stat, TatBadge, TypeChip } from '../components/ui';
import Icon from '../components/Icon';
import { caseStatus, caseTat } from '../utils/tat';
import { fmtLongDate } from '../utils/format';

export default function Dashboard() {
  const { user } = useAuth();
  const { cases, banks, bankById, executives, execById, logins } = useData();
  const now = useNow();
  const navigate = useNavigate();

  const enriched = cases.map((c) => ({ c, tat: caseTat(c, now), status: caseStatus(c) }));
  const open = enriched.filter((x) => x.status !== 'CLOSED');
  const inTat = enriched.filter((x) => x.tat.state === 'IN_TAT');
  const outTat = enriched.filter((x) => x.tat.state === 'OUT_OF_TAT').sort((a, b) => b.tat.overdue - a.tat.overdue);
  const qa = enriched.filter((x) => x.status === 'QA_PENDING');
  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const closedMonth = enriched.filter((x) => x.status === 'CLOSED' && new Date(x.c.outcomeAt) >= monthStart);

  const today = new Date(now).toDateString();
  const loggedToday = new Set(logins.filter((l) => new Date(l.loginAt).toDateString() === today).map((l) => l.executiveId));
  const activeExecs = executives.filter((e) => e.status === 'Active');

  const execLoad = activeExecs
    .map((e) => {
      const legs = open.flatMap((x) => x.c.legs.filter((l) => l.executiveId === e.id && l.status !== 'SUBMITTED').map((l) => ({ l, x })));
      return { e, total: legs.length, late: legs.filter(({ x }) => x.tat.state === 'OUT_OF_TAT').length };
    })
    .sort((a, b) => b.total - a.total);

  const bankRows = banks.map((b) => {
    const mine = enriched.filter((x) => x.c.bankId === b.id);
    return {
      b,
      open: mine.filter((x) => x.status !== 'CLOSED').length,
      out: mine.filter((x) => x.tat.state === 'OUT_OF_TAT').length,
      qa: mine.filter((x) => x.status === 'QA_PENDING').length,
      closed: mine.filter((x) => x.status === 'CLOSED').length,
    };
  });

  const hour = new Date(now).getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page">
      <PageHeader
        title={`${greet}, ${user.name.split(' ')[0]}`}
        subtitle={fmtLongDate(now)}
        actions={
          <Link to="/cases/new" className="btn btn-primary">
            <Icon name="plus" /> New case
          </Link>
        }
      />

      <div className="stats">
        <Stat label="Open cases" value={open.length} icon="folder" foot={`${enriched.length} total`} onClick={() => navigate('/cases')} />
        <Stat label="In process · in TAT" value={inTat.length} tone="green" icon="clock" foot="Running within time" onClick={() => navigate('/cases?tab=in-tat')} />
        <Stat label="Pending · out of TAT" value={outTat.length} tone="red" icon="alert" foot="Crossed 8h / 24h" onClick={() => navigate('/cases?tab=out-of-tat')} />
        <Stat label="Awaiting QA status" value={qa.length} tone="yellow" icon="shield" foot="Executive submitted" onClick={() => navigate('/cases?tab=qa')} />
        <Stat label="Closed this month" value={closedMonth.length} tone="ink" icon="checkCircle" foot="Reports ready for bank" onClick={() => navigate('/cases?tab=closed')} />
      </div>

      <div className="grid-2 dash-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Out of TAT</h2>
              <p>Cases past their deadline, most overdue first</p>
            </div>
            <Link to="/cases?tab=out-of-tat" className="link">View all</Link>
          </div>
          {outTat.length === 0 ? (
            <Empty icon="checkCircle" title="Nothing overdue" text="Every open case is within its TAT." />
          ) : (
            <ul className="overdue-list">
              {outTat.slice(0, 6).map(({ c, tat }) => (
                <li key={c.id}>
                  <Link to={`/cases/${c.id}`}>
                    <div className="ol-main">
                      <strong>{c.customerName}</strong>
                      <span className="mono muted">{c.caseNo}</span>
                    </div>
                    <div className="ol-meta">
                      <span>{bankById[c.bankId]?.code}</span>
                      {c.legs.map((l) => (
                        <TypeChip key={l.id} type={l.type} />
                      ))}
                      <span className="muted">· {c.legs.map((l) => execById[l.executiveId]?.name.split(' ')[0]).join(', ')}</span>
                    </div>
                    <TatBadge c={c} tat={tat} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2>Executive load</h2>
              <p>
                {loggedToday.size} of {activeExecs.length} logged in today
              </p>
            </div>
            <Link to="/sampling" className="link">Sampling logins</Link>
          </div>
          <ul className="load-list">
            {execLoad.map(({ e, total, late }) => (
              <li key={e.id}>
                <Avatar name={e.name} photo={e.photo} size={34} />
                <div className="load-who">
                  <strong>{e.name}</strong>
                  <span className="muted">{e.location}</span>
                </div>
                <span className={`login-dot ${loggedToday.has(e.id) ? 'on' : ''}`} title={loggedToday.has(e.id) ? 'Logged in today' : 'Not logged in today'} />
                <div className="load-bar">
                  <div style={{ width: `${Math.min(100, total * 25)}%` }} className={late ? 'has-late' : ''} />
                </div>
                <span className="load-num">
                  {total}
                  {late > 0 && <em> · {late} late</em>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <div>
            <h2>Bank-wise status</h2>
            <p>Open, overdue and closed cases per client</p>
          </div>
          <Link to="/reports" className="link">Bank performance PDF</Link>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Bank</th>
                <th className="num">Open</th>
                <th className="num">Out of TAT</th>
                <th className="num">QA pending</th>
                <th className="num">Closed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bankRows.map(({ b, open: o, out, qa: q, closed: cl }) => (
                <tr key={b.id} className="row-link" onClick={() => navigate(`/cases?bank=${b.id}`)}>
                  <td>
                    <div className="bank-cell">
                      <span className="bank-code">{b.code}</span>
                      {b.name}
                    </div>
                  </td>
                  <td className="num">{o}</td>
                  <td className="num">{out ? <span className="txt-red strong">{out}</span> : 0}</td>
                  <td className="num">{q}</td>
                  <td className="num">{cl}</td>
                  <td className="num">
                    <Icon name="chevronRight" size={16} className="muted" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Avatar, Logo } from './ui';
import { useAuth, useData, useNow } from '../context/AppContext';
import { caseTat } from '../utils/tat';
import * as api from '../api';
import { CHAT_SEEN_KEY } from '../pages/Discussion';
import ChatAlerts from './ChatAlerts';

const NAV = [
  { group: 'Work', items: [
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/cases/new', label: 'New case', icon: 'newCase' },
    { to: '/cases', label: 'Cases', icon: 'folder', end: true, badge: 'overdue' },
    { to: '/reports', label: 'Reports', icon: 'report' },
    { to: '/discussion', label: 'Discussion – Core', icon: 'chat', badge: 'chat' },
  ] },
  { group: 'Monitoring', items: [
    { to: '/sampling', label: 'Sampling logins', icon: 'activity' },
    { to: '/attendance', label: 'Attendance', icon: 'userCheck' },
  ] },
  { group: 'Masters', items: [
    { to: '/banks', label: 'Banks', icon: 'bank', adminOnly: true },
    { to: '/team/leads', label: 'Operational leads', icon: 'users', adminOnly: true },
    { to: '/team/executives', label: 'Field executives', icon: 'badge', adminOnly: true },
  ] },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const { cases } = useData();
  const now = useNow(60000);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => setOpen(false), [location.pathname]);

  const overdue = cases.filter((c) => caseTat(c, now).state === 'OUT_OF_TAT').length;

  // unread Discussion messages (from others, newer than the last one seen) — checked every 20 s
  const [unreadMsgs, setUnreadMsgs] = useState([]);
  const unread = unreadMsgs.length;
  useEffect(() => {
    if (location.pathname === '/discussion') {
      setUnreadMsgs([]);
      return undefined;
    }
    let alive = true;
    const check = async () => {
      let seen = null;
      try {
        seen = localStorage.getItem(CHAT_SEEN_KEY);
      } catch {
        /* storage blocked */
      }
      try {
        const fresh = await api.chat.list(seen || new Date(Date.now() - 7 * 864e5).toISOString());
        if (alive) setUnreadMsgs(fresh.filter((m) => m.by.id !== user.id));
      } catch {
        /* offline — keep the last count */
      }
    };
    check();
    const t = setInterval(check, 20000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [location.pathname, user.id]);
  const openChat = useCallback(() => navigate('/discussion'), [navigate]);

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <Logo light />
          <span className="role-tag">{isAdmin ? 'Admin desk' : 'Operations desk'}</span>
        </div>
        <nav>
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div className="nav-group" key={g.group}>
                <div className="nav-group-label">{g.group}</div>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icon name={i.icon} size={19} />
                    <span>{i.label}</span>
                    {i.badge === 'overdue' && overdue > 0 && <span className="nav-badge" title="Out of TAT">{overdue}</span>}
                    {i.badge === 'chat' && unread > 0 && <span className="nav-badge" title="New messages">{unread}</span>}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="sidebar-user">
          <Avatar name={user.name} photo={user.photo} size={38} />
          <div className="sidebar-user-text">
            <strong>{user.name}</strong>
            <span>{isAdmin ? 'Admin / Supervisor' : 'Operational lead'}</span>
          </div>
          <button
            className="icon-btn on-dark"
            title="Sign out"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Icon name="menu" />
          </button>
          <Logo />
          <span />
        </header>
        <main className="content">
          <Outlet />
        </main>
        {location.pathname !== '/discussion' && <ChatAlerts messages={unreadMsgs} remind={!isAdmin} onOpen={openChat} />}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { Avatar, Logo } from './ui';
import { useAuth, useData, useNow } from '../context/AppContext';
import { caseTat } from '../utils/tat';

const NAV = [
  { group: 'Work', items: [
    { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/cases/new', label: 'New case', icon: 'newCase' },
    { to: '/cases', label: 'Cases', icon: 'folder', end: true, badge: 'overdue' },
    { to: '/reports', label: 'Reports', icon: 'report' },
  ] },
  { group: 'Monitoring', items: [{ to: '/sampling', label: 'Sampling logins', icon: 'activity' }] },
  { group: 'Masters', items: [
    { to: '/banks', label: 'Banks', icon: 'bank' },
    { to: '/team/leads', label: 'Operational leads', icon: 'users', adminOnly: true },
    { to: '/team/executives', label: 'Field executives', icon: 'badge' },
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
            return (
              <div className="nav-group" key={g.group}>
                <div className="nav-group-label">{g.group}</div>
                {items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    <Icon name={i.icon} size={19} />
                    <span>{i.label}</span>
                    {i.badge === 'overdue' && overdue > 0 && <span className="nav-badge" title="Out of TAT">{overdue}</span>}
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
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AppContext';
import { Field, Logo } from '../components/ui';
import Icon from '../components/Icon';

// Quick-fill buttons for local testing only (match reliable-api .env.example + `npm run seed:demo`).
const DEMO = import.meta.env?.DEV
  ? [
      { label: 'Admin', email: 'admin@reliable.in', password: 'ChangeMe@123' },
      { label: 'Operational lead', email: 'kavya@reliable.in', password: 'Demo@123' },
    ]
  : [];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login-art">
        <Logo light />
        <div className="login-copy">
          <span className="eyebrow">Investigation Agency · RCU</span>
          <h1>
            Field verification,
            <br />
            <em>on time</em>, every case.
          </h1>
          <p>Allocate residence, business, office, property and document checks, track TAT live and hand banks a clean QA-approved report.</p>
        </div>
        <ul className="login-points">
          <li><Icon name="clock" size={16} /> Local 8h · OGL 24h TAT tracking</li>
          <li><Icon name="layers" size={16} /> Multi-location cases, one report</li>
          <li><Icon name="shield" size={16} /> Customer feedback on every visit</li>
        </ul>
        <div className="login-rings" aria-hidden="true" />
      </section>
      <section className="login-panel">
        <form className="login-form" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Admin and operational lead accounts.</p>
          <Field label="Email ID">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </Field>
          <Field label="Password">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </Field>
          {error && <div className="alert alert-red">{error}</div>}
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {DEMO.length > 0 && (
          <div className="demo-box">
            <span>Demo accounts</span>
            <div>
              {DEMO.map((d) => (
                <button
                  type="button"
                  key={d.email}
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setEmail(d.email);
                    setPassword(d.password);
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          )}
        </form>
      </section>
    </div>
  );
}

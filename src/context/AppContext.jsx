import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '../api';

const AuthCtx = createContext(null);
const DataCtx = createContext(null);
const ToastCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.auth.current());
  const login = async (email, password) => {
    const u = await api.auth.login(email, password);
    setUser(u);
    return u;
  };
  const logout = () => {
    api.auth.logout();
    setUser(null);
  };
  const value = useMemo(() => ({ user, login, logout, isAdmin: user?.role === 'ADMIN' }), [user]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function DataProvider({ children }) {
  const { user } = useContext(AuthCtx);
  const [state, setState] = useState({ banks: [], ols: [], executives: [], cases: [], logins: [], ready: false, error: '' });

  const refresh = useCallback(async () => {
    try {
      const [banks, ols, executives, cases, logins] = await Promise.all([
        api.banks.list(),
        user?.role === 'ADMIN' ? api.users.list('OL') : Promise.resolve([]),
        api.users.list('EXECUTIVE'),
        api.cases.list(),
        api.logins.list(),
      ]);
      setState({ banks, ols, executives, cases, logins, ready: true, error: '' });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message }));
    }
  }, [user?.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const bankById = Object.fromEntries(state.banks.map((b) => [b.id, b]));
    const execById = Object.fromEntries(state.executives.map((e) => [e.id, e]));
    return { ...state, bankById, execById, refresh };
  }, [state, refresh]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((message, tone = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
export const useData = () => useContext(DataCtx);
export const useToast = () => useContext(ToastCtx);

export function useNow(interval = 20000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(t);
  }, [interval]);
  return now;
}

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, DataProvider, ToastProvider, useAuth, useData } from './context/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NewCase from './pages/NewCase';
import Cases from './pages/Cases';
import CaseDetail from './pages/CaseDetail';
import CaseReport from './pages/CaseReport';
import Reports from './pages/Reports';
import BankPerformanceReport from './pages/BankPerformanceReport';
import SamplingLogins from './pages/SamplingLogins';
import Banks from './pages/Banks';
import Team from './pages/Team';
import Feedback from './pages/Feedback';

function Protected({ children, adminOnly }) {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return <DataProvider><Gate>{children}</Gate></DataProvider>;
}

function Gate({ children }) {
  const { ready, error, refresh } = useData();
  if (error && !ready)
    return (
      <div className="boot">
        <div className="empty">
          <strong>Could not load data</strong>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={refresh}>Try again</button>
        </div>
      </div>
    );
  if (!ready)
    return (
      <div className="boot">
        <div className="spinner" />
      </div>
    );
  return children;
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/feedback/:token" element={<Feedback />} />
          <Route path="/cases/:id/report" element={<Protected><CaseReport /></Protected>} />
          <Route path="/reports/bank-performance" element={<Protected><BankPerformanceReport /></Protected>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/new" element={<NewCase />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/sampling" element={<SamplingLogins />} />
            <Route path="/banks" element={<Banks />} />
            <Route path="/team/leads" element={<AdminOnly><Team role="OL" /></AdminOnly>} />
            <Route path="/team/executives" element={<Team role="EXECUTIVE" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/" replace />;
}

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
import BackendReviewReport from './pages/BackendReviewReport';
import FieldOfficerReviewReport from './pages/FieldOfficerReviewReport';
import SamplingLogins from './pages/SamplingLogins';
import Banks from './pages/Banks';
import Team from './pages/Team';
import Feedback from './pages/Feedback';
import Attendance from './pages/Attendance';
import Discussion from './pages/Discussion';
import ExperienceLetter from './pages/ExperienceLetter';
import SamplingSummaryReport from './pages/SamplingSummaryReport';

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
          <Route path="/reports/backend-review" element={<Protected><BackendReviewReport /></Protected>} />
          <Route path="/reports/field-officer-review" element={<Protected><FieldOfficerReviewReport /></Protected>} />
          <Route path="/reports/staff-performance" element={<Navigate to="/reports?tab=executive" replace />} />
          <Route path="/reports/sampling-summary" element={<Protected><SamplingSummaryReport /></Protected>} />
          <Route path="/team/:group/:id/experience-letter" element={<Protected adminOnly><ExperienceLetter /></Protected>} />
          <Route element={<Protected><Layout /></Protected>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/cases/new" element={<NewCase />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/sampling" element={<SamplingLogins />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/discussion" element={<Discussion />} />
            <Route path="/banks" element={<AdminOnly><Banks /></AdminOnly>} />
            <Route path="/team/leads" element={<AdminOnly><Team role="OL" /></AdminOnly>} />
            <Route path="/team/executives" element={<AdminOnly><Team role="EXECUTIVE" /></AdminOnly>} />
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

import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth, useData } from '../context/AppContext';
import { FoCaseIds, FoFinal, FoHeader, FoKpis, FoOutcomes, FoTatTable, ReviewPage } from '../components/Reviews';
import Icon from '../components/Icon';
import { LANDSCAPE } from '../components/Reviews';
import { defaultFoText, fieldOfficerReview } from '../utils/reviews';
import { inRange } from '../utils/stats';
import { fmtLongDate } from '../utils/format';
import { managerOf } from './Reports';
import WordButton from '../components/WordButton';

// "Field Officer Performance Review" — 3 landscape pages, ?id=&from=&to=
export default function FieldOfficerReviewReport() {
  const { user } = useAuth();
  const { cases, executives, ols } = useData();
  const p = new URLSearchParams(useLocation().search);
  const from = p.get('from') || '';
  const to = p.get('to') || '';
  const exec = executives.find((e) => e.id === p.get('id'));
  const r = useMemo(() => (exec ? fieldOfficerReview(exec, cases.filter((c) => inRange(c, from, to))) : null), [exec, cases, from, to]);
  const [text, setText] = useState(() => (r ? defaultFoText(r) : null));
  if (!r) return <Navigate to="/reports?tab=executive" replace />;
  const period = `${from ? fmtLongDate(from) : 'Start'} – ${to ? fmtLongDate(to) : 'Today'}`;
  const sub = `${exec.name} · ${exec.employeeId} · ${period}`;

  return (
    <div className="report-shell">
      <style>{LANDSCAPE}</style>
      <div className="report-toolbar no-print">
        <Link to={`/reports?tab=executive&id=${exec.id}`} className="btn btn-ghost">
          <Icon name="chevronLeft" /> Reports
        </Link>
        <span className="toolbar-hint">Edit the review text on page 3, then print in landscape</span>
        <WordButton filename={`Field_officer_review_${exec.name.replace(/\W+/g, '_')}_${from || 'start'}_${to || 'today'}.docx`} />
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>
      <div className="report">
        <ReviewPage kicker="Performance snapshot" title="Field Officer Performance Review" sub={period} page={1} total={3}>
          <FoHeader r={r} managerName={managerOf(exec, ols, user)} period={period} />
          <FoKpis r={r} />
          <FoTatTable r={r} />
        </ReviewPage>
        <ReviewPage kicker="Status outcome" title="Status outcome & quality" sub={sub} page={2} total={3}>
          <FoOutcomes r={r} />
          <FoCaseIds r={r} />
        </ReviewPage>
        <ReviewPage kicker="Final review" title={`Final review — ${exec.name}`} sub={sub} page={3} total={3}>
          <FoKpis r={r} compact />
          <FoFinal r={r} text={text} setText={setText} editable />
        </ReviewPage>
      </div>
    </div>
  );
}

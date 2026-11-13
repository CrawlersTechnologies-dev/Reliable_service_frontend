import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth, useData } from '../context/AppContext';
import { BackendOverall, BackendSnapshot, BackendStatus, DEFAULT_BACKEND_TEXT, ReviewPage } from '../components/Reviews';
import Icon from '../components/Icon';
import AttendanceStrip from '../components/AttendanceStrip';
import { LANDSCAPE } from '../components/Reviews';
import { backendReview, casesHandledBy } from '../utils/reviews';
import { caseActors, inRange } from '../utils/stats';
import { fmtLongDate } from '../utils/format';
import WordButton from '../components/WordButton';

// "Back-End Performance Review" — 3 landscape pages, ?person=&from=&to=
export default function BackendReviewReport() {
  const { user, isAdmin } = useAuth();
  const { cases, ols, bankById } = useData();
  const p = new URLSearchParams(useLocation().search);
  const from = p.get('from') || '';
  const to = p.get('to') || '';
  const who = isAdmin ? p.get('person') || '' : user.id; // an OL only prints their own review
  const review = useMemo(() => backendReview(casesHandledBy(cases.filter((c) => inRange(c, from, to)), who), bankById), [cases, from, to, who, bankById]);
  const [text, setText] = useState(DEFAULT_BACKEND_TEXT);
  const name = who ? caseActors(cases, ols).find((x) => x.id === who)?.name || user.name : 'All back-end';
  const sub = `${name} · ${from ? fmtLongDate(from) : 'Start'} – ${to ? fmtLongDate(to) : 'Today'}`;

  return (
    <div className="report-shell">
      <style>{LANDSCAPE}</style>
      <div className="report-toolbar no-print">
        <Link to="/reports?tab=ol" className="btn btn-ghost">
          <Icon name="chevronLeft" /> Reports
        </Link>
        <span className="toolbar-hint">Edit the text on page 3, then print in landscape</span>
        <WordButton filename={`Backend_review_${name.replace(/\W+/g, '_')}_${from || 'start'}_${to || 'today'}.docx`} />
        <button className="btn btn-primary" onClick={() => window.print()}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>
      <div className="report">
        <ReviewPage kicker="Back-end performance" title="Back-End Performance Review" sub={sub} page={1} total={3}>
          <BackendSnapshot review={review} />
          {who && <AttendanceStrip personId={who} from={from} to={to} />}
        </ReviewPage>
        <ReviewPage kicker="Status insights" title="Bank-wise status insights" sub={sub} page={2} total={3}>
          <BackendStatus review={review} />
        </ReviewPage>
        <ReviewPage kicker="Overall performance" title="Overall performance & next steps" sub={sub} page={3} total={3}>
          <BackendOverall review={review} text={text} setText={setText} editable />
        </ReviewPage>
      </div>
    </div>
  );
}

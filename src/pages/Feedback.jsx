import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import * as api from '../api';
import { Logo, Stars } from '../components/ui';
import Icon from '../components/Icon';
import { DECLARATION_QUESTIONS, typeOf } from '../config/verification';

// Public page the customer opens from the link shared by admin / OL. No login.
export default function Feedback() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ rating: 0, respondentName: '', comments: '', ...Object.fromEntries(DECLARATION_QUESTIONS.map((q) => [q.key, null])) });

  useEffect(() => {
    api.feedback.get(token).then(setInfo).catch((e) => setError(e.message));
  }, [token]);

  const answered = DECLARATION_QUESTIONS.every((q) => form[q.key] !== null) && form.rating > 0;

  async function submit(e) {
    e.preventDefault();
    if (!answered) return;
    setBusy(true);
    try {
      await api.feedback.submit(token, form);
      setDone(true);
    } catch (x) {
      setError(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="public">
      <header className="public-head">
        <Logo light />
      </header>
      <main className="public-card">
        {error ? (
          <div className="public-msg">
            <Icon name="alert" size={30} />
            <h1>Link not available</h1>
            <p>{error}</p>
          </div>
        ) : !info ? (
          <div className="boot"><div className="spinner" /></div>
        ) : done || info.alreadySubmitted ? (
          <div className="public-msg ok">
            <Icon name="checkCircle" size={34} />
            <h1>Thank you</h1>
            <p>Your feedback has been recorded. It helps us keep every visit honest and professional.</p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <span className="eyebrow">Visit feedback · {info.caseNo}</span>
            <h1>How was our executive's visit?</h1>
            <p className="muted">
              Dear {info.customerName}, a Reliable Services field executive visited you for your {info.bankName} application. Please confirm the following — your answers go only to our management.
            </p>
            <ul className="visit-execs">
              {info.executives.map((x, i) => (
                <li key={i}>
                  <Icon name="user" size={15} /> {x.name} <span className="muted">· {typeOf(x.type).label}</span>
                </li>
              ))}
            </ul>

            <div className="fb-q">
              <span className="field-label">Overall rating</span>
              <Stars value={form.rating} onChange={(rating) => setForm({ ...form, rating })} size={30} />
            </div>

            {DECLARATION_QUESTIONS.map((q) => (
              <div className="fb-q" key={q.key}>
                <p>{q.text}</p>
                <p className="kn">{q.textKn}</p>
                <div className="yesno">
                  <button type="button" className={form[q.key] === true ? 'on yes' : ''} onClick={() => setForm({ ...form, [q.key]: true })}>
                    Yes, correct · ಹೌದು
                  </button>
                  <button type="button" className={form[q.key] === false ? 'on no' : ''} onClick={() => setForm({ ...form, [q.key]: false })}>
                    No · ಇಲ್ಲ
                  </button>
                </div>
              </div>
            ))}

            <label className="field">
              <span className="field-label">Your name</span>
              <input value={form.respondentName} onChange={(e) => setForm({ ...form, respondentName: e.target.value })} placeholder="Person who met the executive" />
            </label>
            <label className="field">
              <span className="field-label">Anything else? (optional)</span>
              <textarea rows={3} value={form.comments} onChange={(e) => setForm({ ...form, comments: e.target.value })} />
            </label>
            <button className="btn btn-primary btn-block" disabled={!answered || busy}>
              {busy ? 'Submitting…' : 'Submit feedback'}
            </button>
            {!answered && <p className="muted small center">Please give a rating and answer each question.</p>}
          </form>
        )}
      </main>
    </div>
  );
}

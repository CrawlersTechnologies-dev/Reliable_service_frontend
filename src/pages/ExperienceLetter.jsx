import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useData } from '../context/AppContext';
import { Logo } from '../components/ui';
import Icon from '../components/Icon';
import { AGENCY } from '../config/verification';
import { todayISO } from '../utils/format';
import signature from '../assets/signature.png';
import stamp from '../assets/stamp.png';
import WordButton from '../components/WordButton';

// Experience letter in the client's format, for operational leads and field executives.
// Title, designation, salary and dates can be adjusted on screen before printing.
const ddmmyyyy = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};

function defaultDesignation(p, isLead) {
  if (isLead) return 'Operations';
  return p.execType === 'SAMPLER' ? 'Sampler' : 'Field Officer';
}

export default function ExperienceLetter() {
  const { group, id } = useParams();
  const { ols, executives } = useData();
  const isLead = group === 'leads';
  const p = (isLead ? ols : executives).find((o) => o.id === id);
  const back = isLead ? '/team/leads' : '/team/executives';

  const [title, setTitle] = useState('Mr.');
  const [date, setDate] = useState(todayISO());
  const [from, setFrom] = useState(p?.doj || '');
  const [to, setTo] = useState(p?.relievedOn || todayISO());
  const [designation, setDesignation] = useState(p ? defaultDesignation(p, isLead) : '');
  const [salary, setSalary] = useState(p?.salary ? String(p.salary) : '');
  const [noDues, setNoDues] = useState(true);
  if (!p) return <Navigate to={back} replace />;

  const male = title === 'Mr.';
  const he = male ? 'he' : 'she';
  const He = male ? 'He' : 'She';
  const his = male ? 'his' : 'her';
  const His = male ? 'His' : 'Her';
  const him = male ? 'him' : 'her';
  const role = designation.trim() || '—';
  const pay = Number(String(salary).replace(/[^\d.]/g, ''));

  return (
    <div className="report-shell">
      <div className="report-toolbar no-print">
        <Link to={back} className="btn btn-ghost">
          <Icon name="chevronLeft" /> {isLead ? 'Operational leads' : 'Field executives'}
        </Link>
        <span className="toolbar-hint">Experience letter · {p.name}</span>
        <WordButton filename={`Experience_letter_${p.name.replace(/\W+/g, '_')}.docx`} disabled={!from || !to} />
        <button className="btn btn-primary" onClick={() => window.print()} disabled={!from || !to}>
          <Icon name="printer" /> Print / Save as PDF
        </button>
      </div>
      <div className="report">
        <div className="card letter-editor no-print">
          <div className="letter-fields">
            <label className="field">
              <span className="field-label">Title</span>
              <select value={title} onChange={(e) => setTitle(e.target.value)}>
                <option>Mr.</option>
                <option>Ms.</option>
                <option>Mrs.</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Designation</span>
              <input value={designation} onChange={(e) => setDesignation(e.target.value)} list="letter-designations" />
              <datalist id="letter-designations">
                {['Sampler', 'Field Officer', 'Operations', 'Sampler/Operations', 'Back Office Executive'].map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </label>
            <label className="field">
              <span className="field-label">Monthly salary (Rs.)</span>
              <input inputMode="numeric" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="e.g. 15000 (leave blank to omit)" />
            </label>
            <label className="field">
              <span className="field-label">Employed from</span>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Employed to</span>
              <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </label>
            <label className="field">
              <span className="field-label">Letter date</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={noDues} onChange={(e) => setNoDues(e.target.checked)} />
            <span>Print the "no dues" note</span>
          </label>
        </div>

        <section className="r-page letter letter-client">
          <header className="letter-head">
            <Logo />
            <div className="letter-org">
              <strong>{AGENCY.name}</strong>
              <span>{AGENCY.tagline}</span>
              <span>{AGENCY.address}</span>
            </div>
          </header>
          <div className="letter-meta">
            <span>Ref: RS/HR/EXP/{p.employeeId}</span>
            <span>Date: {ddmmyyyy(date)}</span>
          </div>

          <h1 className="letter-concern">TO WHOMSOEVER IT MAY CONCERN</h1>

          <p>
            This is to certify that{' '}
            <strong>
              {title} {p.name}
            </strong>{' '}
            was employed with our Company (<strong>RELIABLE SERVICES</strong>) from {ddmmyyyy(from)} to {ddmmyyyy(to)} as a{' '}
            <strong>{role}</strong>
            {pay > 0 && (
              <>
                {' '}
                and drawing monthly salary of <strong>Rs. {pay.toLocaleString('en-IN')}/-PM</strong>
              </>
            )}
            .
          </p>

          <p className="letter-gap">
            {His} major responsibilities included working as a <strong>{role}</strong>.
          </p>
          <p>
            {He} has quite a capacity in this area. During the time {he} was working for us, {he} was very hard working and efficient. {He} was
            able to perform all the responsibilities as assigned.
          </p>
          <p>
            In our opinion, {he} was such a motivated, duty bound and highly committed team member that {his} knowledge was quite a valuable
            asset to our company.
          </p>
          <p>We at Reliable Services wish {him} all success in {his} future endeavors.</p>
          {noDues && <p>Note: We traced out there is no due regarding {him} in our company.</p>}

          <div className="letter-sign">
            <p>Reliable Services</p>
            <div className="letter-sign-art">
              <img src={signature} alt="Signature" className="letter-signature" />
              <img src={stamp} alt="Company seal" className="letter-stamp" />
            </div>
            <p>Authorized signatory with seal</p>
          </div>
          <div className="r-foot">
            <span>
              {AGENCY.name.toUpperCase()} | {AGENCY.address}
            </span>
            <span>Experience letter</span>
          </div>
        </section>
      </div>
    </div>
  );
}

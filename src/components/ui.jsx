import { useEffect } from 'react';
import Icon from './Icon';
import { typeOf } from '../config/verification';
import { caseTat, fmtDuration } from '../utils/tat';
import { initials } from '../utils/format';

export function Logo({ compact = false, light = false }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <svg viewBox="0 0 48 48" className="logo-mark" aria-hidden="true">
        <path d="M24 6a18 18 0 1 0 18 18" fill="none" stroke="#D0151F" strokeWidth="6" strokeLinecap="round" />
        <path d="M24 13a11 11 0 1 0 11 11" fill="none" stroke="#8E0E16" strokeWidth="3" strokeLinecap="round" />
        <path d="M34 6.5h7.5V14" fill="none" stroke="#F2B705" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4" fill="#F2B705" />
      </svg>
      {!compact && (
        <div className="logo-text">
          <strong>RELIABLE</strong>
          <span>SERVICES</span>
        </div>
      )}
    </div>
  );
}

export function Pill({ tone = 'slate', children, icon }) {
  return (
    <span className={`pill pill-${tone}`}>
      {icon && <Icon name={icon} size={13} strokeWidth={2.4} />}
      {children}
    </span>
  );
}

export function TypeChip({ type }) {
  const t = typeOf(type);
  return <span className={`type-chip tone-${t.tone}`}>{t.label}</span>;
}

// Live TAT indicator. variant: "chip" (list) or "big" (detail header).
export function TatBadge({ c, now, variant = 'chip', tat: given }) {
  const tat = given || caseTat(c, now);
  const map = {
    IN_TAT: { tone: 'green', text: `${fmtDuration(tat.diff)} left`, label: 'In TAT' },
    OUT_OF_TAT: { tone: 'red', text: `+${fmtDuration(tat.overdue)} over`, label: 'Out of TAT' },
    MET: { tone: 'green-soft', text: 'Within TAT', label: 'TAT met' },
    MISSED: { tone: 'red-soft', text: `Late by ${fmtDuration(tat.overdue)}`, label: 'TAT missed' },
  }[tat.state];
  if (variant === 'big') {
    return (
      <div className={`tat-big tat-${map.tone}`}>
        <div className="tat-big-top">
          <Icon name={tat.state === 'OUT_OF_TAT' ? 'alert' : 'clock'} size={16} />
          <span>{map.label}</span>
        </div>
        <div className="tat-big-time">{map.text}</div>
        {(tat.state === 'IN_TAT' || tat.state === 'OUT_OF_TAT') && (
          <div className="tat-track">
            <div style={{ width: `${tat.progress * 100}%` }} />
          </div>
        )}
      </div>
    );
  }
  return (
    <span className={`tat-chip tat-${map.tone}`} title={map.label}>
      {tat.state === 'OUT_OF_TAT' && <span className="pulse-dot" />}
      {map.text}
    </span>
  );
}

export function Avatar({ name, photo, size = 36 }) {
  return photo ? (
    <img className="avatar" src={photo} alt="" style={{ width: size, height: size }} />
  ) : (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials(name)}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="page-header">
      <div>
        {back}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, error, required, children, className = '' }) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">
        {label}
        {required && <em>*</em>}
      </span>
      {children}
      {error ? <span className="field-error">{error}</span> : hint ? <span className="field-hint">{hint}</span> : null}
    </label>
  );
}

export function Modal({ open, onClose, title, children, footer, width = 560 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ icon = 'folder', title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={26} />
      </div>
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function Stat({ label, value, tone = 'ink', icon, foot, onClick, active }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag className={`stat stat-${tone} ${active ? 'is-active' : ''}`} onClick={onClick}>
      <div className="stat-top">
        <span>{label}</span>
        {icon && (
          <span className="stat-icon">
            <Icon name={icon} size={17} />
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </Tag>
  );
}

export function Stars({ value = 0, onChange, size = 22 }) {
  return (
    <div className="stars" role={onChange ? 'radiogroup' : undefined}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= value ? 'on' : ''}`}
          onClick={onChange ? () => onChange(n) : undefined}
          disabled={!onChange}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Icon name="star" size={size} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
          {o.count != null && <span className="seg-count">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

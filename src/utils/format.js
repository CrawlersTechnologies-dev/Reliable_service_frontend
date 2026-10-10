const dateFmt = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
const longDate = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

export const fmtDate = (d) => (d ? dateFmt.format(new Date(d)) : '—');
export const fmtLongDate = (d) => (d ? longDate.format(new Date(d)) : '—');
export const fmtTime = (d) => (d ? timeFmt.format(new Date(d)) : '—');
export const fmtDateTime = (d) => (d ? `${fmtDate(d)}, ${fmtTime(d)}` : '—');
export const pad2 = (n) => (n === '' || n == null ? '—' : String(n).padStart(2, '0'));
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
export const inr = (n) => (n || n === 0 ? `₹${Number(n).toLocaleString('en-IN')}` : '—');
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function feedbackUrl(token) {
  return `${window.location.origin}/feedback/${token}`;
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

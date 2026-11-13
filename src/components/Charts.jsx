import { useState } from 'react';

// Hand-drawn SVG charts (no chart library). Every mark has a text label or a
// legend entry with its value, so colour is never the only way to read it.

/* ---------------- Donut (parts of a whole) ----------------
   data: [{ key, label, value, color }] — zero values are listed but not drawn */
export function Donut({ data, size = 180, thickness = 30, center, sub, onSelect, stacked = false }) {
  const [hover, setHover] = useState(null);
  const total = data.reduce((n, d) => n + d.value, 0);
  const r = size / 2 - 2;
  const ir = r - thickness;
  const cx = size / 2;
  let angle = -Math.PI / 2;
  const gap = data.filter((d) => d.value > 0).length > 1 ? 0.018 : 0; // 2px-ish surface gap between slices

  const arcs = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const a = (d.value / total) * Math.PI * 2;
      const start = angle + gap / 2;
      const end = angle + a - gap / 2;
      angle += a;
      return { ...d, path: arc(cx, cx, r, ir, start, Math.max(end, start + 0.001)), pct: Math.round((d.value / total) * 100) };
    });
  const shown = hover ? data.find((d) => d.key === hover) : null;

  return (
    <div className={`donut ${stacked ? 'donut-stacked' : ''}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={data.map((d) => `${d.label} ${d.value}`).join(', ')}>
        {total === 0 ? (
          <circle cx={cx} cy={cx} r={(r + ir) / 2} fill="none" stroke="var(--line)" strokeWidth={thickness} />
        ) : (
          arcs.map((a) => (
            <path
              key={a.key}
              d={a.path}
              fill={a.color}
              className={`donut-slice ${hover && hover !== a.key ? 'dim' : ''}`}
              onMouseEnter={() => setHover(a.key)}
              onMouseLeave={() => setHover(null)}
              onClick={onSelect ? () => onSelect(a.key) : undefined}
            >
              <title>{`${a.label}: ${a.value} (${a.pct}%)`}</title>
            </path>
          ))
        )}
        <text x={cx} y={cx - 2} textAnchor="middle" className="donut-num">
          {shown ? shown.value : center ?? total}
        </text>
        <text x={cx} y={cx + 17} textAnchor="middle" className="donut-sub">
          {shown ? shown.label : sub}
        </text>
      </svg>
      <ul className="legend">
        {data.map((d) => (
          <li key={d.key} className={hover === d.key ? 'on' : ''} onMouseEnter={() => setHover(d.key)} onMouseLeave={() => setHover(null)}>
            <span className="swatch" style={{ background: d.color }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-val">
              {d.value}
              {total > 0 && <em> · {Math.round((d.value / total) * 100)}%</em>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function arc(cx, cy, r, ir, a0, a1) {
  if (a1 - a0 >= Math.PI * 2 - 1e-4) a1 = a0 + Math.PI * 2 - 1e-4; // a full ring would collapse to nothing
  const p = (rad, a) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(r, a0);
  const [x1, y1] = p(r, a1);
  const [x2, y2] = p(ir, a1);
  const [x3, y3] = p(ir, a0);
  return `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${ir},${ir} 0 ${large} 0 ${x3},${y3} Z`;
}

/* ---------------- Horizontal bars ----------------
   rows:   [{ key, label, sub?, values: { [seriesKey]: number } }]
   series: [{ key, label, color }]
   mode:   'stack' (parts that add up, e.g. on time + late) | 'group' (separate measures side by side) */
export function BarRows({ rows, series, mode = 'stack', valueSuffix = '', emptyText = 'No data in this period' }) {
  const max = Math.max(
    1,
    ...rows.map((r) => (mode === 'stack' ? series.reduce((n, s) => n + (r.values[s.key] || 0), 0) : Math.max(...series.map((s) => r.values[s.key] || 0)))),
  );
  if (!rows.length) return <p className="muted small">{emptyText}</p>;
  return (
    <div className={`bars bars-${mode}`}>
      {series.length > 1 && (
        <ul className="legend legend-row">
          {series.map((s) => (
            <li key={s.key}>
              <span className="swatch" style={{ background: s.color }} />
              <span className="legend-label">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      {rows.map((r) => {
        const total = series.reduce((n, s) => n + (r.values[s.key] || 0), 0);
        return (
          <div className="bar-row" key={r.key}>
            <div className="bar-label">
              <strong>{r.label}</strong>
              {r.sub && <span className="muted small">{r.sub}</span>}
            </div>
            {mode === 'stack' ? (
              <div className="bar-track-wrap">
                <div className="bar-track">
                  {series.map((s) => {
                    const v = r.values[s.key] || 0;
                    if (!v) return null;
                    return (
                      <div key={s.key} className="bar-seg" style={{ width: `${(v / max) * 100}%`, background: s.color }} title={`${r.label} — ${s.label}: ${v}${valueSuffix}`}>
                        {(v / max) * 100 > 9 && <span>{v}</span>}
                      </div>
                    );
                  })}
                </div>
                <span className="bar-total">{total}{valueSuffix}</span>
              </div>
            ) : (
              <div className="bar-group">
                {series.map((s) => {
                  const v = r.values[s.key] || 0;
                  return (
                    <div className="bar-track-wrap" key={s.key}>
                      <div className="bar-track thin">
                        <div className="bar-seg" style={{ width: `${(v / max) * 100}%`, background: s.color }} title={`${r.label} — ${s.label}: ${v}${valueSuffix}`} />
                      </div>
                      <span className="bar-total">{v}{valueSuffix}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Vertical grouped columns ----------------
   groups: [{ key, label, values: { [seriesKey]: number } }]   series: [{ key, label, color }] */
export function Columns({ groups, series, height = 220, yLabel }) {
  const max = niceMax(Math.max(1, ...groups.flatMap((g) => series.map((s) => g.values[s.key] || 0))));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(max * t));
  const W = 520;
  const H = height;
  const pad = { l: 44, r: 8, t: 10, b: 34 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const gw = iw / Math.max(1, groups.length);
  const bw = Math.min(56, (gw * 0.7) / series.length);
  const y = (v) => pad.t + ih - (v / max) * ih;
  if (!groups.length) return <p className="muted small">No closed cases in this period.</p>;
  return (
    <div className="columns">
      <ul className="legend legend-row">
        {series.map((s) => (
          <li key={s.key}>
            <span className="swatch" style={{ background: s.color }} />
            <span className="legend-label">{s.label}</span>
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={groups.map((g) => `${g.label}: ${series.map((s) => `${s.label} ${g.values[s.key] || 0}`).join(', ')}`).join('; ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="col-grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="col-axis">{t}</text>
          </g>
        ))}
        {yLabel && (
          <text transform={`translate(12 ${pad.t + ih / 2}) rotate(-90)`} textAnchor="middle" className="col-axis">{yLabel}</text>
        )}
        {groups.map((g, gi) => {
          const x0 = pad.l + gi * gw + (gw - bw * series.length - 2 * (series.length - 1)) / 2;
          return (
            <g key={g.key}>
              {series.map((s, si) => {
                const v = g.values[s.key] || 0;
                const x = x0 + si * (bw + 2);
                const h = Math.max(v ? 2 : 0, (v / max) * ih);
                return (
                  <g key={s.key}>
                    <path d={topRounded(x, pad.t + ih - h, bw, h, Math.min(4, h))} fill={s.color}>
                      <title>{`${g.label} — ${s.label}: ${v}`}</title>
                    </path>
                    <text x={x + bw / 2} y={pad.t + ih - h - 4} textAnchor="middle" className="col-val">{v}</text>
                  </g>
                );
              })}
              <text x={pad.l + gi * gw + gw / 2} y={H - 12} textAnchor="middle" className="col-label">{g.label}</text>
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="col-base" />
      </svg>
    </div>
  );
}

function niceMax(v) {
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 5 ? 5 : 10) * p;
}
function topRounded(x, y, w, h, r) {
  if (h <= 0) return '';
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`;
}

/* ---------------- Percentage bars (0–100 scale) ----------------
   rows: [{ key, label, value (0–100), color }] */
export function PctBars({ rows }) {
  return (
    <div className="pct-bars">
      {rows.map((r) => (
        <div key={r.key} className="pct-row">
          <span className="pct-label">{r.label}</span>
          <div className="pct-track">
            <div style={{ width: `${Math.min(100, r.value)}%`, background: r.color }} />
          </div>
          <span className="pct-val">{(Math.round(r.value * 10) / 10).toFixed(1)}%</span>
        </div>
      ))}
      <div className="pct-row pct-scale-row" aria-hidden="true">
        <span />
        <div className="pct-scale">
          <span>0</span><span>20</span><span>40</span><span>60</span><span>80</span><span>100</span>
        </div>
        <span />
      </div>
    </div>
  );
}

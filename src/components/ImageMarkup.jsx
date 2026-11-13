import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// "Marking pen" for chat images: draw / highlight on a photo, then send the marked copy.
// src: a File (image picked to send) or a URL (an image already in the chat).
const COLORS = [
  { key: '#D0151F', label: 'Red' },
  { key: '#F2B705', label: 'Yellow' },
  { key: '#15803D', label: 'Green' },
  { key: '#2257C7', label: 'Blue' },
  { key: '#111111', label: 'Black' },
  { key: '#FFFFFF', label: 'White' },
];
const SIZES = [
  { key: 3, label: 'Thin' },
  { key: 6, label: 'Medium' },
  { key: 12, label: 'Thick' },
];
const MAX_SIDE = 1800;

export default function ImageMarkup({ src, name = 'image.jpg', onDone, onClose }) {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const drawing = useRef(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [tool, setTool] = useState('pen'); // pen | marker
  const [color, setColor] = useState(COLORS[0].key);
  const [size, setSize] = useState(6);
  const [strokes, setStrokes] = useState([]);
  const [busy, setBusy] = useState(false);

  // load the image (fetched as a blob so the canvas can be exported).
  // The blob URL is released once the image has loaded — not in the cleanup, because
  // React dev mode runs this effect twice and would cancel the first load half-way.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const blob = src instanceof Blob ? src : await (await fetch(src)).blob();
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          if (!alive) return;
          imgRef.current = img;
          const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
          const c = canvasRef.current;
          if (!c) return;
          c.width = Math.round(img.naturalWidth * k);
          c.height = Math.round(img.naturalHeight * k);
          setReady(true);
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          if (alive) setError('This image could not be opened.');
        };
        img.src = url;
      } catch {
        if (alive) setError('This image could not be opened.');
      }
    })();
    return () => {
      alive = false;
    };
  }, [src]);

  // redraw image + all strokes
  useEffect(() => {
    if (!ready) return;
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.globalAlpha = 1;
    ctx.drawImage(imgRef.current, 0, 0, c.width, c.height);
    const scale = Math.max(c.width, c.height) / 900; // stroke sizes relative to a ~900px view
    for (const s of strokes) {
      if (!s?.points?.length) continue;
      ctx.save();
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = s.marker ? 0.38 : 1;
      ctx.lineWidth = s.size * scale * (s.marker ? 3 : 1);
      ctx.lineCap = s.marker ? 'butt' : 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (s.points.length === 1) ctx.lineTo(s.points[0][0] + 0.1, s.points[0][1] + 0.1);
      ctx.stroke();
      ctx.restore();
    }
  }, [ready, strokes]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') setStrokes((s) => s.slice(0, -1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pos = (e) => {
    const c = canvasRef.current;
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * c.width, ((e.clientY - r.top) / r.height) * c.height];
  };
  const down = (e) => {
    if (!ready) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const stroke = { color: tool === 'marker' && color === '#D0151F' ? '#F2B705' : color, size, marker: tool === 'marker', points: [pos(e)] };
    drawing.current = stroke;
    setStrokes((s) => [...s, stroke]);
  };
  const move = (e) => {
    const cur = drawing.current;
    if (!cur) return;
    // snapshot outside the state updater — the ref is cleared on pointer-up
    const next = { ...cur, points: [...cur.points, pos(e)] };
    drawing.current = next;
    setStrokes((s) => [...s.slice(0, -1), next]);
  };
  const up = () => {
    drawing.current = null;
  };

  async function done() {
    setBusy(true);
    const blob = await new Promise((r) => canvasRef.current.toBlob(r, 'image/jpeg', 0.9));
    const base = name.replace(/\.[^.]+$/, '') || 'image';
    onDone(new File([blob], `${base}-marked.jpg`, { type: 'image/jpeg' }));
  }

  return (
    <div className="markup" role="dialog" aria-label="Mark on image">
      <div className="markup-bar">
        <div className="markup-tools">
          <button type="button" className={`markup-btn ${tool === 'pen' ? 'on' : ''}`} onClick={() => setTool('pen')} title="Pen">
            <Icon name="edit" size={16} /> Pen
          </button>
          <button type="button" className={`markup-btn ${tool === 'marker' ? 'on' : ''}`} onClick={() => setTool('marker')} title="Highlighter">
            <span className="markup-hl" /> Highlight
          </button>
          <span className="markup-sep" />
          {COLORS.map((c) => (
            <button
              type="button"
              key={c.key}
              className={`markup-color ${color === c.key ? 'on' : ''}`}
              style={{ background: c.key }}
              onClick={() => setColor(c.key)}
              title={c.label}
              aria-label={c.label}
            />
          ))}
          <span className="markup-sep" />
          {SIZES.map((s) => (
            <button type="button" key={s.key} className={`markup-size ${size === s.key ? 'on' : ''}`} onClick={() => setSize(s.key)} title={s.label} aria-label={s.label}>
              <span style={{ width: s.key + 2, height: s.key + 2 }} />
            </button>
          ))}
          <span className="markup-sep" />
          <button type="button" className="markup-btn" onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length} title="Undo (Ctrl + Z)">
            <Icon name="refresh" size={15} /> Undo
          </button>
          <button type="button" className="markup-btn" onClick={() => setStrokes([])} disabled={!strokes.length}>
            <Icon name="trash" size={15} /> Clear
          </button>
        </div>
        <div className="markup-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={done} disabled={!ready || busy}>
            <Icon name="check" /> {busy ? 'Saving…' : 'Use marked image'}
          </button>
        </div>
      </div>
      <div className="markup-stage">
        {error ? (
          <p className="markup-error">{error}</p>
        ) : (
          <canvas
            ref={canvasRef}
            className={ready ? '' : 'loading'}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={up}
          />
        )}
        {!ready && !error && <p className="markup-loading">Opening image…</p>}
      </div>
    </div>
  );
}

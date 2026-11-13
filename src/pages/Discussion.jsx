import { useEffect, useRef, useState } from 'react';
import * as api from '../api';
import { useAuth, useToast } from '../context/AppContext';
import { Avatar, PageHeader } from '../components/ui';
import Icon from '../components/Icon';
import ImageMarkup from '../components/ImageMarkup';
import { fmtDate, fmtTime } from '../utils/format';

export const CHAT_SEEN_KEY = 'reliable_chat_seen';

const MAX_FILES = 5;
const MAX_MB = 10;
const ACCEPT = '.jpg,.jpeg,.png,.webp,.gif,.pdf,.xls,.xlsx,.csv,.doc,.docx';
const OK_EXT = ACCEPT.split(',');
const EMOJIS = [
  '😀', '😃', '😄', '😁', '😅', '😂', '🙂', '😉', '😊', '😍', '🤔', '😐', '😮', '😢', '😡', '🙏',
  '👍', '👎', '👌', '👏', '🙌', '💪', '🤝', '✌️', '👋', '✅', '❌', '⚠️', '❗', '❓', '⏰', '📌',
  '📎', '📄', '📊', '📈', '📉', '📁', '📝', '📞', '📍', '🏠', '🏢', '🏦', '🚗', '💰', '🎉', '🎂',
  '🔥', '⭐', '💯', '❤️', '🟢', '🟡', '🔴', '➡️',
];
const extOf = (name = '') => (name.match(/\.[^.]+$/)?.[0] || '').toLowerCase();
const isImage = (a) => a.type?.startsWith('image/');
const kindOf = (a) => {
  const e = extOf(a.name);
  if (isImage(a)) return 'Image';
  if (e === '.pdf') return 'PDF';
  if (['.xls', '.xlsx', '.csv'].includes(e)) return 'Excel';
  if (['.doc', '.docx'].includes(e)) return 'Word';
  return 'File';
};
const sizeText = (b = 0) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// "Discussion – Core" — chat between the admin and operational leads.
export default function Discussion() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState([]); // { file, preview }
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [viewer, setViewer] = useState(null); // image url shown full size
  const [markup, setMarkup] = useState(null); // { src: File | url, name, index? } — marking pen
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const textRef = useRef(null);
  const lastAt = useRef(null);

  const markSeen = (list) => {
    const last = list.at(-1)?.at;
    if (last) {
      try {
        localStorage.setItem(CHAT_SEEN_KEY, last);
      } catch {
        /* storage blocked */
      }
    }
  };

  // first load, then poll for new messages every 5 s
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const fresh = await api.chat.list(lastAt.current);
        if (!alive || (lastAt.current && !fresh.length)) return;
        setItems((cur) => {
          const merged = lastAt.current ? [...(cur || []), ...fresh.filter((m) => !(cur || []).some((x) => x.id === m.id))] : fresh;
          lastAt.current = merged.at(-1)?.at || lastAt.current;
          markSeen(merged);
          return merged;
        });
      } catch (e) {
        if (alive && !lastAt.current) setItems([]);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items?.length]);

  useEffect(() => () => files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function addFiles(list) {
    const incoming = [...list];
    const bad = incoming.filter((f) => !OK_EXT.includes(extOf(f.name)));
    const big = incoming.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (bad.length) toast(`${bad[0].name}: only images, PDF, Excel / CSV or Word files can be shared.`, 'error');
    else if (big.length) toast(`${big[0].name} is larger than ${MAX_MB} MB.`, 'error');
    const ok = incoming.filter((f) => !bad.includes(f) && !big.includes(f));
    setFiles((cur) => {
      const room = MAX_FILES - cur.length;
      if (ok.length > room) toast(`Up to ${MAX_FILES} files per message.`, 'error');
      return [...cur, ...ok.slice(0, Math.max(0, room)).map((file) => ({ file, preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null }))];
    });
  }

  function dropFile(i) {
    setFiles((cur) => {
      if (cur[i]?.preview) URL.revokeObjectURL(cur[i].preview);
      return cur.filter((_, j) => j !== i);
    });
  }

  function insertEmoji(em) {
    const el = textRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    const next = text.slice(0, start) + em + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.selectionStart = el.selectionEnd = start + em.length;
    });
  }

  async function send(e) {
    e.preventDefault();
    const t = text.trim();
    if (!t && !files.length) return;
    setBusy(true);
    try {
      const m = await api.chat.send(t, files.map((f) => f.file));
      setItems((cur) => [...(cur || []), m]);
      lastAt.current = m.at;
      markSeen([m]);
      setText('');
      files.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      setFiles([]);
      setEmojiOpen(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove(m) {
    if (!window.confirm('Delete this message?')) return;
    try {
      await api.chat.remove(m.id);
      setItems((cur) => cur.filter((x) => x.id !== m.id));
    } catch (err) {
      toast(err.message, 'error');
    }
  }

  let lastDay = '';
  return (
    <div className="page chat-page">
      <PageHeader title="Discussion – Core" subtitle="Team chat for the admin and operational leads — share emojis, images, PDF and Excel files. Field executives cannot see it." />
      <section
        className={`card chat-card ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          if ([...e.dataTransfer.types].includes('Files')) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
        }}
      >
        {dragging && <div className="chat-drop">Drop files to attach</div>}
        <div className="chat-list" ref={listRef}>
          {items === null && <p className="muted chat-empty">Loading…</p>}
          {items?.length === 0 && <p className="muted chat-empty">No messages yet — start the discussion.</p>}
          {items?.map((m) => {
            const mine = m.by.id === user.id;
            const day = fmtDate(m.at);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={m.id}>
                {showDay && <div className="chat-day"><span>{day}</span></div>}
                <div className={`chat-msg ${mine ? 'mine' : ''}`}>
                  {!mine && <Avatar name={m.by.name} size={30} />}
                  <div className="chat-bubble">
                    {!mine && (
                      <span className="chat-who">
                        {m.by.name} <em>{m.by.role === 'ADMIN' ? 'Admin' : 'OL'}</em>
                      </span>
                    )}
                    {m.attachments?.length > 0 && (
                      <div className="chat-files">
                        {m.attachments.map((a) =>
                          isImage(a) ? (
                            <button type="button" key={a.url} className="chat-img" onClick={() => setViewer(api.fileUrl(a.url))} title={a.name}>
                              <img src={api.fileUrl(a.url)} alt={a.name} loading="lazy" />
                            </button>
                          ) : (
                            <a key={a.url} className={`chat-file k-${kindOf(a).toLowerCase()}`} href={api.fileUrl(a.url)} target="_blank" rel="noreferrer" download={a.name}>
                              <span className="chat-file-ic">
                                <Icon name={kindOf(a) === 'Excel' ? 'sheet' : 'file'} size={18} />
                              </span>
                              <span className="chat-file-meta">
                                <strong>{a.name}</strong>
                                <em>
                                  {kindOf(a)} · {sizeText(a.size)}
                                </em>
                              </span>
                              <Icon name="download" size={16} />
                            </a>
                          ),
                        )}
                      </div>
                    )}
                    {m.text && <p>{m.text}</p>}
                    <span className="chat-time">
                      {fmtTime(m.at)}
                      {(mine || user.role === 'ADMIN') && (
                        <button type="button" className="chat-del" onClick={() => remove(m)} title="Delete">
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {files.length > 0 && (
          <div className="chat-pending">
            {files.map((f, i) => (
              <div className="chat-chip" key={`${f.file.name}-${i}`}>
                {f.preview ? <img src={f.preview} alt="" /> : <Icon name={kindOf({ name: f.file.name }) === 'Excel' ? 'sheet' : 'file'} size={18} />}
                <span>
                  <strong>{f.file.name}</strong>
                  <em>{sizeText(f.file.size)}</em>
                </span>
                {f.preview && (
                  <button type="button" onClick={() => setMarkup({ src: f.file, name: f.file.name, index: i })} title="Mark on this image">
                    <Icon name="edit" size={14} />
                  </button>
                )}
                <button type="button" onClick={() => dropFile(i)} title="Remove">
                  <Icon name="x" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
        {emojiOpen && (
          <div className="chat-emoji" role="dialog" aria-label="Emoji">
            {EMOJIS.map((em) => (
              <button type="button" key={em} onClick={() => insertEmoji(em)}>
                {em}
              </button>
            ))}
          </div>
        )}
        <form className="chat-input" onSubmit={send}>
          <button type="button" className={`chat-tool ${emojiOpen ? 'on' : ''}`} onClick={() => setEmojiOpen((v) => !v)} title="Emoji">
            <Icon name="smile" />
          </button>
          <button type="button" className="chat-tool" onClick={() => inputRef.current?.click()} title="Attach image, PDF, Excel or Word (max 5)">
            <Icon name="paperclip" />
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            hidden
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <textarea
            ref={textRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) send(e);
            }}
            onPaste={(e) => {
              const pasted = [...(e.clipboardData?.files || [])];
              if (pasted.length) {
                e.preventDefault();
                addFiles(pasted.map((f, i) => (f.name && f.name !== 'image.png' ? f : new File([f], `pasted-${Date.now()}-${i}.png`, { type: f.type }))));
              }
            }}
            placeholder="Type a message…"
            title="Enter to send · Shift + Enter for a new line · paste or drop files to attach"
            maxLength={2000}
          />
          <button className="btn btn-primary" disabled={busy || (!text.trim() && !files.length)}>
            <Icon name="send" /> {busy && files.length ? 'Uploading…' : 'Send'}
          </button>
        </form>
      </section>
      {markup && (
        <ImageMarkup
          src={markup.src}
          name={markup.name}
          onClose={() => setMarkup(null)}
          onDone={(file) => {
            if (markup.index != null) {
              // replace the picked image with the marked copy
              setFiles((cur) =>
                cur.map((f, j) => {
                  if (j !== markup.index) return f;
                  if (f.preview) URL.revokeObjectURL(f.preview);
                  return { file, preview: URL.createObjectURL(file) };
                }),
              );
            } else {
              addFiles([file]);
            }
            setMarkup(null);
            requestAnimationFrame(() => textRef.current?.focus());
          }}
        />
      )}
      {viewer && (
        <div className="chat-viewer" onClick={() => setViewer(null)} role="dialog" aria-label="Image">
          <img src={viewer} alt="" />
          <div className="chat-viewer-bar" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setMarkup({ src: viewer, name: decodeURIComponent(viewer.split('/').pop() || 'image.jpg') });
                setViewer(null);
              }}
            >
              <Icon name="edit" /> Mark &amp; reply
            </button>
            <a className="btn btn-ghost" href={viewer} target="_blank" rel="noreferrer" download>
              <Icon name="download" /> Download
            </a>
            <button type="button" className="btn btn-ghost" onClick={() => setViewer(null)}>
              <Icon name="x" /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

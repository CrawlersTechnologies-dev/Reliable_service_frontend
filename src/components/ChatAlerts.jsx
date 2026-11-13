import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

// Discussion – Core alerts:
//  • a pop-up (and a desktop notification when the tab is in the background) for each new message
//  • every 30 minutes, a highlighted reminder while there are unread messages (operations leads)
const REMIND_EVERY = 30 * 60 * 1000;
const REMIND_KEY = 'reliable_chat_remind_at';
const NOTIFIED_KEY = 'reliable_chat_notified';

const read = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* storage blocked */
  }
};
const canNotify = () => typeof window !== 'undefined' && 'Notification' in window;

export default function ChatAlerts({ messages, remind, onOpen }) {
  const [toast, setToast] = useState(null); // latest new message
  const [reminder, setReminder] = useState(false);
  const [perm, setPerm] = useState(canNotify() ? Notification.permission : 'denied');
  const first = useRef(true);

  // new messages → pop-up + desktop notification
  useEffect(() => {
    if (!messages.length) return;
    const last = messages[messages.length - 1];
    const notified = read(NOTIFIED_KEY);
    if (first.current) {
      // on page load only remember where we are; the 30-minute reminder covers older unread
      first.current = false;
      if (!notified) write(NOTIFIED_KEY, last.at);
      if (!notified || last.at <= notified) return;
    }
    if (notified && last.at <= notified) return;
    write(NOTIFIED_KEY, last.at);
    setToast({ ...last, count: messages.filter((m) => !notified || m.at > notified).length });
    if (canNotify() && Notification.permission === 'granted' && document.hidden) {
      try {
        const n = new Notification(`Discussion – Core · ${last.by.name}`, {
          body: last.text || (last.attachments?.length ? `📎 ${last.attachments.length} file(s)` : 'New message'),
          tag: 'reliable-chat',
        });
        n.onclick = () => {
          window.focus();
          onOpen();
          n.close();
        };
      } catch {
        /* notifications unavailable */
      }
    }
  }, [messages, onOpen]);

  // auto-hide the pop-up
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 12000);
    return () => clearTimeout(t);
  }, [toast]);

  // 30-minute reminder while there are unread messages
  useEffect(() => {
    if (!remind) return undefined;
    const tick = () => {
      if (!messages.length) return;
      const lastAt = Number(read(REMIND_KEY) || 0);
      if (Date.now() - lastAt >= REMIND_EVERY) {
        write(REMIND_KEY, String(Date.now()));
        setReminder(true);
      }
    };
    tick();
    const t = setInterval(tick, 60 * 1000);
    return () => clearInterval(t);
  }, [remind, messages.length]);

  const askPermission = async () => {
    if (!canNotify()) return;
    try {
      setPerm(await Notification.requestPermission());
    } catch {
      /* ignored */
    }
  };

  const open = () => {
    setToast(null);
    setReminder(false);
    onOpen();
  };

  return (
    <>
      {toast && !reminder && (
        <div className="chat-toast" role="status">
          <div className="chat-toast-icon">
            <Icon name="chat" size={18} />
          </div>
          <div className="chat-toast-body">
            <strong>
              {toast.by.name} <em>{toast.by.role === 'ADMIN' ? 'Admin' : 'OL'}</em>
            </strong>
            <p>{toast.text || (toast.attachments?.length ? `📎 Shared ${toast.attachments.length} file(s)` : 'New message')}</p>
            <div className="chat-toast-actions">
              <button type="button" className="btn btn-primary btn-xs" onClick={open}>
                Open chat
              </button>
              <button type="button" className="btn btn-ghost btn-xs" onClick={() => setToast(null)}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
      {reminder && (
        <div className="chat-remind-wrap" role="dialog" aria-label="Discussion reminder">
          <div className="chat-remind">
            <div className="chat-remind-bell">
              <Icon name="chat" size={26} />
              <span>{messages.length}</span>
            </div>
            <h3>Check Discussion – Core</h3>
            <p>
              You have <strong>{messages.length} unread message{messages.length === 1 ? '' : 's'}</strong> from the team. Please check the core chat for new
              updates.
            </p>
            {perm === 'default' && (
              <button type="button" className="link-btn" onClick={askPermission}>
                <Icon name="alert" size={14} /> Turn on desktop notifications
              </button>
            )}
            <div className="chat-remind-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setReminder(false)}>
                Remind me in 30 min
              </button>
              <button type="button" className="btn btn-primary" onClick={open}>
                <Icon name="chat" /> Open chat
              </button>
            </div>
          </div>
        </div>
      )}
      {perm === 'default' && !reminder && !toast && <NotifyNudge onAsk={askPermission} />}
    </>
  );
}

// one-time nudge to allow desktop notifications (hidden once answered or dismissed)
function NotifyNudge({ onAsk }) {
  const [hidden, setHidden] = useState(() => read('reliable_notify_nudge') === 'no');
  if (hidden) return null;
  return (
    <div className="notify-nudge">
      <Icon name="chat" size={16} />
      <span>Get a desktop alert when a new Discussion message arrives?</span>
      <button type="button" className="btn btn-primary btn-xs" onClick={onAsk}>
        Allow
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-xs"
        onClick={() => {
          write('reliable_notify_nudge', 'no');
          setHidden(true);
        }}
      >
        Not now
      </button>
    </div>
  );
}

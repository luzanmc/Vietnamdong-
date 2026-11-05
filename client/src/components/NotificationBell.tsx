import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import type { AppNotification } from '../types.js';

const POLL_MS = 30_000;

export default function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  async function load() {
    try {
      const data = await api.notifications();
      setItems(data.items);
      setUnreadCount(data.unreadCount);
    } catch {
      // Ignore network errors on background poll
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleOpen() {
    const next = !open;
    setOpen(next);
    if (next && unreadCount > 0) {
      await api.markNotificationsRead();
      setUnreadCount(0);
    }
  }

  function handleClickItem(n: AppNotification) {
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={handleOpen}
        aria-label="Thông báo"
        className="ic"
        id="bell"
        style={{ cursor: 'pointer', border: 'none' }}
      >
        <svg className="i"><use href="#bell" /></svg>
        {unreadCount > 0 && <i className="dot" id="dot" />}
      </button>

      {open && (
        <div
          className="menu open"
          style={{
            position: 'absolute',
            right: 0,
            top: '46px',
            width: '300px',
            maxWidth: 'calc(100vw - 32px)',
            maxHeight: '380px',
            overflowY: 'auto',
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r)',
            boxShadow: '0 16px 40px rgba(15,27,51,.18)',
            padding: '8px',
            zIndex: 60,
            display: 'block',
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--line)', fontSize: '13px', fontWeight: 700, color: 'var(--ink)' }}>
            Thông báo
          </div>
          {items.length === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', fontSize: '12px', color: 'var(--mute)' }}>
              Chưa có thông báo mới nào.
            </div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleClickItem(n)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'none',
                  border: 'none',
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                {(n as any).title && (
                  <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--ink)', marginBottom: '2px' }}>
                    {(n as any).title}
                  </p>
                )}
                <p style={{ fontSize: '12px', color: 'var(--ink)', lineHeight: 1.4, margin: 0 }}>
                  {n.message}
                </p>
                <small style={{ fontSize: '10px', color: 'var(--mute)', marginTop: '4px', display: 'block' }}>
                  {new Date(n.created_at).toLocaleString('vi-VN')}
                </small>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

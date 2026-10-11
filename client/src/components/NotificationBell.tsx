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
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={containerRef} className="relative">
      <button
        onClick={handleOpen}
        aria-label="Thông báo"
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press shrink-0"
      >
        <i className="bi bi-bell text-base" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose animate-pulse" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-96 overflow-y-auto bg-surface border border-line rounded-2xl shadow-2xl z-50 animate-slide-in">
          <div className="px-3 py-2 border-b border-line text-xs font-semibold text-muted">Thông báo</div>
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted">Chưa có thông báo nào.</div>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => handleClickItem(n)}
                className="w-full text-left px-3 py-2.5 border-b border-line last:border-0 hover:bg-surface2 transition"
              >
                <p className="text-xs text-ink leading-relaxed">{n.message}</p>
                <p className="text-[10px] text-muted mt-1">{new Date(n.created_at).toLocaleString('vi-VN')}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

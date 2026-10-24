import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface AdminTicket {
  id: string;
  username: string;
  subject: string;
  status: 'open' | 'closed';
  updated_at: string;
}

interface AdminTicketMessage {
  id: string;
  sender_role: 'user' | 'admin';
  message: string;
  created_at: string;
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<AdminTicket[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: AdminTicket; messages: AdminTicketMessage[] } | null>(null);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadList() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/support/tickets', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setTickets(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList();
  }, []);

  async function loadDetail(id: string) {
    try {
      const res = await fetch(`/api/admin/support/tickets/${id}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setDetail(data);
    } catch {
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    try {
      const res = await fetch(`/api/admin/support/tickets/${activeId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim() }),
      });
      if (res.ok) {
        setReply('');
        loadDetail(activeId);
      }
    } catch {
    }
  }

  async function toggleStatus() {
    if (!activeId || !detail) return;
    const action = detail.ticket.status === 'open' ? 'close' : 'reopen';
    try {
      const res = await fetch(`/api/admin/support/tickets/${activeId}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        loadDetail(activeId);
        loadList();
      }
    } catch {
    }
  }

  if (activeId && detail) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <button
          onClick={() => {
            setActiveId(null);
            setDetail(null);
          }}
          className="text-xs text-muted hover:text-ink flex items-center gap-1.5"
        >
          <i className="bi bi-arrow-left" /> Quay lại danh sách
        </button>

        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-sm text-ink">{detail.ticket.subject}</h2>
              <p className="text-[11px] text-muted">
                Thành viên: <span className="font-semibold text-ink">{detail.ticket.username}</span>
              </p>
            </div>
            <button
              onClick={toggleStatus}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                detail.ticket.status === 'open'
                  ? 'bg-rose/15 border-rose/30 text-rose'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
              }`}
            >
              {detail.ticket.status === 'open' ? 'Đóng ticket' : 'Mở lại ticket'}
            </button>
          </div>

          <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
            {detail.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-2xl p-3.5 text-xs max-w-[85%] space-y-1 ${
                  m.sender_role === 'admin'
                    ? 'bg-indigo/15 border border-indigo/30 ml-auto text-ink'
                    : 'bg-surface2 border border-line text-ink'
                }`}
              >
                <div className="text-[10px] font-semibold text-muted">
                  {m.sender_role === 'admin' ? 'Quản trị viên' : detail.ticket.username}
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                <span className="text-[9px] text-muted block text-right">
                  {new Date(m.created_at).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </div>

          {detail.ticket.status === 'open' && (
            <form onSubmit={sendReply} className="flex gap-2 pt-2 border-t border-line">
              <input
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Nhập nội dung phản hồi cho thành viên..."
                className="flex-1 bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5"
              >
                <i className="bi bi-send" /> Gửi
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-headset text-indigo" /> Yêu cầu hỗ trợ (Support Tickets)
        </h2>
      </div>

      <div className="space-y-2.5">
        {loading || !tickets ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Chưa có ticket nào được tạo.
          </div>
        ) : (
          tickets.map((tkt) => (
            <div
              key={tkt.id}
              onClick={() => {
                setActiveId(tkt.id);
                loadDetail(tkt.id);
              }}
              className="bg-surface hover:bg-surface2/60 border border-line rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer transition"
            >
              <div className="min-w-0">
                <h3 className="text-xs font-semibold text-ink truncate">{tkt.subject}</h3>
                <span className="text-[10px] text-muted">
                  {tkt.username} - {new Date(tkt.updated_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border shrink-0 ${
                  tkt.status === 'open'
                    ? 'bg-cyan/15 text-cyan border-cyan/30'
                    : 'bg-surface2 text-muted border-line'
                }`}
              >
                {tkt.status === 'open' ? 'Đang mở' : 'Đã đóng'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

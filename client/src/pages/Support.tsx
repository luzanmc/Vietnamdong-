import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { SupportTicket, SupportMessage } from '../types.js';

export default function Support() {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: SupportTicket; messages: SupportMessage[] } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [error, setError] = useState<string | null>(null);

  function loadList() {
    api.supportTickets().then(setTickets);
  }
  useEffect(loadList, []);

  useEffect(() => {
    if (activeId) api.supportTicketDetail(activeId).then(setDetail);
  }, [activeId]);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const r = await api.createSupportTicket(subject, message);
      setShowNew(false);
      setSubject('');
      setMessage('');
      loadList();
      setActiveId(r.id);
    } catch (err) {
      setError((err as ApiError).message);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    await api.replySupportTicket(activeId, reply);
    setReply('');
    api.supportTicketDetail(activeId).then(setDetail);
  }

  if (activeId && detail) {
    return (
      <div className="max-w-lg">
        <button onClick={() => { setActiveId(null); setDetail(null); }} className="text-xs text-muted mb-3 flex items-center gap-1">
          <i className="bi bi-arrow-left" /> {t('support.back')}
        </button>
        <h1 className="font-display text-lg font-semibold mb-1">{detail.ticket.subject}</h1>
        <p className="text-xs text-muted mb-4">{detail.ticket.status === 'open' ? t('support.status_open') : t('support.status_closed')}</p>

        <div className="space-y-2 mb-4">
          {detail.messages.map((m) => (
            <div key={m.id} className={`rounded-lg p-3 text-sm max-w-[85%] ${m.sender_role === 'admin' ? 'bg-indigo/10 border border-indigo/30 ml-auto' : 'bg-surface border border-line'}`}>
              <p>{m.message}</p>
              <p className="text-[10px] text-muted mt-1">{new Date(m.created_at).toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>

        {detail.ticket.status === 'open' && (
          <form onSubmit={sendReply} className="flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t('support.reply_placeholder')} className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm" />
            <button className="bg-indigo text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0">{t('support.send')}</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-semibold">{t('support.title')}</h1>
        <button onClick={() => setShowNew(true)} className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">
          {t('support.new_ticket')}
        </button>
      </div>

      {showNew && (
        <form onSubmit={submitNew} className="bg-surface border border-line rounded-xl p-4 space-y-3 mb-4">
          {error && <p className="text-xs text-rose">{error}</p>}
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={t('support.subject_placeholder')} required className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm" />
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('support.message_placeholder')} required rows={3} className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowNew(false)} className="flex-1 border border-line text-sm py-2 rounded-lg">{t('redeem.cancel')}</button>
            <button className="flex-1 bg-indigo text-white text-sm py-2 rounded-lg">{t('support.send')}</button>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {!tickets ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        ) : tickets.length === 0 ? (
          <p className="text-sm text-muted">{t('support.no_tickets')}</p>
        ) : (
          tickets.map((tkt) => (
            <button key={tkt.id} onClick={() => setActiveId(tkt.id)} className="w-full text-left bg-surface border border-line rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{tkt.subject}</div>
                <div className="text-[10px] text-muted font-mono">{new Date(tkt.updated_at).toLocaleString('vi-VN')}</div>
              </div>
              <span className={`text-xs ${tkt.status === 'open' ? 'text-cyan' : 'text-muted'}`}>
                {tkt.status === 'open' ? t('support.status_open') : t('support.status_closed')}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

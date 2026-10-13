import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { playClickSound, playClaimSound } from '../utils/sound.js';
import type { SupportTicket, SupportMessage } from '../types.js';

export default function Support() {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: SupportTicket; messages: SupportMessage[] } | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadList() {
    api.supportTickets().then(setTickets).catch(() => {});
  }
  useEffect(loadList, []);

  useEffect(() => {
    if (activeId) {
      api.supportTicketDetail(activeId).then(setDetail).catch(() => {});
    }
  }, [activeId]);

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    playClickSound();
    setSubmitting(true);
    try {
      const r = await api.createSupportTicket(subject, message);
      playClaimSound();
      toastSuccess('Ticket hỗ trợ đã được gửi tới đội ngũ Admin!', 'Tạo Ticket');
      setShowNew(false);
      setSubject('');
      setMessage('');
      loadList();
      setActiveId(r.id);
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(msg);
      toastError(msg, 'Lỗi gửi yêu cầu');
    } finally {
      setSubmitting(false);
    }
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim() || submitting) return;
    playClickSound();
    setSubmitting(true);
    try {
      await api.replySupportTicket(activeId, reply);
      setReply('');
      api.supportTicketDetail(activeId).then(setDetail);
    } catch (err) {
      toastError((err as ApiError).message, 'Lỗi gửi tin');
    } finally {
      setSubmitting(false);
    }
  }

  if (activeId && detail) {
    const isOpen = detail.ticket.status === 'open';

    return (
      <div className="max-w-2xl mx-auto py-4 space-y-5">
        <button
          onClick={() => {
            playClickSound();
            setActiveId(null);
            setDetail(null);
          }}
          className="text-xs font-semibold text-muted hover:text-ink flex items-center gap-1.5 transition btn-press px-2 py-1 rounded-lg hover:bg-surface2 w-fit"
        >
          <i className="bi bi-arrow-left" /> {t('support.back')}
        </button>

        {/* Ticket Header Card */}
        <div className="glass-panel rounded-3xl p-6 border border-line flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold text-ink">
              {detail.ticket.subject}
            </h1>
            <div className="text-xs text-muted font-mono mt-1">
              Mã ticket: #{detail.ticket.id.slice(0, 8)} · Ngày tạo: {new Date(detail.ticket.created_at).toLocaleDateString('vi-VN')}
            </div>
          </div>

          <span
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isOpen
                ? 'bg-cyan/15 text-cyan border-cyan/30'
                : 'bg-surface2 text-muted border-line'
            }`}
          >
            {isOpen ? t('support.status_open') : t('support.status_closed')}
          </span>
        </div>

        {/* Chat / Messages Thread */}
        <div className="space-y-3 py-2">
          {detail.messages.map((m) => {
            const isAdmin = m.sender_role === 'admin';

            return (
              <div
                key={m.id}
                className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
              >
                <div className="text-[10px] text-muted font-medium mb-1 px-1 flex items-center">
                  {isAdmin ? (
                    <>
                      <i className="bi bi-shield-check text-cyan mr-1" />
                      <span>Quản trị viên hỗ trợ</span>
                    </>
                  ) : (
                    'Bạn'
                  )}
                </div>
                <div
                  className={`rounded-2xl p-4 text-sm max-w-[85%] leading-relaxed ${
                    isAdmin
                      ? 'bg-indigo/15 border border-indigo/30 text-ink shadow-sm'
                      : 'bg-surface2 border border-line text-ink'
                  }`}
                >
                  <p className="whitespace-pre-line">{m.message}</p>
                  <div className="text-[10px] text-muted/70 font-mono mt-1.5 text-right">
                    {new Date(m.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply form */}
        {isOpen ? (
          <form onSubmit={sendReply} className="flex gap-2.5 pt-2">
            <input
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={t('support.reply_placeholder')}
              className="flex-1 bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo"
            />
            <button
              disabled={submitting || !reply.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo to-indigo/90 hover:brightness-110 disabled:opacity-50 text-white font-bold text-sm transition btn-press shadow-md flex items-center gap-1.5"
            >
              <span>{t('support.send')}</span>
              <i className="bi bi-send-fill text-xs" />
            </button>
          </form>
        ) : (
          <div className="p-3.5 rounded-2xl bg-surface2/60 border border-line text-center text-xs text-muted">
            Ticket này đã được giải quyết và đóng. Nếu cần hỗ trợ thêm, bạn có thể tạo ticket mới.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
            <i className="bi bi-headset" />
            <span>Chăm sóc khách hàng</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
            {t('support.title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Gửi yêu cầu trợ giúp và theo dõi phản hồi trực tiếp từ đội ngũ hỗ trợ.
          </p>
        </div>

        {!showNew && (
          <button
            onClick={() => {
              playClickSound();
              setShowNew(true);
            }}
            className="px-4 py-2.5 rounded-xl font-display font-bold text-xs sm:text-sm bg-gradient-to-r from-indigo to-cyan hover:brightness-110 text-white shadow-md transition btn-press flex items-center gap-1.5 shrink-0"
          >
            <i className="bi bi-plus-lg" />
            <span>{t('support.new_ticket')}</span>
          </button>
        )}
      </div>

      {showNew && (
        <form
          onSubmit={submitNew}
          className="glass-panel rounded-3xl p-6 border border-indigo/40 shadow-xl space-y-4 animate-slide-in"
        >
          <div className="font-bold text-base text-ink flex items-center gap-2">
            <i className="bi bi-pencil-square text-indigo" /> Tạo ticket hỗ trợ mới
          </div>

          {error && <div className="text-xs text-rose">{error}</div>}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Tiêu đề vấn đề</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t('support.subject_placeholder')}
              required
              className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted">Mô tả chi tiết</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('support.message_placeholder')}
              required
              rows={4}
              className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
            />
          </div>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setShowNew(false)}
              className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink transition btn-press"
            >
              {t('redeem.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo to-cyan hover:brightness-110 text-white text-xs font-bold transition btn-press shadow-md flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" />
                  <span>Đang gửi...</span>
                </>
              ) : (
                <span>{t('support.send')}</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tickets List */}
      <div className="space-y-3">
        {!tickets ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))
        ) : tickets.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted">
            <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
            <div className="text-sm">{t('support.no_tickets')}</div>
          </div>
        ) : (
          tickets.map((tkt) => {
            const isOpen = tkt.status === 'open';

            return (
              <button
                key={tkt.id}
                onClick={() => {
                  playClickSound();
                  setActiveId(tkt.id);
                }}
                className="w-full text-left glass-card rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 transition hover:border-indigo/40 group btn-press"
              >
                <div className="min-w-0">
                  <div className="text-sm sm:text-base font-semibold text-ink group-hover:text-indigo transition truncate">
                    {tkt.subject}
                  </div>
                  <div className="text-[11px] text-muted font-mono mt-1">
                    Cập nhật: {new Date(tkt.updated_at).toLocaleString('vi-VN')}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                      isOpen
                        ? 'bg-cyan/15 text-cyan border-cyan/30'
                        : 'bg-surface2 text-muted border-line'
                    }`}
                  >
                    {isOpen ? t('support.status_open') : t('support.status_closed')}
                  </span>
                  <i className="bi bi-chevron-right text-xs text-muted group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

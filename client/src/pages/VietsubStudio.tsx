import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import Alert from '../components/Alert.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playClaimSound } from '../utils/sound.js';
import type { VietsubInfo, VietsubOrder } from '../types.js';

type Msg = { type: 'success' | 'error'; text: string };

export default function VietsubStudio() {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [info, setInfo] = useState<VietsubInfo | null>(null);
  const [orders, setOrders] = useState<VietsubOrder[]>([]);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);

  async function load() {
    try {
      const [i, o] = await Promise.all([api.vietsubInfo(), api.vietsubOrders()]);
      setInfo(i);
      setOrders(o);
    } catch {}
  }

  useEffect(() => {
    load();
  }, []);

  async function buyNova() {
    playClickSound();
    setBusy(true);
    setMsg(null);
    try {
      await api.vietsubBuyNova();
      playClaimSound();
      triggerConfetti();
      const text = t('vietsub.nova_pending_msg');
      setMsg({ type: 'success', text });
      toastSuccess(text, 'Đặt mua thành công');
      await refresh();
      load();
    } catch (err) {
      const errorMsg = (err as ApiError).message;
      setMsg({ type: 'error', text: errorMsg });
      toastError(errorMsg, 'Lỗi đặt mua');
    } finally {
      setBusy(false);
    }
  }

  async function submitVnd(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    setBusy(true);
    setMsg(null);
    try {
      await api.vietsubBuyVnd(transferNote);
      playClaimSound();
      const text = t('vietsub.vnd_pending_msg');
      setMsg({ type: 'success', text });
      toastSuccess(text, 'Đã gửi yêu cầu');
      setShowTransferForm(false);
      setTransferNote('');
      load();
    } catch (err) {
      const errorMsg = (err as ApiError).message;
      setMsg({ type: 'error', text: errorMsg });
      toastError(errorMsg, 'Lỗi chuyển khoản');
    } finally {
      setBusy(false);
    }
  }

  if (!info) {
    return (
      <div className="max-w-xl mx-auto py-6 space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!info.active) {
    return (
      <div className="max-w-xl mx-auto py-8">
        <h1 className="font-display text-2xl font-bold mb-4">Vietsub Studio</h1>
        <Alert type="error">{t('vietsub.not_active')}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      {/* Product Card */}
      <div className="glass-panel rounded-3xl p-4 sm:p-7 border border-line shadow-xl space-y-5">
        <div className="flex items-center gap-4">
          {info.logoUrl ? (
            <img
              src={info.logoUrl}
              alt="Vietsub Studio"
              className="w-16 h-16 rounded-2xl object-cover border border-line shadow-md"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-indigo/20 border border-indigo/30 text-indigo flex items-center justify-center text-2xl shadow-sm">
              <i className="bi bi-badge-cc-fill" />
            </div>
          )}
          <div>
            <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">Vietsub Studio</h1>
            <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-cyan inline-block" />
              <span>{t('vietsub.available_count', { n: info.availableCount })}</span>
            </div>
          </div>
        </div>

        {info.description && (
          <p className="text-xs sm:text-sm text-muted leading-relaxed whitespace-pre-line bg-surface2/50 p-4 rounded-2xl border border-line/60">
            {info.description}
          </p>
        )}

        {info.apkUrl && (
          <a
            href={info.apkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClickSound}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition btn-press"
          >
            <i className="bi bi-download" />
            <span>Tải bộ cài đặt APK / Tool</span>
          </a>
        )}

        {msg && <Alert type={msg.type}>{msg.text}</Alert>}

        {/* Purchase Buttons */}
        <div className="space-y-2.5 pt-2 border-t border-line/60">
          {info.priceNova !== null && (
            <button
              onClick={buyNova}
              disabled={busy || info.availableCount === 0}
              className="w-full py-3.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-indigo to-indigo/90 hover:brightness-110 disabled:opacity-50 text-white shadow-md transition btn-press flex items-center justify-center gap-2"
            >
              <CurrencyIcon size={18} />
              <span>{t('vietsub.buy_nova', { price: info.priceNova })}</span>
            </button>
          )}

          {info.priceVnd !== null && !showTransferForm && (
            <button
              onClick={() => {
                playClickSound();
                setShowTransferForm(true);
              }}
              disabled={busy || info.availableCount === 0}
              className="w-full py-3 rounded-xl font-display font-semibold text-sm bg-surface2 hover:bg-line border border-line text-ink disabled:opacity-50 transition btn-press"
            >
              <i className="bi bi-bank mr-1.5" />
              {t('vietsub.buy_vnd', { price: info.priceVnd.toLocaleString('vi-VN') })}
            </button>
          )}

          {showTransferForm && (
            <form onSubmit={submitVnd} className="space-y-3 pt-3 border-t border-line/40">
              {info.bankInfo && (
                <div className="bg-surface2 border border-line rounded-xl p-3.5 text-xs whitespace-pre-line font-mono text-muted">
                  {info.bankInfo}
                </div>
              )}
              <input
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder={t('vietsub.transfer_note_placeholder')}
                required
                className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs text-ink focus:outline-none focus:border-indigo"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTransferForm(false)}
                  className="px-4 py-2.5 rounded-xl border border-line text-xs font-semibold text-muted hover:text-ink transition btn-press"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 py-2.5 rounded-xl bg-indigo text-white text-xs font-bold transition btn-press"
                >
                  {t('vietsub.submit_transfer')}
                </button>
              </div>
            </form>
          )}

          {info.availableCount === 0 && (
            <p className="text-xs text-rose font-medium text-center">{t('vietsub.out_of_stock')}</p>
          )}
        </div>
      </div>

      {/* Orders List */}
      {orders.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display font-bold text-base text-ink flex items-center gap-2">
            <i className="bi bi-receipt" /> {t('vietsub.my_orders')}
          </h2>
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="glass-card rounded-2xl p-4 border border-line space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-amber">
                    {o.payment_method === 'nova' ? `${o.price_nova} VNC` : `${o.price_vnd?.toLocaleString('vi-VN')}đ`}
                  </span>
                  <span className="text-muted capitalize text-[11px] bg-surface2 px-2 py-0.5 rounded-full border border-line">
                    {o.status}
                  </span>
                </div>
                {o.license_key && (
                  <div className="mt-2 p-2.5 rounded-xl bg-cyan/10 border border-cyan/30 font-mono text-xs text-cyan break-all flex items-center justify-between gap-2">
                    <span>Key: {o.license_key}</span>
                    <button
                      onClick={() => {
                        playClickSound();
                        navigator.clipboard.writeText(o.license_key || '');
                        toastSuccess('Đã chép license key!', 'Sao chép');
                      }}
                      className="shrink-0 text-muted hover:text-cyan p-1"
                      title="Sao chép"
                    >
                      <i className="bi bi-clipboard" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

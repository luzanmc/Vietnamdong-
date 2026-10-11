import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import Alert from '../components/Alert.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { VietsubInfo, VietsubOrder } from '../types.js';

type Msg = { type: 'success' | 'error'; text: string };

export default function VietsubStudio() {
  const { t } = useLanguage();
  const [info, setInfo] = useState<VietsubInfo | null>(null);
  const [orders, setOrders] = useState<VietsubOrder[]>([]);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const [transferNote, setTransferNote] = useState('');
  const [showTransferForm, setShowTransferForm] = useState(false);

  async function load() {
    const [i, o] = await Promise.all([api.vietsubInfo(), api.vietsubOrders()]);
    setInfo(i);
    setOrders(o);
  }

  useEffect(() => {
    load();
  }, []);

  async function buyNova() {
    setBusy(true);
    setMsg(null);
    try {
      await api.vietsubBuyNova();
      setMsg({ type: 'success', text: t('vietsub.nova_pending_msg') });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  }

  async function submitVnd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.vietsubBuyVnd(transferNote);
      setMsg({ type: 'success', text: t('vietsub.vnd_pending_msg') });
      setShowTransferForm(false);
      setTransferNote('');
      load();
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  }

  if (!info) {
    return (
      <div className="max-w-lg space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-16 h-16 rounded-2xl" />
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  if (!info.active) {
    return (
      <div className="max-w-lg">
        <h1 className="font-display text-xl font-semibold mb-4">Vietsub Studio</h1>
        <Alert type="error">{t('vietsub.not_active')}</Alert>
      </div>
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-3">
        {info.logoUrl && <img src={info.logoUrl} alt="Vietsub Studio" className="w-16 h-16 rounded-2xl object-cover border border-line" />}
        <div>
          <h1 className="font-display text-xl font-semibold">Vietsub Studio</h1>
          <p className="text-xs text-muted">{t('vietsub.available_count', { n: info.availableCount })}</p>
        </div>
      </div>

      {info.description && <p className="text-sm text-muted whitespace-pre-line">{info.description}</p>}

      {msg && <Alert type={msg.type}>{msg.text}</Alert>}

      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4 space-y-3">
        {info.priceNova !== null && (
          <button
            onClick={buyNova}
            disabled={busy || info.availableCount === 0}
            className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            {t('vietsub.buy_nova', { price: info.priceNova })}
          </button>
        )}

        {info.priceVnd !== null && !showTransferForm && (
          <button
            onClick={() => setShowTransferForm(true)}
            disabled={busy || info.availableCount === 0}
            className="w-full bg-surface2 border border-line hover:bg-line disabled:opacity-60 text-sm font-medium py-2.5 rounded-lg transition"
          >
            {t('vietsub.buy_vnd', { price: info.priceVnd.toLocaleString('vi-VN') })}
          </button>
        )}

        {showTransferForm && (
          <form onSubmit={submitVnd} className="space-y-3">
            {info.bankInfo && (
              <div className="bg-surface2 border border-line rounded-lg p-3 text-xs whitespace-pre-line">{info.bankInfo}</div>
            )}
            <input
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder={t('vietsub.transfer_note_placeholder')}
              required
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              {t('vietsub.submit_transfer')}
            </button>
          </form>
        )}

        {info.availableCount === 0 && <p className="text-xs text-rose">{t('vietsub.out_of_stock')}</p>}
      </div>

      {orders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2">{t('vietsub.my_orders')}</h2>
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="bg-surface border border-line rounded-lg p-3 text-xs">
                <div className="flex justify-between">
                  <span>{o.payment_method === 'nova' ? `${o.price_nova} VDX` : `${o.price_vnd?.toLocaleString('vi-VN')}đ`}</span>
                  <span className="text-muted">{o.status}</span>
                </div>
                {o.license_key && <div className="mt-1 font-mono text-cyan">{o.license_key}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

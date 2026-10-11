import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { RedeemItemSkeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useSettings, formatVnd } from '../context/SettingsContext.js';
import type { RedeemCatalog, RedeemItem } from '../types.js';

type Msg = { type: 'ok' | 'error'; text: string };

export default function Redeem() {
  const { t } = useLanguage();
  const { novaToVndRate } = useSettings();
  const CATEGORY_LABEL: Record<string, string> = {
    game_topup: t('redeem.category_game_topup'),
    wallet: t('redeem.category_wallet'),
    card: t('redeem.category_card'),
  };
  const [catalog, setCatalog] = useState<RedeemCatalog | null>(null);
  const [active, setActive] = useState<RedeemItem | null>(null);
  const [destination, setDestination] = useState('');
  const [msg, setMsg] = useState<Msg | null>(null);

  useEffect(() => {
    api.redeemCatalog().then(setCatalog);
  }, []);

  function openOrder(item: RedeemItem) {
    setActive(item);
    setDestination('');
    setMsg(null);
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!active) return;
    try {
      await api.redeemOrder({ item_id: active.id, destination });
      setMsg({ type: 'ok', text: t('redeem.submit_success') });
      setActive(null);
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">{t('redeem.title')}</h1>
      <p className="text-sm text-muted mb-5">{t('redeem.subtitle')}</p>

      {!catalog ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <RedeemItemSkeleton key={i} />)}
        </div>
      ) : (
        Object.entries(catalog).map(([category, items]) => (
          <div key={category} className="mb-6">
            <h2 className="font-medium text-sm text-muted uppercase tracking-wide mb-2">{CATEGORY_LABEL[category] || category}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{item.label}</div>
                    <div className="font-mono text-amber text-sm mt-1">{item.price_nova} VDX</div>
                    {novaToVndRate > 0 && <div className="text-[10px] text-muted">~{formatVnd(item.price_nova, novaToVndRate)}</div>}
                  </div>
                  <button onClick={() => openOrder(item)} className="bg-indigo text-white text-xs font-medium px-3 py-1.5 rounded-lg">
                    {t('redeem.redeem_button')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {active && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-40">
          <form onSubmit={submitOrder} className="w-full max-w-sm bg-surface border border-line rounded-xl p-5 space-y-3">
            <h3 className="font-medium text-sm">{active.label} — {active.price_nova} VDX</h3>
            <input
              autoFocus placeholder={active.field_label || t('redeem.destination_placeholder')} value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setActive(null)} className="flex-1 border border-line text-sm py-2 rounded-lg">
                {t('redeem.cancel')}
              </button>
              <button className="flex-1 bg-indigo text-white text-sm py-2 rounded-lg">{t('redeem.submit')}</button>
            </div>
          </form>
        </div>
      )}

      {msg && <div className={`text-xs mt-2 ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
    </div>
  );
}

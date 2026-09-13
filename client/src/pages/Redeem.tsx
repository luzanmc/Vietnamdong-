import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import type { RedeemCatalog, RedeemItem } from '../types.js';

const CATEGORY_LABEL: Record<string, string> = { game_topup: 'Nạp Game', wallet: 'Ví điện tử', card: 'Thẻ cào' };

type Msg = { type: 'ok' | 'error'; text: string };

export default function Redeem() {
  const [catalog, setCatalog] = useState<RedeemCatalog>({});
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
      const r = await api.redeemOrder({ item_id: active.id, destination });
      if (r.status === 'fulfilled' && r.card_pin) {
        setMsg({ type: 'ok', text: `Đã đổi xong! Mã thẻ: ${r.card_pin}${r.card_serial ? ` — Serial: ${r.card_serial}` : ''}` });
      } else {
        setMsg({ type: 'ok', text: 'Đã gửi yêu cầu đổi thưởng, chờ xử lý.' });
      }
      setActive(null);
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">Đổi thưởng</h1>
      <p className="text-sm text-muted mb-5">Đổi Nova lấy nạp game, ví điện tử hoặc thẻ cào theo mốc định sẵn.</p>

      {Object.entries(catalog).map(([category, items]) => (
        <div key={category} className="mb-6">
          <h2 className="font-medium text-sm text-muted uppercase tracking-wide mb-2">{CATEGORY_LABEL[category] || category}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{item.label}</div>
                  <div className="font-mono text-amber text-sm mt-1">{item.price_nova} Nova</div>
                </div>
                <button onClick={() => openOrder(item)} className="bg-indigo text-white text-xs font-medium px-3 py-1.5 rounded-lg">Đổi</button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {active && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center px-4 z-40">
          <form onSubmit={submitOrder} className="w-full max-w-sm bg-surface border border-line rounded-xl p-5 space-y-3">
            <h3 className="font-medium text-sm">{active.label} — {active.price_nova} Nova</h3>
            <input
              autoFocus placeholder={active.field_label} value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" onClick={() => setActive(null)} className="flex-1 border border-line text-sm py-2 rounded-lg">Huỷ</button>
              <button className="flex-1 bg-indigo text-white text-sm py-2 rounded-lg">Xác nhận</button>
            </div>
          </form>
        </div>
      )}

      {msg && <div className={`text-xs mt-2 ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
    </div>
  );
}

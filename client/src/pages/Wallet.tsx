import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import type { Wallet as WalletType } from '../types.js';

type Msg = { type: 'ok' | 'error'; text: string };

export default function Wallet() {
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [form, setForm] = useState({ amount_nova: '', method: 'momo', destination: '' });
  const [msg, setMsg] = useState<Msg | null>(null);

  useEffect(() => {
    api.wallet().then(setWallet);
  }, []);

  async function submitWithdraw(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    try {
      await api.withdraw({ amount_nova: Number(form.amount_nova), method: form.method, destination: form.destination });
      setMsg({ type: 'ok', text: 'Đã gửi yêu cầu rút tiền, chờ admin duyệt.' });
      setWallet(await api.wallet());
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-xl font-semibold mb-4">Ví Nova</h1>
      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 mb-6">
        <div className="text-xs text-muted uppercase tracking-wide mb-1">Số dư khả dụng</div>
        <div className="font-mono text-3xl font-semibold">{wallet?.balance_nova ?? '...'} <span className="text-base text-muted font-body">Nova</span></div>
      </div>

      <form onSubmit={submitWithdraw} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-sm mb-1">Yêu cầu rút tiền</h2>
        <input
          type="number" placeholder="Số Nova muốn rút" value={form.amount_nova}
          onChange={(e) => setForm({ ...form, amount_nova: e.target.value })}
          className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
          className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        >
          <option value="momo">MoMo</option>
          <option value="bank">Chuyển khoản ngân hàng</option>
          <option value="card">Thẻ cào</option>
        </select>
        <input
          placeholder="Số điện thoại / STK nhận tiền" value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
          className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <button className="w-full bg-indigo text-white text-sm font-medium py-2 rounded-lg">Gửi yêu cầu</button>
        {msg && <div className={`text-xs ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
      </form>
    </div>
  );
}

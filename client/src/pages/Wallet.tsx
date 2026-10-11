import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import type { Wallet as WalletType } from '../types.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import AnimatedNumber from '../components/AnimatedNumber.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';

type Msg = { type: 'ok' | 'error'; text: string };

export default function Wallet() {
  const { t } = useLanguage();
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
      setMsg({ type: 'ok', text: t('wallet.submit_success') });
      setWallet(await api.wallet());
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-xl font-semibold mb-4">{t('wallet.title')}</h1>
      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 mb-6">
        <div className="text-xs text-muted uppercase tracking-wide mb-1">{t('wallet.available_balance')}</div>
        {wallet ? (
          <div>
            <div className="font-mono text-3xl font-semibold flex items-center gap-2">
              <CurrencyIcon size={26} />
              <AnimatedNumber value={wallet.balance_nova} /> <span className="text-base text-muted font-body">VDX</span>
            </div>
            <div className="text-xs text-muted mt-1">~{wallet.balance_vnd.toLocaleString('vi-VN')}đ</div>
          </div>
        ) : (
          <Skeleton className="h-9 w-40" />
        )}
      </div>

      <form onSubmit={submitWithdraw} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-sm mb-1">{t('wallet.withdraw_title')}</h2>
        <input
          type="number" placeholder={t('wallet.amount_placeholder')} value={form.amount_nova}
          onChange={(e) => setForm({ ...form, amount_nova: e.target.value })}
          className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
          className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        >
          <option value="momo">{t('wallet.method_momo')}</option>
          <option value="bank">{t('wallet.method_bank')}</option>
          <option value="card">{t('wallet.method_card')}</option>
        </select>
        <input
          placeholder={t('wallet.destination_placeholder')} value={form.destination}
          onChange={(e) => setForm({ ...form, destination: e.target.value })}
          className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <button className="w-full bg-indigo text-white text-sm font-medium py-2 rounded-lg">{t('wallet.submit')}</button>
        {msg && <div className={`text-xs ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
      </form>
    </div>
  );
}

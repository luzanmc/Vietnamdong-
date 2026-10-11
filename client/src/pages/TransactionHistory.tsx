import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { LeaderboardRowSkeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { LedgerEntry } from '../types.js';

const REASONS = [
  'task_reward',
  'daily_reward',
  'referral_bonus',
  'creator_bonus',
  'withdraw',
  'transfer_in',
  'transfer_out',
  'redeem_order',
  'vietsub_purchase',
  'admin_adjust',
  'spin_reward',
  'quest_reward',
  'monthly_leaderboard_reward',
];
const PAGE_SIZE = 20;

export default function TransactionHistory() {
  const { t } = useLanguage();
  const [reason, setReason] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LedgerEntry[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setItems(null);
    api.filteredLedger({ reason: reason || undefined, from: from || undefined, to: to || undefined, page, pageSize: PAGE_SIZE }).then((r) => {
      setItems(r.items);
      setTotal(r.total);
    });
  }, [reason, from, to, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-xl font-semibold mb-4">{t('history.title')}</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={reason} onChange={(e) => { setReason(e.target.value); setPage(1); }} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-xs">
          <option value="">{t('history.filter_all')}</option>
          {REASONS.map((r) => <option key={r} value={r}>{t(`history.filter_${r}`)}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label={t('history.from_date')} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-xs" />
        <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label={t('history.to_date')} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-xs" />
      </div>

      <div className="bg-surface border border-line rounded-xl overflow-hidden">
        {!items ? (
          Array.from({ length: 6 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
        ) : items.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted text-center">{t('history.no_data')}</div>
        ) : (
          items.map((item, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
              <div>
                <div className="text-sm">{t(`history.filter_${item.reason}`)}</div>
                <div className="text-[10px] text-muted font-mono">{new Date(item.created_at).toLocaleString('vi-VN')}</div>
              </div>
              <span className={`font-mono text-sm ${item.amount >= 0 ? 'text-cyan' : 'text-rose'}`}>
                {item.amount >= 0 ? '+' : ''}{item.amount} VDX
              </span>
            </div>
          ))
        )}
      </div>

      {items && items.length > 0 && (
        <div className="flex items-center justify-between mt-3 text-xs">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="disabled:opacity-40 text-indigo">
            {t('history.prev_page')}
          </button>
          <span className="text-muted">{t('history.page_of', { page, total: totalPages })}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="disabled:opacity-40 text-indigo">
            {t('history.next_page')}
          </button>
        </div>
      )}
    </div>
  );
}

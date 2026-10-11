import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { LeaderboardRowSkeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { playClickSound } from '../utils/sound.js';
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

const REASON_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  task_reward: { icon: 'bi-link-45deg', color: 'text-indigo', bg: 'bg-indigo/15' },
  daily_reward: { icon: 'bi-gift-fill', color: 'text-rose', bg: 'bg-rose/15' },
  referral_bonus: { icon: 'bi-people-fill', color: 'text-cyan', bg: 'bg-cyan/15' },
  creator_bonus: { icon: 'bi-tag-fill', color: 'text-amber', bg: 'bg-amber/15' },
  withdraw: { icon: 'bi-cash-stack', color: 'text-rose', bg: 'bg-rose/15' },
  transfer_in: { icon: 'bi-arrow-down-left', color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  transfer_out: { icon: 'bi-arrow-up-right', color: 'text-rose', bg: 'bg-rose/15' },
  redeem_order: { icon: 'bi-controller', color: 'text-indigo', bg: 'bg-indigo/15' },
  vietsub_purchase: { icon: 'bi-badge-cc-fill', color: 'text-amber', bg: 'bg-amber/15' },
  admin_adjust: { icon: 'bi-gear-fill', color: 'text-muted', bg: 'bg-surface2' },
  spin_reward: { icon: 'bi-stars', color: 'text-amber', bg: 'bg-amber/15' },
  quest_reward: { icon: 'bi-trophy-fill', color: 'text-indigo', bg: 'bg-indigo/15' },
  monthly_leaderboard_reward: { icon: 'bi-award-fill', color: 'text-amber', bg: 'bg-amber/15' },
};

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
    api.filteredLedger({
      reason: reason || undefined,
      from: from || undefined,
      to: to || undefined,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      });
  }, [reason, from, to, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30 mb-2">
          <i className="bi bi-clock-history" />
          <span>Biến động số dư</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          {t('history.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Chi tiết mọi lượt cộng trừ VDX trong tài khoản của bạn theo thời gian thực.
        </p>
      </div>

      {/* Filter Row */}
      <div className="glass-card rounded-2xl p-4 border border-line flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[160px]">
          <select
            value={reason}
            onChange={(e) => {
              playClickSound();
              setReason(e.target.value);
              setPage(1);
            }}
            className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-medium text-ink focus:outline-none focus:border-indigo"
          >
            <option value="">{t('history.filter_all')}</option>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {t(`history.filter_${r}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              playClickSound();
              setFrom(e.target.value);
              setPage(1);
            }}
            aria-label={t('history.from_date')}
            className="bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-indigo"
          />
          <span className="text-muted text-xs">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              playClickSound();
              setTo(e.target.value);
              setPage(1);
            }}
            aria-label={t('history.to_date')}
            className="bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-indigo"
          />
        </div>
      </div>

      {/* Transactions List */}
      <div className="glass-panel rounded-3xl border border-line overflow-hidden shadow-xl">
        {!items ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <LeaderboardRowSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
            <div className="text-sm">{t('history.no_data')}</div>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {items.map((item, i) => {
              const meta = REASON_ICONS[item.reason] || {
                icon: 'bi-coin',
                color: 'text-indigo',
                bg: 'bg-indigo/15',
              };
              const isPositive = item.amount >= 0;

              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-5 py-4 hover:bg-surface2/50 transition group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-line/50 ${meta.bg} ${meta.color}`}
                    >
                      <i className={`bi ${meta.icon} text-lg`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate group-hover:text-indigo transition">
                        {t(`history.filter_${item.reason}`) || item.reason}
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-0.5">
                        {new Date(item.created_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <div
                    className={`font-mono text-sm sm:text-base font-bold flex items-center gap-1 shrink-0 ${
                      isPositive ? 'text-cyan' : 'text-rose'
                    }`}
                  >
                    <CurrencyIcon size={16} />
                    <span>
                      {isPositive ? '+' : ''}
                      {item.amount}
                    </span>
                    <span className="text-[11px] font-body font-normal text-muted">VDX</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {items && items.length > 0 && (
        <div className="flex items-center justify-between pt-2 px-1 text-xs font-semibold">
          <button
            onClick={() => {
              playClickSound();
              setPage((p) => Math.max(1, p - 1));
            }}
            disabled={page <= 1}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-surface2 hover:bg-line border border-line text-ink disabled:opacity-40 transition btn-press"
          >
            <i className="bi bi-chevron-left" />
            <span>{t('history.prev_page')}</span>
          </button>

          <span className="text-muted font-mono">
            {t('history.page_of', { page, total: totalPages })}
          </span>

          <button
            onClick={() => {
              playClickSound();
              setPage((p) => Math.min(totalPages, p + 1));
            }}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-xl bg-surface2 hover:bg-line border border-line text-ink disabled:opacity-40 transition btn-press"
          >
            <span>{t('history.next_page')}</span>
            <i className="bi bi-chevron-right" />
          </button>
        </div>
      )}
    </div>
  );
}

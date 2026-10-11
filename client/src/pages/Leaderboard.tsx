import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { LeaderboardRowSkeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import AnimatedNumber from '../components/AnimatedNumber.js';
import { playClickSound } from '../utils/sound.js';
import type { LeaderboardRow } from '../types.js';

type TabKey = 'weekly' | 'daily' | 'monthly' | 'record' | 'referrers';

const FETCHERS: Record<TabKey, () => Promise<LeaderboardRow[]>> = {
  weekly: api.leaderboard,
  daily: api.dailyTop,
  monthly: api.monthlyTop,
  record: api.recordDaily,
  referrers: api.topReferrers,
};

function UserAvatar({ url, name, size = 'w-10 h-10', text = 'text-sm' }: { url: string | null; name: string; size?: string; text?: string }) {
  if (url) {
    return <img src={url} alt={name} className={`${size} rounded-full object-cover border border-line`} />;
  }
  const initials = name.slice(0, 2).toUpperCase();
  const colors = [
    'from-indigo to-cyan',
    'from-amber to-rose',
    'from-emerald-400 to-cyan',
    'from-violet to-pink-500',
  ];
  const colorIndex = (name.charCodeAt(0) + name.length) % colors.length;
  return (
    <div
      className={`${size} rounded-full bg-gradient-to-tr ${colors[colorIndex]} text-white font-bold flex items-center justify-center ${text} shadow-sm border border-white/10`}
    >
      {initials}
    </div>
  );
}

export default function Leaderboard() {
  const { t } = useLanguage();
  const TABS: { key: TabKey; labelKey: string; icon: string }[] = [
    { key: 'weekly', labelKey: 'leaderboard.tab_weekly', icon: 'bi-calendar-week' },
    { key: 'daily', labelKey: 'leaderboard.tab_daily', icon: 'bi-calendar-day' },
    { key: 'monthly', labelKey: 'leaderboard.tab_monthly', icon: 'bi-calendar3' },
    { key: 'record', labelKey: 'leaderboard.tab_record', icon: 'bi-lightning-charge' },
    { key: 'referrers', labelKey: 'leaderboard.tab_referrers', icon: 'bi-people' },
  ];
  const [tab, setTab] = useState<TabKey>('weekly');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    FETCHERS[tab]()
      .then(setRows)
      .catch(() => setRows([]));
  }, [tab]);

  const top1 = rows && rows.length > 0 ? rows[0] : null;
  const top2 = rows && rows.length > 1 ? rows[1] : null;
  const top3 = rows && rows.length > 2 ? rows[2] : null;
  const restRows = rows && rows.length > 3 ? rows.slice(3) : [];

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30 mb-2">
          <i className="bi bi-trophy-fill" />
          <span>Bảng vinh danh anh tài</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center justify-center sm:justify-start gap-2">
          {t('leaderboard.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Bảng xếp hạng cập nhật liên tục các thành viên kiếm được nhiều VDX nhất toàn mạng lưới.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 p-1 rounded-2xl bg-surface2/60 border border-line w-fit">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key}
            onClick={() => {
              playClickSound();
              setTab(tabDef.key);
            }}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all btn-press ${
              tab === tabDef.key
                ? 'bg-gradient-to-r from-indigo to-indigo/90 text-white shadow-md shadow-indigo/25'
                : 'text-muted hover:text-ink hover:bg-surface2'
            }`}
          >
            <i className={`bi ${tabDef.icon}`} />
            <span>{t(tabDef.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Podium Showcase for Top 3 (if data loaded) */}
      {rows && rows.length > 0 && (
        <div className="relative pt-6 pb-2">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4 items-end max-w-xl mx-auto">
            {/* Top 2 - Silver (Left) */}
            {top2 ? (
              <div className="glass-card rounded-2xl p-3 sm:p-4 text-center border-slate-400/40 relative flex flex-col items-center">
                <div className="text-xl sm:text-2xl mb-1">🥈</div>
                <UserAvatar url={top2.avatar_url} name={top2.username} size="w-12 h-12 sm:w-14 sm:h-14" />
                <div className="font-bold text-xs sm:text-sm text-ink truncate w-full mt-2">
                  {top2.username}
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-ink mt-1 flex items-center gap-1">
                  <CurrencyIcon size={14} />
                  <span>{top2.earned}</span>
                </div>
                <div className="text-[10px] text-muted uppercase mt-0.5">Top 2</div>
              </div>
            ) : (
              <div />
            )}

            {/* Top 1 - Gold (Center, Elevated) */}
            {top1 ? (
              <div className="glass-card rounded-2xl p-4 sm:p-5 text-center border-amber/50 shadow-[0_0_30px_rgba(245,165,36,0.2)] relative flex flex-col items-center scale-105 z-10 -translate-y-2">
                <div className="text-2xl sm:text-3xl mb-1 animate-bounce-subtle">👑</div>
                <div className="relative">
                  <UserAvatar url={top1.avatar_url} name={top1.username} size="w-14 h-14 sm:w-16 sm:h-16" text="text-lg" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber text-black font-bold text-xs flex items-center justify-center border-2 border-surface z-10">
                    1
                  </div>
                </div>
                <div className="font-bold text-sm sm:text-base text-ink truncate w-full mt-2.5">
                  {top1.username}
                </div>
                <div className="font-mono text-sm sm:text-base font-extrabold text-amber mt-1 flex items-center gap-1">
                  <CurrencyIcon size={16} />
                  <span>{top1.earned}</span>
                  <span className="text-[10px] text-muted font-normal">VDX</span>
                </div>
                <div className="text-[10px] font-bold text-amber uppercase mt-0.5">Quán quân</div>
              </div>
            ) : (
              <div />
            )}

            {/* Top 3 - Bronze (Right) */}
            {top3 ? (
              <div className="glass-card rounded-2xl p-3 sm:p-4 text-center border-amber-700/40 relative flex flex-col items-center">
                <div className="text-xl sm:text-2xl mb-1">🥉</div>
                <UserAvatar url={top3.avatar_url} name={top3.username} size="w-12 h-12 sm:w-14 sm:h-14" />
                <div className="font-bold text-xs sm:text-sm text-ink truncate w-full mt-2">
                  {top3.username}
                </div>
                <div className="font-mono text-xs sm:text-sm font-bold text-amber-600 mt-1 flex items-center gap-1">
                  <CurrencyIcon size={14} />
                  <span>{top3.earned}</span>
                </div>
                <div className="text-[10px] text-muted uppercase mt-0.5">Top 3</div>
              </div>
            ) : (
              <div />
            )}
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="glass-panel rounded-3xl border border-line overflow-hidden shadow-xl">
        {!rows ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <LeaderboardRowSkeleton key={i} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
            <div className="text-sm">{t('leaderboard.no_data')}</div>
          </div>
        ) : (
          <div className="divide-y divide-line/60">
            {/* Show top 3 in list too or from rank 4+ */}
            {rows.map((r, i) => {
              const rank = i + 1;
              const rankBadge =
                rank === 1
                  ? 'bg-amber/20 text-amber border-amber/40 font-bold'
                  : rank === 2
                  ? 'bg-slate-400/20 text-slate-300 border-slate-400/40 font-bold'
                  : rank === 3
                  ? 'bg-amber-700/20 text-amber-600 border-amber-700/40 font-bold'
                  : 'bg-surface2 text-muted border-line';

              return (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 sm:px-6 py-3.5 hover:bg-surface2/50 transition group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs border ${rankBadge} shrink-0`}
                    >
                      {rank}
                    </span>
                    <UserAvatar url={r.avatar_url} name={r.username} size="w-9 h-9" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-ink truncate group-hover:text-indigo transition">
                        {r.username}
                      </div>
                      {tab === 'record' && r.day && (
                        <div className="text-[10px] text-muted font-mono">Ngày: {r.day}</div>
                      )}
                      {tab === 'referrers' && (
                        <div className="text-[10px] text-cyan font-mono">
                          {r.referred_count} {t('referral.people_suffix')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="font-mono text-sm sm:text-base font-bold text-amber flex items-center gap-1.5 shrink-0">
                    <CurrencyIcon size={16} />
                    <AnimatedNumber value={r.earned} />
                    <span className="text-[11px] font-body font-normal text-muted">VDX</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

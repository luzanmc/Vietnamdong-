import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { LeaderboardRowSkeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { LeaderboardRow } from '../types.js';

type TabKey = 'weekly' | 'daily' | 'monthly' | 'record' | 'referrers';

const FETCHERS: Record<TabKey, () => Promise<LeaderboardRow[]>> = {
  weekly: api.leaderboard,
  daily: api.dailyTop,
  monthly: api.monthlyTop,
  record: api.recordDaily,
  referrers: api.topReferrers,
};

export default function Leaderboard() {
  const { t } = useLanguage();
  const TABS: { key: TabKey; labelKey: string }[] = [
    { key: 'weekly', labelKey: 'leaderboard.tab_weekly' },
    { key: 'daily', labelKey: 'leaderboard.tab_daily' },
    { key: 'monthly', labelKey: 'leaderboard.tab_monthly' },
    { key: 'record', labelKey: 'leaderboard.tab_record' },
    { key: 'referrers', labelKey: 'leaderboard.tab_referrers' },
  ];
  const [tab, setTab] = useState<TabKey>('weekly');
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);

  useEffect(() => {
    setRows(null);
    FETCHERS[tab]().then(setRows);
  }, [tab]);

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-trophy text-amber" /> {t('leaderboard.title')}
      </h1>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key} onClick={() => setTab(tabDef.key)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-line ${tab === tabDef.key ? 'bg-indigo text-white' : 'text-muted'}`}
          >
            {t(tabDef.labelKey)}
          </button>
        ))}
      </div>
      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl overflow-hidden">
        {!rows ? (
          Array.from({ length: 6 }).map((_, i) => <LeaderboardRowSkeleton key={i} />)
        ) : (
          <>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted w-5">{i + 1}</span>
                  <span className="text-sm font-medium">{r.username}</span>
                  {tab === 'record' && <span className="text-[10px] text-muted font-mono">{r.day}</span>}
                  {tab === 'referrers' && <span className="text-[10px] text-muted font-mono">{r.referred_count} {t('referral.people_suffix')}</span>}
                </div>
                <span className="font-mono text-sm text-amber">+{r.earned} VDX</span>
              </div>
            ))}
            {rows.length === 0 && <div className="px-4 py-6 text-sm text-muted text-center">{t('leaderboard.no_data')}</div>}
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import type { LeaderboardRow } from '../types.js';

type TabKey = 'weekly' | 'daily' | 'record';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'weekly', label: 'Top thưởng tuần' },
  { key: 'daily', label: 'Top thưởng ngày' },
  { key: 'record', label: 'Kỷ lục 1 ngày' },
];

export default function Leaderboard() {
  const [tab, setTab] = useState<TabKey>('weekly');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);

  useEffect(() => {
    const fn = tab === 'weekly' ? api.leaderboard : tab === 'daily' ? api.dailyTop : api.recordDaily;
    fn().then(setRows);
  }, [tab]);

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-trophy text-amber" /> Bảng xếp hạng
      </h1>
      <div className="flex gap-2 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg border border-line ${tab === t.key ? 'bg-indigo text-white' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl overflow-hidden">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted w-5">{i + 1}</span>
              <span className="text-sm font-medium">{r.username}</span>
              {tab === 'record' && <span className="text-[10px] text-muted font-mono">{r.day}</span>}
            </div>
            <span className="font-mono text-sm text-amber">+{r.earned} Nova</span>
          </div>
        ))}
        {rows.length === 0 && <div className="px-4 py-6 text-sm text-muted text-center">Chưa có dữ liệu.</div>}
      </div>
    </div>
  );
}

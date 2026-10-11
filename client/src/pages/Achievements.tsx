import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { Achievement } from '../types.js';

export default function Achievements() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { lang, t } = useLanguage();

  useEffect(() => {
    api.achievements().then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, []);

  const unlockedCount = items.filter((a) => a.unlocked).length;

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-1">{t('achievements.title')}</h1>
      <p className="text-sm text-muted mb-5">{t('achievements.unlocked_of', { a: unlockedCount, b: items.length })}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface border border-line rounded-xl p-4 flex items-start gap-3">
                <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-28 mb-2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))
          : items.map((a) => (
              <div
                key={a.code}
                className={`border rounded-xl p-4 flex items-start gap-3 transition ${
                  a.unlocked ? 'bg-gradient-to-b from-surface to-surface2 border-amber/30' : 'bg-surface border-line opacity-50'
                }`}
              >
                <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${a.unlocked ? 'bg-amber/15 text-amber' : 'bg-surface2 text-muted'}`}>
                  <i className={`bi ${a.icon} text-lg`} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold truncate">{lang === 'vi' ? a.titleVi : a.titleEn}</h3>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">{lang === 'vi' ? a.descVi : a.descEn}</p>
                  {!a.unlocked && (
                    <div className="mt-2">
                      <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
                        <div className="h-full bg-indigo" style={{ width: `${(a.progress / a.target) * 100}%` }} />
                      </div>
                      <div className="text-[10px] text-muted font-mono mt-1">{a.progress}/{a.target}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
      </div>
    </div>
  );
}

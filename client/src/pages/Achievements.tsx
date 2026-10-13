import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { playClickSound } from '../utils/sound.js';
import type { Achievement } from '../types.js';

export default function Achievements() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const { lang, t } = useLanguage();

  useEffect(() => {
    api.achievements()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const unlockedCount = items.filter((a) => a.unlocked).length;
  const totalCount = items.length;
  const pct = totalCount ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const filteredItems = items.filter((a) => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30 mb-2">
          <i className="bi bi-award-fill" />
          <span>Huy hiệu thành tích</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          {t('achievements.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Chinh phục các mốc thành tựu trong hành trình kiếm VNC để khẳng định vị thế.
        </p>
      </div>

      {/* Progress Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-7 border border-line relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase font-semibold text-muted tracking-wider mb-1">
              Tiến độ hoàn thành
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-ink">
              {t('achievements.unlocked_of', { a: unlockedCount, b: totalCount })}
            </div>
            <div className="text-xs text-muted mt-1">
              Bạn đã mở khóa {pct}% tổng số huy hiệu vinh danh.
            </div>
          </div>

          <div className="w-full sm:w-64 space-y-2">
            <div className="flex justify-between text-xs font-mono font-bold text-amber">
              <span>Cấp bậc vinh danh</span>
              <span>{pct}%</span>
            </div>
            <div className="h-3 rounded-full bg-surface2 border border-line overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber to-rose transition-all duration-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-2xl bg-surface2/60 border border-line w-fit">
        <button
          onClick={() => {
            playClickSound();
            setFilter('all');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition btn-press ${
            filter === 'all' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          Tất cả ({totalCount})
        </button>
        <button
          onClick={() => {
            playClickSound();
            setFilter('unlocked');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition btn-press ${
            filter === 'unlocked' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          Đã mở ({unlockedCount})
        </button>
        <button
          onClick={() => {
            playClickSound();
            setFilter('locked');
          }}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition btn-press ${
            filter === 'locked' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
          }`}
        >
          Chưa mở ({totalCount - unlockedCount})
        </button>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-4 flex items-start gap-3">
              <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full glass-card rounded-2xl p-10 text-center text-muted">
            Không có huy hiệu nào trong mục này.
          </div>
        ) : (
          filteredItems.map((a) => (
            <div
              key={a.code}
              className={`rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 transition-all duration-300 relative overflow-hidden ${
                a.unlocked
                  ? 'glass-card border-amber/35 shadow-[0_0_20px_rgba(245,165,36,0.12)]'
                  : 'bg-surface/50 border border-line/60 opacity-60'
              }`}
            >
              {/* Badge Icon */}
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  a.unlocked
                    ? 'bg-gradient-to-br from-amber/25 to-amber/10 border-amber/40 text-amber shadow-sm'
                    : 'bg-surface2 border-line text-muted'
                }`}
              >
                <i className={`bi ${a.icon} text-2xl`} />
              </div>

              {/* Text Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h3 className="text-sm font-bold text-ink truncate">
                    {lang === 'vi' ? a.titleVi : a.titleEn}
                  </h3>
                  {a.unlocked && (
                    <span className="text-[10px] font-bold text-amber bg-amber/15 px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                      <i className="bi bi-check2-circle" />
                      <span>ĐÃ MỞ</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-muted mt-1 leading-relaxed">
                  {lang === 'vi' ? a.descVi : a.descEn}
                </p>

                {!a.unlocked && (
                  <div className="mt-2.5 pt-2 border-t border-line/40">
                    <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
                      <div
                        className="h-full bg-indigo rounded-full"
                        style={{ width: `${Math.min(100, (a.progress / a.target) * 100)}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-muted font-mono mt-1 text-right">
                      {a.progress} / {a.target}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

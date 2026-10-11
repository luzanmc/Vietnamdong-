import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import AnimatedNumber from '../components/AnimatedNumber.js';
import type { ChartPoint } from '../types.js';

export default function NovaChart() {
  const { t } = useLanguage();
  const [data, setData] = useState<ChartPoint[] | null>(null);
  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  useEffect(() => {
    api.myChart().then(setData).catch(() => setData([]));
  }, []);

  const points = data ?? [];
  const max = Math.max(1, ...points.map((d) => Math.abs(d.net)));
  const totalNet = points.reduce((acc, p) => acc + p.net, 0);
  const highestDay = points.reduce((best, p) => (p.net > (best?.net ?? -Infinity) ? p : best), points[0] || null);
  const activeDays = points.filter((p) => p.net !== 0).length;

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
          <i className="bi bi-graph-up" />
          <span>Biểu đồ tăng trưởng</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-graph-up-arrow text-indigo" /> {t('chart.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Theo dõi tổng biến động số dư VDX ròng của bạn trong vòng 30 ngày qua.
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-muted uppercase font-medium">Tổng tích lũy 30 ngày</div>
          <div className="font-mono text-2xl font-bold text-ink mt-1 flex items-center gap-1.5">
            <CurrencyIcon size={20} />
            <span className={totalNet >= 0 ? 'text-cyan' : 'text-rose'}>
              {totalNet >= 0 ? '+' : ''}
              <AnimatedNumber value={totalNet} />
            </span>
            <span className="text-xs font-normal text-muted">VDX</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-muted uppercase font-medium">Ngày kỷ lục cao nhất</div>
          <div className="font-mono text-2xl font-bold text-amber mt-1 flex items-center gap-1.5">
            <CurrencyIcon size={20} />
            <span>+{highestDay?.net ?? 0}</span>
            <span className="text-xs font-normal text-muted">VDX</span>
          </div>
          {highestDay && <div className="text-[10px] text-muted font-mono mt-0.5">{highestDay.day}</div>}
        </div>

        <div className="glass-card rounded-2xl p-4 sm:p-5">
          <div className="text-xs text-muted uppercase font-medium">Số ngày hoạt động</div>
          <div className="font-mono text-2xl font-bold text-indigo mt-1">
            {activeDays} <span className="text-xs font-body font-normal text-muted">/ {points.length} ngày</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas Card */}
      <div className="glass-panel rounded-3xl p-6 border border-line shadow-xl relative overflow-hidden">
        {!data ? (
          <Skeleton className="h-56 w-full rounded-2xl" />
        ) : points.length === 0 ? (
          <div className="py-16 text-center text-muted">
            <i className="bi bi-bar-chart text-3xl mb-2 inline-block text-muted/60" />
            <div className="text-sm">{t('chart.no_data')}</div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Hover Tooltip Indicator */}
            <div className="h-6 flex items-center justify-between text-xs font-mono">
              {hovered ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted">{hovered.day}:</span>
                  <span className={`font-bold flex items-center gap-1 ${hovered.net >= 0 ? 'text-cyan' : 'text-rose'}`}>
                    <CurrencyIcon size={14} />
                    {hovered.net >= 0 ? '+' : ''}{hovered.net} VDX
                  </span>
                </div>
              ) : (
                <span className="text-muted/60 text-[11px] font-body">Rê chuột vào cột để xem chi tiết từng ngày</span>
              )}

              <div className="flex items-center gap-3 text-[11px] text-muted">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-cyan inline-block" /> Tăng</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose inline-block" /> Giảm</span>
              </div>
            </div>

            {/* Bars Column Graphic */}
            <div className="flex items-end gap-1 sm:gap-1.5 h-48 pt-4 pb-1 border-b border-line/60">
              {points.map((d) => {
                const heightPct = Math.max(3, (Math.abs(d.net) / max) * 100);
                const isPos = d.net >= 0;

                return (
                  <div
                    key={d.day}
                    onMouseEnter={() => setHovered(d)}
                    onMouseLeave={() => setHovered(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    <div
                      className={`w-full rounded-t-sm transition-all duration-200 group-hover:brightness-125 ${
                        isPos
                          ? 'bg-gradient-to-t from-cyan/60 to-cyan group-hover:shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                          : 'bg-gradient-to-t from-rose/60 to-rose group-hover:shadow-[0_0_12px_rgba(251,106,138,0.5)]'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-Axis Date Labels */}
            <div className="flex justify-between text-[10px] text-muted font-mono pt-1">
              <span>{points[0]?.day}</span>
              <span>Giữa tháng</span>
              <span>{points[points.length - 1]?.day}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

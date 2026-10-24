import { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface AnalyticsData {
  days: number;
  dailyBypasses: { day: string; count: number }[];
  topLinks: { name: string; count: number }[];
  newUsers: { day: string; count: number }[];
  vncIssued: { day: string; amount: number }[];
  vncWithdrawn: { day: string; amount: number }[];
}

export default function AdminAnalytics() {
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData(selectedDays: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?days=${selectedDays}`, { credentials: 'include' });
      const json = await res.json();
      if (res.ok) setData(json);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData(days);
  }, [days]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-graph-up text-cyan" /> Biểu đồ thống kê chi tiết
        </h2>
        <div className="flex items-center gap-1 bg-surface2 border border-line p-1 rounded-xl">
          {([7, 30, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                days === d ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <i className="bi bi-bar-chart-fill text-indigo" /> Lượt vượt link theo ngày
            </h3>
            <span className="text-[11px] text-muted font-mono">
              Tổng: {data?.dailyBypasses.reduce((acc, curr) => acc + curr.count, 0) ?? 0} lượt
            </span>
          </div>
          {loading || !data ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <SimpleBarChart
              items={data.dailyBypasses.map((d) => ({
                label: d.day.slice(5),
                value: d.count,
              }))}
              barColor="bg-indigo"
            />
          )}
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <i className="bi bi-person-plus-fill text-cyan" /> Người dùng mới tham gia
            </h3>
            <span className="text-[11px] text-muted font-mono">
              Tổng: {data?.newUsers.reduce((acc, curr) => acc + curr.count, 0) ?? 0} tài khoản
            </span>
          </div>
          {loading || !data ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <SimpleLineChart
              items={data.newUsers.map((d) => ({
                label: d.day.slice(5),
                value: d.count,
              }))}
              strokeColor="#06b6d4"
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <i className="bi bi-currency-exchange text-amber" /> VNC phát ra vs VNC đã rút
            </h3>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400" /> Phát ra
              </span>
              <span className="flex items-center gap-1 text-rose">
                <span className="w-2 h-2 rounded-full bg-rose" /> Rút tiền
              </span>
            </div>
          </div>
          {loading || !data ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <DualBarChart
              issued={data.vncIssued.map((d) => ({ label: d.day.slice(5), value: d.amount }))}
              withdrawn={data.vncWithdrawn.map((d) => ({ label: d.day.slice(5), value: d.amount }))}
            />
          )}
        </div>

        <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <i className="bi bi-award text-purple-400" /> Link được vượt nhiều nhất ({days} ngày)
            </h3>
          </div>
          {loading || !data ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : data.topLinks.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-muted">
              Chưa có dữ liệu vượt link trong {days} ngày qua.
            </div>
          ) : (
            <div className="space-y-2.5 pt-1">
              {(() => {
                const max = Math.max(...data.topLinks.map((l) => l.count), 1);
                return data.topLinks.map((link, idx) => {
                  const percent = Math.round((link.count / max) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium truncate max-w-[200px] sm:max-w-[260px]">{link.name}</span>
                        <span className="font-mono text-cyan font-semibold">{link.count} lượt</span>
                      </div>
                      <div className="w-full bg-surface2 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo to-cyan h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({ items, barColor }: { items: { label: string; value: number }[]; barColor: string }) {
  if (items.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted">Chưa có dữ liệu.</div>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 px-1">
      {items.map((item, idx) => {
        const heightPercent = Math.max(8, Math.round((item.value / max) * 100));
        return (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
            <span className="text-[10px] font-mono text-muted absolute -top-5 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-surface2 border border-line px-1 rounded z-10">
              {item.value}
            </span>
            <div
              style={{ height: `${heightPercent}%` }}
              className={`w-full rounded-t-md transition-all duration-300 hover:brightness-125 ${barColor}`}
            />
            <span className="text-[9px] sm:text-[10px] text-muted font-mono mt-1.5 truncate max-w-full">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SimpleLineChart({ items, strokeColor }: { items: { label: string; value: number }[]; strokeColor: string }) {
  if (items.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted">Chưa có dữ liệu.</div>;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const w = 400;
  const h = 140;
  const step = items.length > 1 ? w / (items.length - 1) : w;

  const points = items.map((it, i) => {
    const x = i * step;
    const y = h - (it.value / max) * (h - 20) - 10;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;

  return (
    <div className="h-48 flex flex-col justify-end pt-2">
      <div className="w-full h-36">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            d={`${pathD} L ${w},${h} L 0,${h} Z`}
            fill="url(#lineGrad)"
          />
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {items.map((it, i) => {
            const x = i * step;
            const y = h - (it.value / max) * (h - 20) - 10;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3.5"
                fill="#0A0A0F"
                stroke={strokeColor}
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-muted font-mono mt-2">
        <span>{items[0]?.label}</span>
        {items.length > 2 && <span>{items[Math.floor(items.length / 2)]?.label}</span>}
        <span>{items[items.length - 1]?.label}</span>
      </div>
    </div>
  );
}

function DualBarChart({
  issued,
  withdrawn,
}: {
  issued: { label: string; value: number }[];
  withdrawn: { label: string; value: number }[];
}) {
  const allLabels = Array.from(new Set([...issued.map((i) => i.label), ...withdrawn.map((w) => w.label)]));
  if (allLabels.length === 0) {
    return <div className="h-48 flex items-center justify-center text-xs text-muted">Chưa có giao dịch.</div>;
  }
  const max = Math.max(
    ...issued.map((i) => i.value),
    ...withdrawn.map((w) => w.value),
    1
  );

  return (
    <div className="h-48 flex items-end gap-1.5 sm:gap-2 pt-6 px-1">
      {allLabels.map((lbl, idx) => {
        const iVal = issued.find((i) => i.label === lbl)?.value || 0;
        const wVal = withdrawn.find((w) => w.label === lbl)?.value || 0;
        const iH = Math.max(4, Math.round((iVal / max) * 100));
        const wH = Math.max(4, Math.round((wVal / max) * 100));

        return (
          <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
            <div className="w-full flex items-end justify-center gap-0.5 h-full">
              <div
                style={{ height: `${iH}%` }}
                className="w-1/2 bg-emerald-400 rounded-t-sm transition-all"
                title={`Phát ra: +${iVal} VNC`}
              />
              <div
                style={{ height: `${wH}%` }}
                className="w-1/2 bg-rose rounded-t-sm transition-all"
                title={`Rút: ${wVal} VNC`}
              />
            </div>
            <span className="text-[9px] sm:text-[10px] text-muted font-mono mt-1.5 truncate max-w-full">
              {lbl}
            </span>
          </div>
        );
      })}
    </div>
  );
}

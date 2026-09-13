import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import type { ChartPoint } from '../types.js';

export default function NovaChart() {
  const [data, setData] = useState<ChartPoint[]>([]);

  useEffect(() => {
    api.myChart().then(setData);
  }, []);

  const max = Math.max(1, ...data.map((d) => Math.abs(d.net)));

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-graph-up text-indigo" /> Biểu đồ Nova (30 ngày)
      </h1>
      {data.length === 0 ? (
        <p className="text-sm text-muted">Chưa có giao dịch nào trong 30 ngày qua.</p>
      ) : (
        <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5">
          <div className="flex items-end gap-1 h-40">
            {data.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                <div
                  className={`w-full rounded-t ${d.net >= 0 ? 'bg-cyan' : 'bg-rose'}`}
                  style={{ height: `${(Math.abs(d.net) / max) * 100}%`, minHeight: 2 }}
                  title={`${d.day}: ${d.net > 0 ? '+' : ''}${d.net} Nova`}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted mt-2 font-mono">
            <span>{data[0]?.day}</span>
            <span>{data[data.length - 1]?.day}</span>
          </div>
        </div>
      )}
    </div>
  );
}

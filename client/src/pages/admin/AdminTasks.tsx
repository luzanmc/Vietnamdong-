import { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface TaskRow {
  id: string;
  name: string;
  provider_key: string;
  reward_nova: number;
  daily_limit: number;
  active: number;
}

export default function AdminTasks() {
  const [rows, setRows] = useState<TaskRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/tasks', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setRows(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function update(id: string, patch: Partial<Pick<TaskRow, 'reward_nova' | 'daily_limit' | 'active'>>) {
    try {
      await fetch(`/api/admin/tasks/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      load();
    } catch {
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-list-check text-indigo" /> Quản lý nhiệm vụ vượt link
        </h2>
      </div>

      <div className="block sm:hidden space-y-3">
        {loading || !rows ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Chưa có nhiệm vụ nào.
          </div>
        ) : (
          rows.map((t) => (
            <div key={t.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-semibold text-xs text-ink block">{t.name}</span>
                  <span className="text-[10px] text-muted font-mono">{t.provider_key}</span>
                </div>
                <button
                  onClick={() => update(t.id, { active: t.active ? 0 : 1 })}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                    t.active
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                      : 'bg-surface2 border-line text-muted'
                  }`}
                >
                  {t.active ? 'Đang bật' : 'Đã tắt'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-line">
                <div>
                  <label className="text-muted block text-[10px] mb-1">Thưởng VNC</label>
                  <input
                    type="number"
                    defaultValue={t.reward_nova}
                    onBlur={(e) => update(t.id, { reward_nova: Number(e.target.value) })}
                    className="w-full bg-surface2 border border-line rounded-lg px-2.5 py-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted block text-[10px] mb-1">Giới hạn / ngày</label>
                  <input
                    type="number"
                    defaultValue={t.daily_limit}
                    onBlur={(e) => update(t.id, { daily_limit: Number(e.target.value) })}
                    className="w-full bg-surface2 border border-line rounded-lg px-2.5 py-1 text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block border border-line rounded-2xl overflow-hidden bg-surface">
        <table className="w-full text-xs">
          <thead className="bg-surface2 text-muted uppercase text-[10px] border-b border-line">
            <tr>
              <th className="text-left px-3.5 py-3">Tên nhiệm vụ</th>
              <th className="text-left px-3.5 py-3">Provider</th>
              <th className="text-left px-3.5 py-3">Thưởng (VNC)</th>
              <th className="text-left px-3.5 py-3">Giới hạn / ngày</th>
              <th className="text-right px-3.5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading || !rows ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={5} className="px-3.5 py-3">
                    <Skeleton className="h-6 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-8 text-center text-muted">
                  Chưa có nhiệm vụ nào.
                </td>
              </tr>
            ) : (
              rows.map((t) => (
                <tr key={t.id} className="hover:bg-surface2/50 transition">
                  <td className="px-3.5 py-3 font-semibold">{t.name}</td>
                  <td className="px-3.5 py-3 text-muted font-mono">{t.provider_key}</td>
                  <td className="px-3.5 py-3">
                    <input
                      type="number"
                      defaultValue={t.reward_nova}
                      onBlur={(e) => update(t.id, { reward_nova: Number(e.target.value) })}
                      className="w-20 bg-surface2 border border-line rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-indigo"
                    />
                  </td>
                  <td className="px-3.5 py-3">
                    <input
                      type="number"
                      defaultValue={t.daily_limit}
                      onBlur={(e) => update(t.id, { daily_limit: Number(e.target.value) })}
                      className="w-24 bg-surface2 border border-line rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-indigo"
                    />
                  </td>
                  <td className="px-3.5 py-3 text-right">
                    <button
                      onClick={() => update(t.id, { active: t.active ? 0 : 1 })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition ${
                        t.active
                          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : 'bg-surface2 border-line text-muted'
                      }`}
                    >
                      {t.active ? 'Đang bật' : 'Đã tắt'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

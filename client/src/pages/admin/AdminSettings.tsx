import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setSettings(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim(), value }),
      });
      if (res.ok) {
        setMsg('Đã lưu cấu hình cài đặt');
        setKey('');
        setValue('');
        load();
      }
    } catch {
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-sliders text-indigo" /> Cài đặt hệ thống (Key-Value)
        </h2>

        {msg && (
          <div className="p-3 bg-cyan/15 border border-cyan/30 text-cyan text-xs rounded-xl flex items-center gap-2">
            <i className="bi bi-check-circle" /> {msg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Khóa cấu hình (Key)</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="VD: site_maintenance hoặc min_withdraw_nova"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Giá trị (Value)</label>
            <textarea
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Giá trị cấu hình"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <i className="bi bi-save" /> Lưu cấu hình
          </button>
        </form>

        <div className="space-y-2 pt-2 border-t border-line">
          <h3 className="text-xs font-semibold text-muted uppercase">Danh sách cấu hình hiện tại</h3>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)
          ) : Object.keys(settings).length === 0 ? (
            <p className="text-xs text-muted py-2">Chưa có bản ghi cài đặt nào.</p>
          ) : (
            Object.entries(settings).map(([k, v]) => (
              <div
                key={k}
                onClick={() => {
                  setKey(k);
                  setValue(v);
                }}
                className="p-3 bg-surface2 border border-line rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer hover:border-indigo/50 transition"
              >
                <span className="font-mono font-semibold text-indigo truncate">{k}</span>
                <span className="font-mono text-muted text-[11px] truncate max-w-[200px]">{v}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

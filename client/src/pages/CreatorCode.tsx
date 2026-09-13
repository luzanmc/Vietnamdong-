import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import type { CreatorCodeInfo } from '../types.js';

type Msg = { type: 'ok' | 'error'; text: string };

export default function CreatorCode() {
  const [mine, setMine] = useState<CreatorCodeInfo | null>(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<Msg | null>(null);

  function load() {
    api.myCreatorCode().then(setMine);
  }
  useEffect(load, []);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.applyCreatorCode(code);
      setMsg({ type: 'ok', text: 'Đã áp dụng creator code' });
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-tag text-indigo" /> Creator Code
      </h1>

      {mine?.owns_code && (
        <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 mb-4">
          <div className="text-xs text-muted uppercase mb-1">Code của bạn</div>
          <div className="font-mono text-lg font-semibold mb-2">{mine.code}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted">Đã dùng bởi</span><div className="font-mono">{mine.used_by_count} người</div></div>
            <div><span className="text-muted">Đã kiếm được</span><div className="font-mono text-amber">{mine.total_earned_nova} Nova</div></div>
          </div>
        </div>
      )}

      <form onSubmit={apply} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-sm">Nhập creator code (nếu có)</h2>
        <input
          value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="VD: LUZANMC" className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <button className="w-full bg-indigo text-white text-sm font-medium py-2 rounded-lg">Áp dụng</button>
        {msg && <div className={`text-xs ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
      </form>
    </div>
  );
}

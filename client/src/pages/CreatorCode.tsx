import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { CreatorCodeInfo } from '../types.js';

type Msg = { type: 'ok' | 'error'; text: string };

export default function CreatorCode() {
  const { t } = useLanguage();
  const [mine, setMine] = useState<CreatorCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<Msg | null>(null);

  function load() {
    api.myCreatorCode().then((d) => {
      setMine(d);
      setLoading(false);
    });
  }
  useEffect(load, []);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.applyCreatorCode(code);
      setMsg({ type: 'ok', text: t('creator.apply_success') });
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-tag text-indigo" /> {t('creator.title')}
      </h1>

      {loading && (
        <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 mb-4">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      )}

      {mine?.owns_code && (
        <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 mb-4">
          <div className="text-xs text-muted uppercase mb-1">{t('creator.your_code')}</div>
          <div className="font-mono text-lg font-semibold mb-2">{mine.code}</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted">{t('creator.used_by')}</span><div className="font-mono">{mine.used_by_count} {t('creator.used_by_suffix')}</div></div>
            <div><span className="text-muted">{t('creator.total_earned')}</span><div className="font-mono text-amber">{mine.total_earned_nova} VDX</div></div>
          </div>
        </div>
      )}

      <form onSubmit={apply} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 space-y-3">
        <h2 className="font-medium text-sm">{t('creator.enter_code_title')}</h2>
        <input
          value={code} onChange={(e) => setCode(e.target.value)}
          placeholder="VD: LUZANMC" className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
        />
        <button className="w-full bg-indigo text-white text-sm font-medium py-2 rounded-lg">{t('creator.apply_button')}</button>
        {msg && <div className={`text-xs ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
      </form>
    </div>
  );
}

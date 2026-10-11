import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { Quest } from '../types.js';

export default function Quests() {
  const { lang, t } = useLanguage();
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  function load() {
    api.quests().then(setQuests);
  }
  useEffect(load, []);

  async function claim(code: string) {
    setMsg(null);
    try {
      const r = await api.claimQuest(code);
      setMsg({ type: 'ok', text: t('quests.claim_success', { reward: r.reward }) });
      load();
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-list-task text-indigo" /> {t('quests.title')}
      </h1>

      {msg && <p className={`text-xs mb-3 ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</p>}

      <div className="space-y-3">
        {!quests ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          quests.map((q) => (
            <div key={q.code} className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">{lang === 'vi' ? q.titleVi : q.titleEn}</h3>
                <span className="font-mono text-xs text-amber">+{q.reward} VDX</span>
              </div>
              <p className="text-xs text-muted mb-2">{lang === 'vi' ? q.descVi : q.descEn}</p>
              <div className="h-1.5 rounded-full bg-surface2 overflow-hidden mb-2">
                <div className="h-full bg-indigo" style={{ width: `${(q.progress / q.target) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted font-mono">{q.progress}/{q.target}</span>
                {q.claimed ? (
                  <span className="text-xs text-muted">{t('quests.claimed')}</span>
                ) : (
                  <button
                    onClick={() => claim(q.code)}
                    disabled={!q.canClaim}
                    className="bg-indigo disabled:opacity-40 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                  >
                    {t('quests.claim_button')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

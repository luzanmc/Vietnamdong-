import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { DailyStatus } from '../types.js';

type Msg = { type: 'ok' | 'error'; text: string };

export default function DailyReward() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);

  function load() {
    api.dailyStatus().then(setStatus);
  }
  useEffect(load, []);

  async function claim() {
    try {
      const r = await api.dailyClaim();
      setMsg({ type: 'ok', text: t('daily.claim_success', { reward: r.reward_nova, streak: r.streak_days }) });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: (e as ApiError).message });
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-gift text-amber" /> {t('daily.title')}
      </h1>
      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 text-center">
        <div className="w-14 h-14 mx-auto rounded-full bg-rose/10 flex items-center justify-center mb-3">
          <i className="bi bi-fire text-2xl text-rose" />
        </div>
        {status ? (
          <div className="font-mono text-2xl font-semibold">{status.streak_days} {t('daily.days_suffix')}</div>
        ) : (
          <Skeleton className="h-8 w-24 mx-auto" />
        )}
        <div className="text-xs text-muted mb-4 mt-1">{t('daily.streak_label')}</div>
        {status ? (
          <button
            onClick={claim}
            disabled={!status.can_claim}
            className="w-full bg-indigo disabled:opacity-40 text-white font-semibold py-2.5 rounded-lg"
          >
            {status.can_claim ? t('daily.claim_button', { n: status.next_reward_nova }) : t('daily.already_claimed')}
          </button>
        ) : (
          <Skeleton className="h-11 w-full" />
        )}
        {msg && <div className={`text-xs mt-3 ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>{msg.text}</div>}
      </div>
    </div>
  );
}

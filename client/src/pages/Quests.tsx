import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playClaimSound } from '../utils/sound.js';
import type { Quest } from '../types.js';

export default function Quests() {
  const { lang, t } = useLanguage();
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [quests, setQuests] = useState<Quest[] | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);

  function load() {
    api.quests().then(setQuests).catch(() => {});
  }
  useEffect(load, []);

  async function claim(code: string) {
    playClickSound();
    setClaimingCode(code);
    try {
      const r = await api.claimQuest(code);
      playClaimSound();
      triggerConfetti();
      toastSuccess(t('quests.claim_success', { reward: r.reward }), 'Nhiệm vụ hoàn thành');
      await refresh();
      load();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Lỗi nhận thưởng');
    } finally {
      setClaimingCode(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
          <i className="bi bi-trophy" />
          <span>Mục tiêu tuần & tháng</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-list-task text-indigo" /> {t('quests.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Hoàn thành các cột mốc đặc biệt để nhận thêm một lượng lớn VNC thưởng.
        </p>
      </div>

      <div className="space-y-4">
        {!quests ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))
        ) : quests.length === 0 ? (
          <div className="glass-card rounded-2xl p-12 text-center text-muted">
            <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
            <div>Chưa có nhiệm vụ đặc biệt nào.</div>
          </div>
        ) : (
          quests.map((q) => {
            const pct = Math.min(100, Math.round((q.progress / q.target) * 100));
            const isBusy = claimingCode === q.code;

            return (
              <div
                key={q.code}
                className="glass-card rounded-2xl p-5 border border-line relative overflow-hidden transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-semibold text-base text-ink">
                      {lang === 'vi' ? q.titleVi : q.titleEn}
                    </h3>
                    <p className="text-xs text-muted mt-0.5 leading-relaxed">
                      {lang === 'vi' ? q.descVi : q.descEn}
                    </p>
                  </div>
                  <div className="font-mono text-base font-bold text-amber flex items-center gap-1 shrink-0 bg-amber/10 px-2.5 py-1 rounded-xl border border-amber/20">
                    <CurrencyIcon size={16} />
                    <span>+{q.reward}</span>
                    <span className="text-xs">VNC</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
                    <span>Tiến độ</span>
                    <span className="font-mono font-semibold text-ink">
                      {q.progress} / {q.target} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface2 border border-line/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo via-cyan to-indigo transition-all duration-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Footer action */}
                <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between gap-2.5">
                  <span className="text-[11px] text-muted min-w-0 truncate">
                    {q.claimed ? (
                      <span className="text-cyan flex items-center gap-1">
                        <i className="bi bi-check-circle-fill text-xs shrink-0" /> <span className="truncate">Đã hoàn thành</span>
                      </span>
                    ) : q.canClaim ? (
                      <span className="text-amber flex items-center gap-1 animate-pulse">
                        <i className="bi bi-gift-fill text-xs shrink-0" /> <span className="truncate">Sẵn sàng nhận quà!</span>
                      </span>
                    ) : (
                      <span className="truncate">Cần thêm {q.target - q.progress} lượt để mở khóa</span>
                    )}
                  </span>

                  {q.claimed ? (
                    <span className="text-xs font-semibold text-muted bg-surface2 px-3 py-1.5 rounded-lg border border-line shrink-0">
                      {t('quests.claimed')}
                    </span>
                  ) : (
                    <button
                      onClick={() => claim(q.code)}
                      disabled={!q.canClaim || isBusy}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition btn-press flex items-center gap-1.5 shadow-sm shrink-0 ${
                        q.canClaim
                          ? 'bg-gradient-to-r from-amber to-amber-600 hover:brightness-110 text-black shadow-amber/20 hover:shadow-[0_0_20px_rgba(245,165,36,0.4)]'
                          : 'bg-surface2 text-muted border border-line opacity-50 cursor-not-allowed'
                      }`}
                    >
                      {isBusy ? (
                        <>
                          <i className="bi bi-arrow-repeat animate-spin" />
                          <span>Đang nhận...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-gift-fill" />
                          <span>{t('quests.claim_button')}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

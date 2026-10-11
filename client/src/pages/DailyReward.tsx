import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playClaimSound } from '../utils/sound.js';
import type { DailyStatus } from '../types.js';

interface DayMilestone {
  day: number;
  reward: number;
  isChest?: boolean;
}

const MILESTONES: DayMilestone[] = [
  { day: 1, reward: 1 },
  { day: 2, reward: 2 },
  { day: 3, reward: 3 },
  { day: 4, reward: 4 },
  { day: 5, reward: 5 },
  { day: 6, reward: 6 },
  { day: 7, reward: 10, isChest: true },
];

export default function DailyReward() {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  function load() {
    api.dailyStatus().then(setStatus).catch(() => {});
  }
  useEffect(load, []);

  async function claim() {
    if (!status?.can_claim || claiming) return;
    playClickSound();
    setClaiming(true);
    setMsg(null);
    try {
      const r = await api.dailyClaim();
      playClaimSound();
      triggerConfetti();
      const successText = t('daily.claim_success', { reward: r.reward_nova, streak: r.streak_days });
      setMsg({ type: 'ok', text: successText });
      toastSuccess(successText, 'Quà thưởng ngày');
      await refresh();
      load();
    } catch (e) {
      const errorText = (e as ApiError).message;
      setMsg({ type: 'error', text: errorText });
      toastError(errorText, 'Lỗi nhận quà');
    } finally {
      setClaiming(false);
    }
  }

  if (!status) {
    return (
      <div className="max-w-2xl mx-auto py-8 space-y-6">
        <Skeleton className="h-44 w-full rounded-3xl" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  // Active day in the 7-day cycle (1-7)
  const currentStreak = status.streak_days;
  const cycleDay = (currentStreak % 7) || (currentStreak > 0 ? 7 : 0);
  const todayMilestoneIndex = status.can_claim ? cycleDay % 7 : (cycleDay - 1 + 7) % 7;

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Hero Header Card */}
      <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-line glass-panel shadow-2xl">
        <div className="absolute top-0 right-0 w-72 h-72 bg-rose/15 rounded-full blur-3xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose/15 text-rose border border-rose/30 mb-2">
              <i className="bi bi-fire text-rose text-sm animate-pulse-soft" />
              <span>Điểm danh 7 ngày liên tục</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink">
              {t('daily.title')}
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1.5 max-w-md leading-relaxed">
              Duy trì chuỗi điểm danh mỗi ngày để gia tăng lượng VDX nhận được. Nếu bỏ lỡ một ngày, chuỗi sẽ được làm mới về Ngày 1!
            </p>
          </div>

          {/* Streak Flame Counter */}
          <div className="glass-card rounded-2xl p-5 border border-rose/30 flex flex-col items-center justify-center min-w-[150px] shadow-lg">
            <div className="w-14 h-14 rounded-full bg-rose/20 border border-rose/40 flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(251,106,138,0.3)]">
              <i className="bi bi-fire text-3xl text-rose animate-bounce-subtle" />
            </div>
            <div className="font-mono text-3xl font-extrabold text-ink">
              {status.streak_days}{' '}
              <span className="text-sm font-body font-medium text-muted">{t('daily.days_suffix')}</span>
            </div>
            <div className="text-[11px] text-muted font-medium mt-0.5">{t('daily.streak_label')}</div>
          </div>
        </div>
      </div>

      {/* 7-Day Roadmap Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-muted px-1">
          <span className="font-semibold uppercase tracking-wider text-[11px]">Hành trình 7 ngày nhận thưởng</span>
          <span>Mốc quà tăng dần mỗi ngày</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {MILESTONES.map((m, idx) => {
            const isCompleted = status.can_claim ? idx < todayMilestoneIndex : idx <= todayMilestoneIndex;
            const isToday = idx === todayMilestoneIndex;

            return (
              <div
                key={m.day}
                className={`rounded-2xl p-3.5 text-center flex flex-col items-center justify-between relative transition-all duration-300 ${
                  isToday
                    ? 'glass-card border-2 border-amber shadow-[0_0_25px_rgba(245,165,36,0.3)] scale-[1.02]'
                    : isCompleted
                    ? 'bg-surface2/60 border border-line text-muted'
                    : 'glass-card border border-line/70 opacity-75'
                }`}
              >
                {/* Day Badge */}
                <div className="text-[11px] font-bold uppercase tracking-wider mb-2 text-muted">
                  Ngày {m.day}
                </div>

                {/* Center Icon */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center mb-2 transition-transform ${
                    isToday
                      ? 'bg-amber/20 text-amber shadow-[0_0_15px_rgba(245,165,36,0.4)]'
                      : isCompleted
                      ? 'bg-cyan/15 text-cyan'
                      : m.isChest
                      ? 'bg-gradient-to-br from-amber/20 to-rose/20 text-amber'
                      : 'bg-surface2 text-muted'
                  }`}
                >
                  {isCompleted ? (
                    <i className="bi bi-check2-circle text-xl text-cyan" />
                  ) : m.isChest ? (
                    <i className="bi bi-gem text-xl text-amber animate-pulse-soft" />
                  ) : (
                    <CurrencyIcon size={22} />
                  )}
                </div>

                {/* Reward Value */}
                <div className="font-mono text-sm font-bold text-ink">
                  +{m.reward} <span className="text-[10px] text-muted font-body">VDX</span>
                </div>

                {/* Status tag */}
                <div className="mt-2 text-[10px] font-semibold">
                  {isCompleted ? (
                    <span className="text-cyan">Đã nhận</span>
                  ) : isToday ? (
                    <span className="text-amber animate-pulse">Hôm nay</span>
                  ) : (
                    <span className="text-muted">Chưa mở</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Claim Action Button */}
      <div className="glass-card rounded-2xl p-6 text-center max-w-md mx-auto space-y-4">
        {status.can_claim ? (
          <div>
            <div className="text-xs text-muted mb-2">Phần thưởng hôm nay sẵn sàng:</div>
            <div className="font-mono text-3xl font-extrabold text-amber mb-4 flex items-center justify-center gap-2">
              <CurrencyIcon size={28} />
              <span>+{status.next_reward_nova} VDX</span>
            </div>
            <button
              onClick={claim}
              disabled={claiming}
              className="w-full py-3.5 px-6 rounded-xl font-display font-bold text-base bg-gradient-to-r from-rose via-amber to-rose hover:brightness-110 text-black shadow-lg shadow-amber/20 hover:shadow-[0_0_30px_rgba(245,165,36,0.5)] transition-all btn-press flex items-center justify-center gap-2"
            >
              {claiming ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-lg" />
                  <span>Đang nhận quà...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-gift-fill text-lg" />
                  <span>{t('daily.claim_button', { n: status.next_reward_nova })}</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="py-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-cyan/15 text-cyan flex items-center justify-center mb-2">
              <i className="bi bi-check-lg text-2xl" />
            </div>
            <div className="font-display font-bold text-base text-ink mb-1">{t('daily.already_claimed')}</div>
            <p className="text-xs text-muted">
              Bạn đã nhận quà hôm nay rồi. Hãy quay lại sau 00:00 để duy trì streak nhé!
            </p>
          </div>
        )}

        {msg && (
          <div className={`text-xs font-medium pt-2 ${msg.type === 'ok' ? 'text-cyan' : 'text-rose'}`}>
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { api, type ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playClaimSound } from '../utils/sound.js';
import type { DailyStatus } from '../types.js';

interface DayMilestone {
  day: number;
  reward: number;
}

const MILESTONES: DayMilestone[] = [
  { day: 1, reward: 100 },
  { day: 2, reward: 150 },
  { day: 3, reward: 200 },
  { day: 4, reward: 250 },
  { day: 5, reward: 300 },
  { day: 6, reward: 400 },
  { day: 7, reward: 1000 },
];

export default function DailyReward() {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [claiming, setClaiming] = useState(false);

  function load() {
    api.dailyStatus().then(setStatus).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function claim() {
    if (!status?.can_claim || claiming) return;
    playClickSound();
    setClaiming(true);

    try {
      const r = await api.dailyClaim();
      playClaimSound();
      triggerConfetti();
      const successText = t('daily.claim_success', {
        reward: r.reward_nova,
        streak: r.streak_days,
      }) || `Điểm danh thành công! Nhận +${r.reward_nova} VNC (Streak: ${r.streak_days} ngày)`;
      toastSuccess(successText, 'Điểm danh nhận quà');
      await refresh();
      load();
    } catch (e) {
      const errorText = (e as ApiError).message || 'Điểm danh thất bại';
      toastError(errorText, 'Lỗi điểm danh');
    } finally {
      setClaiming(false);
    }
  }

  if (!status) {
    return (
      <div className="pg">
        <div className="hd">
          <Skeleton className="h-8 w-48 rounded-lg" />
        </div>
        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const currentStreak = status.streak_days;
  const cycleDay = (currentStreak % 7) || (currentStreak > 0 ? 7 : 0);
  const todayMilestoneIndex = status.can_claim ? cycleDay % 7 : (cycleDay - 1 + 7) % 7;

  return (
    <div className="pg" id="pg-daily">
      <div className="hd">
        <div>
          <h2>Điểm danh</h2>
          <p>Điểm danh liên tục để nhận thưởng lớn hơn.</p>
        </div>
      </div>

      <div className="card">
        {/* 7 Card Chiều Ngang Theo Đúng Yêu Cầu */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, minmax(85px, 1fr))',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}
        >
          {MILESTONES.map((m, idx) => {
            const isCompleted = status.can_claim
              ? idx < todayMilestoneIndex
              : idx <= todayMilestoneIndex;
            const isToday = status.can_claim && idx === todayMilestoneIndex;

            return (
              <div
                key={m.day}
                className={`dy ${isCompleted ? 'ok' : ''}`}
                style={
                  isToday
                    ? {
                        borderColor: 'var(--pri)',
                        boxShadow: '0 0 0 2px var(--pri), 0 8px 24px rgba(47,123,255,0.22)',
                        transform: 'translateY(-2px)',
                      }
                    : undefined
                }
              >
                <small style={{ fontSize: '11px', color: 'var(--mute)', fontWeight: 600 }}>
                  Ngày {m.day}
                </small>
                <b style={{ fontSize: '14px', fontWeight: 800 }}>+{m.reward}</b>
                <svg className="i" style={{ width: '22px', height: '22px', marginTop: '4px' }}>
                  <use href={isCompleted ? '#check' : m.day === 7 ? '#crown' : '#coin'} />
                </svg>
              </div>
            );
          })}
        </div>

        {/* Nút Nhận Thưởng & Thông Tin Streak */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <button
              className="btn"
              id="dc"
              disabled={!status.can_claim || claiming}
              onClick={claim}
              style={{
                cursor: !status.can_claim || claiming ? 'not-allowed' : 'pointer',
                opacity: !status.can_claim ? 0.65 : 1,
              }}
            >
              {claiming
                ? 'Đang nhận quà...'
                : status.can_claim
                ? 'Điểm danh hôm nay'
                : 'Hôm nay bạn đã điểm danh'}
            </button>
          </div>

          <p style={{ color: 'var(--mute)', fontSize: '13px', margin: 0, lineHeight: 1.5 }}>
            Chuỗi điểm danh hiện tại:{' '}
            <b style={{ color: 'var(--ink)' }}>{status.streak_days} ngày</b>. Bỏ lỡ một ngày sẽ bị
            làm mới chuỗi về Ngày 1.
          </p>
        </div>
      </div>
    </div>
  );
}

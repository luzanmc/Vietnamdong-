import React, { useEffect, useState, useRef } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playWheelTick, playWinFanfare, playCoinSound } from '../utils/sound.js';
import type { SpinStatus, SpinSegment } from '../types.js';
import {
  IconSparkles,
  IconClock,
  IconTrophy,
  IconGift,
  IconArrowRight,
  IconRefresh,
} from '@tabler/icons-react';

const DEFAULT_SEGMENTS: SpinSegment[] = [
  { label: '50 VNC', reward: 50, weight: 10, color: '#5ab8ff' },
  { label: '100 VNC', reward: 100, weight: 15, color: '#2f7bff' },
  { label: '0 VNC', reward: 0, weight: 30, color: '#7dd3fc' },
  { label: '200 VNC', reward: 200, weight: 12, color: '#4b6bff' },
  { label: '500 VNC', reward: 500, weight: 8, color: '#5ab8ff' },
  { label: '100 VNC', reward: 100, weight: 15, color: '#2f7bff' },
  { label: '20 VNC', reward: 20, weight: 20, color: '#7dd3fc' },
  { label: '1000 VNC', reward: 1000, weight: 5, color: '#4b6bff' },
];

export default function LuckyWheel() {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [wonPrize, setWonPrize] = useState<{ reward: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wheelRef = useRef<HTMLDivElement>(null);
  const rotationRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    api.spinStatus().then(setStatus).catch(() => {});
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const segments: SpinSegment[] = status?.segments?.length ? status.segments : DEFAULT_SEGMENTS;
  const numSegments = segments.length;
  const segmentAngle = 360 / numSegments;

  async function doSpin() {
    if (!status?.can_spin || spinning) return;
    playClickSound();
    setSpinning(true);
    setError(null);
    setWonPrize(null);

    let currentAngle = rotationRef.current;
    let speed = 20;
    let lastTickAngle = currentAngle;
    let isDecelerating = false;
    let targetAngle = 0;
    let decelStartAngle = 0;
    let decelStartTime = 0;
    const DECEL_DURATION = 3500;

    let apiResult: { segmentIndex: number; reward: number } | null = null;
    let apiError: string | null = null;

    api.spin()
      .then((res) => {
        apiResult = res;
      })
      .catch((err) => {
        apiError = (err as ApiError).message || 'Đã có lỗi xảy ra';
      });

    const step = (now: number) => {
      if (Math.abs(currentAngle - lastTickAngle) >= segmentAngle) {
        playWheelTick(700 + Math.floor(Math.random() * 80));
        lastTickAngle = currentAngle;
      }

      if (!isDecelerating) {
        currentAngle += speed;

        if (apiResult !== null || apiError !== null) {
          isDecelerating = true;
          decelStartAngle = currentAngle;
          decelStartTime = now;

          if (apiError) {
            targetAngle = currentAngle + 360 * 1.5;
          } else if (apiResult) {
            // Pointer is at top (0 deg / 12 o'clock). Each slice i spans [i*angle, (i+1)*angle]
            const sliceCenter = apiResult.segmentIndex * segmentAngle + segmentAngle / 2;
            const targetMod = (360 - sliceCenter + 360) % 360;
            const currentMod = currentAngle % 360;
            let diff = targetMod - currentMod;
            if (diff < 0) diff += 360;
            targetAngle = currentAngle + diff + 360 * 4; // 4 extra exciting spins
          }
        }
      } else {
        const elapsed = now - decelStartTime;
        const progress = Math.min(elapsed / DECEL_DURATION, 1);
        const ease = 1 - Math.pow(1 - progress, 3.2);
        currentAngle = decelStartAngle + (targetAngle - decelStartAngle) * ease;

        if (progress >= 1) {
          currentAngle = targetAngle;
          if (wheelRef.current) {
            wheelRef.current.style.transform = `rotate(${currentAngle}deg)`;
          }
          rotationRef.current = currentAngle;
          setRotation(currentAngle);
          setSpinning(false);

          if (apiError) {
            setError(apiError);
            toastError(apiError, 'Lỗi quay thưởng');
          } else if (apiResult) {
            setStatus((s) => (s ? { ...s, can_spin: false } : s));
            const wonSegment = segments[apiResult.segmentIndex] || {
              reward: apiResult.reward,
              label: `${apiResult.reward} VNC`,
            };
            setWonPrize({ reward: apiResult.reward, label: wonSegment.label });

            if (apiResult.reward > 0) {
              playWinFanfare();
              triggerConfetti();
              toastSuccess(`Chúc mừng bạn trúng +${apiResult.reward} VNC!`, 'Vòng quay may mắn');
            } else {
              playCoinSound();
              toastSuccess('Chúc bạn may mắn lần sau!', 'Vòng quay');
            }
            refresh();
          }
          return;
        }
      }

      if (wheelRef.current) {
        wheelRef.current.style.transform = `rotate(${currentAngle}deg)`;
      }
      animFrameRef.current = requestAnimationFrame(step);
    };

    animFrameRef.current = requestAnimationFrame(step);
  }

  if (!status) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6 text-center">
        <Skeleton className="h-8 w-48 mx-auto rounded-xl" />
        <Skeleton className="h-64 w-64 mx-auto rounded-full" />
        <Skeleton className="h-12 w-48 mx-auto rounded-xl" />
      </div>
    );
  }

  // Pre-generate conic background based on segments
  const conicColors = segments
    .map((seg, i) => {
      const c = seg.color || (i % 2 === 0 ? '#5ab8ff' : '#2f7bff');
      const startDeg = i * segmentAngle;
      const endDeg = (i + 1) * segmentAngle;
      return `${c} ${startDeg}deg ${endDeg}deg`;
    })
    .join(', ');

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      {/* Title & Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-400/15 text-amber-500 border border-amber-400/30">
          <IconSparkles size={14} />
          <span>Vòng quay may mắn hàng ngày</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
          Vòng quay may mắn
        </h1>
        <p className="text-muted text-xs sm:text-sm max-w-sm mx-auto">
          Mỗi ngày nhận 1 lượt quay miễn phí trúng thưởng VNC cực đã!
        </p>
      </div>

      {/* Main Wheel Card (matching VND-Dashboard .card) */}
      <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(47,123,255,0.08)] flex flex-col items-center">
        {/* Wheel Stage with Pointer */}
        <div className="relative w-[260px] h-[260px] sm:w-[280px] sm:h-[280px] my-2 flex items-center justify-center">
          {/* Top Pointer Pin (.pt from VND-Dashboard) */}
          <div className="pt-vnd" />

          {/* Conic Wheel Disc (.wd from VND-Dashboard) */}
          <div
            ref={wheelRef}
            className="wd-vnd overflow-hidden"
            style={{
              background: `conic-gradient(${conicColors})`,
              transform: `rotate(${rotation}deg)`,
              willChange: 'transform',
            }}
          >
            {segments.map((seg, idx) => {
              const rotationDeg = idx * segmentAngle + segmentAngle / 2;
              return (
                <span
                  key={idx}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${rotationDeg}deg) translateY(-92px)`,
                  }}
                  className="font-bold text-xs sm:text-sm tracking-tight text-white select-none pointer-events-none drop-shadow"
                >
                  {seg.reward > 0 ? `${seg.reward}` : '0'}
                </span>
              );
            })}
          </div>

          {/* Center Hub */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-14 h-14 rounded-full bg-surface border-4 border-white dark:border-slate-800 shadow-xl flex flex-col items-center justify-center">
              <CurrencyIcon size={18} />
              <span className="text-[9px] font-bold text-indigo tracking-wider">SPIN</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="text-xs text-rose-500 font-medium mt-3 text-center">
            {error}
          </div>
        )}

        {/* Spin Button */}
        <div className="text-center mt-6 w-full max-w-xs space-y-2">
          <button
            onClick={doSpin}
            disabled={!status.can_spin || spinning}
            className={`
              w-full py-3 px-6 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2
              ${
                status.can_spin && !spinning
                  ? 'bg-indigo hover:brightness-110 text-white shadow-[0_6px_20px_rgba(47,123,255,0.4)]'
                  : 'bg-surface2 text-muted border border-line cursor-not-allowed opacity-60'
              }
            `}
          >
            {spinning ? (
              <>
                <IconRefresh size={16} className="animate-spin" />
                <span>Đang quay thưởng...</span>
              </>
            ) : status.can_spin ? (
              <>
                <IconSparkles size={16} />
                <span>Quay ngay (1 lượt miễn phí)</span>
              </>
            ) : (
              <>
                <IconClock size={16} />
                <span>Đã quay hôm nay (0 lượt)</span>
              </>
            )}
          </button>

          {!status.can_spin && (
            <p className="text-[11px] text-muted">
              Lượt quay mới sẽ được cấp tự động sau 00:00 hằng ngày.
            </p>
          )}
        </div>
      </div>

      {/* Prize Modal Celebration */}
      {wonPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-line rounded-2xl p-6 sm:p-8 max-w-sm w-full text-center space-y-4 shadow-2xl relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-400/20 text-amber-500 flex items-center justify-center">
              <CurrencyIcon size={36} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-ink">
                {wonPrize.reward > 0 ? 'Chúc mừng bạn trúng thưởng!' : 'Chúc bạn may mắn lần sau!'}
              </h3>
              <div className="text-3xl font-extrabold text-amber-500 my-2 font-mono flex items-center justify-center gap-1">
                <span>+{wonPrize.reward}</span>
                <span className="text-base text-muted font-normal">VNC</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                {wonPrize.reward > 0
                  ? 'Phần thưởng VNC đã được tự động cộng vào số dư ví của bạn.'
                  : 'Đừng buồn nhé, hãy quay lại vào ngày mai để thử vận may tiếp!'}
              </p>
            </div>

            <button
              onClick={() => {
                playClickSound();
                setWonPrize(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo text-white font-bold text-xs hover:brightness-110 shadow-sm transition active:scale-95"
            >
              Tuyệt vời, nhận ngay!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

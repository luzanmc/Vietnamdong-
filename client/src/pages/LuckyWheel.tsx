import { useEffect, useState, useRef } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playWheelTick, playWinFanfare, playCoinSound } from '../utils/sound.js';
import type { SpinStatus, SpinSegment } from '../types.js';

const SLICE_COLORS = ['#6366F1', '#06B6D4', '#F59E0B', '#EC4899', '#10B981', '#8B5CF6'];

export default function LuckyWheel() {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [wonPrize, setWonPrize] = useState<{ reward: number; label: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    api.spinStatus().then(setStatus).catch(() => {});
  }, []);

  const segments: SpinSegment[] = status?.segments?.length
    ? status.segments
    : [
        { label: '0 VNC', reward: 0, weight: 30, color: '#242430' },
        { label: '1 VNC', reward: 1, weight: 28, color: '#6C63F5' },
        { label: '2 VNC', reward: 2, weight: 20, color: '#22D3EE' },
        { label: '5 VNC', reward: 5, weight: 12, color: '#F5A524' },
        { label: '10 VNC', reward: 10, weight: 7, color: '#FB6A8A' },
        { label: '50 VNC', reward: 50, weight: 3, color: '#F5A524' },
      ];

  const numSegments = segments.length;
  const segmentAngle = 360 / numSegments;

  async function doSpin() {
    if (!status?.can_spin || spinning) return;
    playClickSound();
    setSpinning(true);
    setError(null);
    setWonPrize(null);

    // Audio ticking simulation that decelerates
    let tickCount = 0;
    const totalTicks = 42;
    function scheduleNextTick() {
      if (tickCount >= totalTicks) return;
      playWheelTick(700 + (tickCount % 4) * 50);
      tickCount++;
      const progress = tickCount / totalTicks;
      const delay = 40 + Math.pow(progress, 2.5) * 360; // slows down from 40ms to 400ms
      tickIntervalRef.current = window.setTimeout(scheduleNextTick, delay);
    }
    scheduleNextTick();

    try {
      const res = await api.spin();
      // Calculate rotation so chosen segment rests at top (pointer at 0 deg)
      // Top position is -90 deg from 0 deg standard circle, so segmentIndex must align
      const fullRotations = 360 * 5;
      const sliceCenter = res.segmentIndex * segmentAngle + segmentAngle / 2;
      const landingAngle = fullRotations + (360 - sliceCenter);

      setRotation((prev) => prev + landingAngle);

      setTimeout(async () => {
        if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current);
        setSpinning(false);
        setStatus((s) => (s ? { ...s, can_spin: false } : s));

        const wonSegment = segments[res.segmentIndex] || { reward: res.reward, label: `${res.reward} VNC` };
        setWonPrize({ reward: res.reward, label: wonSegment.label });

        if (res.reward > 0) {
          playWinFanfare();
          triggerConfetti();
          toastSuccess(`Chúc mừng bạn nhận được ${res.reward} VNC!`, 'Vòng quay may mắn');
        } else {
          playCoinSound();
          toastSuccess('Chúc bạn may mắn lần sau!', 'Vòng quay');
        }

        await refresh();
      }, 4200);
    } catch (err) {
      if (tickIntervalRef.current) clearTimeout(tickIntervalRef.current);
      setSpinning(false);
      const msg = (err as ApiError).message;
      setError(msg);
      toastError(msg, 'Lỗi quay');
    }
  }

  if (!status) {
    return (
      <div className="max-w-md mx-auto py-10 space-y-6">
        <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
        <Skeleton className="h-80 w-80 mx-auto rounded-full" />
        <Skeleton className="h-12 w-48 mx-auto rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-4 text-center">
      {/* Title */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber/15 text-amber border border-amber/30 mb-2">
          <i className="bi bi-stars" />
          <span>Vòng quay may mắn hàng ngày</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center justify-center gap-2">
          {t('spin.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 max-w-sm mx-auto">
          Mỗi ngày nhận 1 lượt quay miễn phí trúng tới <span className="text-amber font-bold">50 VNC</span>!
        </p>
      </div>

      {/* Wheel Stage */}
      <div className="relative w-80 h-80 sm:w-96 sm:h-96 mx-auto mb-8 flex items-center justify-center">
        {/* Glowing backdrop halo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-indigo/25 via-amber/20 to-cyan/25 blur-2xl -z-10 pointer-events-none animate-pulse-soft" />

        {/* Pointer Pin (at the top, pointing down into the rim) */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-gradient-to-b from-amber to-amber-600 shadow-[0_0_15px_rgba(245,165,36,0.8)] border-2 border-white flex items-center justify-center">
            <div className="w-2.5 h-2.5 rounded-full bg-white shadow-inner" />
          </div>
          <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] border-t-amber -mt-1 drop-shadow-md" />
        </div>

        {/* Outer Ring with LED Bulbs */}
        <div className="absolute inset-0 rounded-full p-2 border-4 border-amber/60 bg-gradient-to-b from-surface to-surface2 shadow-[0_0_35px_rgba(0,0,0,0.5)] flex items-center justify-center">
          {/* 12 LED Dots along rim */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (360 / 12) * i;
            return (
              <div
                key={i}
                className="absolute w-2.5 h-2.5 rounded-full border border-white/60 shadow-sm transition-all"
                style={{
                  top: `calc(50% - 4px + ${Math.sin((angle * Math.PI) / 180) * 47}%)`,
                  left: `calc(50% - 4px + ${Math.cos((angle * Math.PI) / 180) * 47}%)`,
                  backgroundColor: i % 2 === 0 ? '#F5A524' : '#22D3EE',
                  boxShadow: spinning
                    ? '0 0 10px #F5A524, 0 0 5px #fff'
                    : '0 0 4px rgba(255,255,255,0.6)',
                }}
              />
            );
          })}

          {/* Rotating Wheel Canvas / SVG */}
          <div
            className="w-full h-full rounded-full overflow-hidden shadow-inner"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning
                ? 'transform 4.2s cubic-bezier(0.12, 0.8, 0.28, 1)'
                : 'transform 0.4s ease-out',
            }}
          >
            <svg viewBox="0 0 400 400" className="w-full h-full select-none">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor="#000" floodOpacity="0.5" />
                </filter>
              </defs>

              {segments.map((seg, i) => {
                const startAngle = i * segmentAngle - 90;
                const endAngle = (i + 1) * segmentAngle - 90;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 200 + 195 * Math.cos(startRad);
                const y1 = 200 + 195 * Math.sin(startRad);
                const x2 = 200 + 195 * Math.cos(endRad);
                const y2 = 200 + 195 * Math.sin(endRad);

                const textAngle = startAngle + segmentAngle / 2;
                const textRad = (textAngle * Math.PI) / 180;
                const textX = 200 + 130 * Math.cos(textRad);
                const textY = 200 + 130 * Math.sin(textRad);

                const fillColor = seg.color || SLICE_COLORS[i % SLICE_COLORS.length];

                return (
                  <g key={i}>
                    {/* Slice Wedge */}
                    <path
                      d={`M 200 200 L ${x1} ${y1} A 195 195 0 0 1 ${x2} ${y2} Z`}
                      fill={fillColor}
                      stroke="rgba(255,255,255,0.25)"
                      strokeWidth="2.5"
                    />

                    {/* Slice Label & Icon */}
                    <g
                      transform={`translate(${textX}, ${textY}) rotate(${textAngle + 90})`}
                      textAnchor="middle"
                      filter="url(#shadow)"
                    >
                      <text
                        fill="#FFFFFF"
                        fontSize={seg.reward >= 50 ? '22' : '17'}
                        fontWeight="bold"
                        fontFamily="Space Grotesk, sans-serif"
                        dy="0"
                      >
                        {seg.reward > 0 ? `+${seg.reward}` : '0'}
                      </text>
                      <text
                        fill="#FEE2E2"
                        fontSize="11"
                        fontWeight="600"
                        fontFamily="Inter, sans-serif"
                        dy="14"
                        opacity="0.9"
                      >
                        VNC
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Center Metallic Spin Hub */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-surface to-surface2 border-4 border-amber shadow-2xl flex flex-col items-center justify-center shrink-0">
            <CurrencyIcon size={24} />
            <span className="text-[10px] font-mono font-bold text-amber mt-0.5">SPIN</span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {error && <div className="max-w-sm mx-auto mb-4 text-xs text-rose">{error}</div>}

      {/* Action Button */}
      <div className="max-w-xs mx-auto">
        <button
          onClick={doSpin}
          disabled={!status.can_spin || spinning}
          className={`w-full py-3.5 px-6 rounded-2xl font-display font-bold text-base transition-all btn-press shadow-xl flex items-center justify-center gap-2 ${
            status.can_spin && !spinning
              ? 'bg-gradient-to-r from-amber-500 via-amber to-amber-600 hover:brightness-110 text-black shadow-amber/30 hover:shadow-[0_0_30px_rgba(245,165,36,0.6)]'
              : 'bg-surface2 text-muted border border-line cursor-not-allowed opacity-60'
          }`}
        >
          {spinning ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin text-lg" />
              <span>Đang quay thưởng...</span>
            </>
          ) : status.can_spin ? (
            <>
              <i className="bi bi-play-circle-fill text-lg" />
              <span>{t('spin.spin_button')} (Miễn phí)</span>
            </>
          ) : (
            <>
              <i className="bi bi-clock-history text-lg" />
              <span>Đã quay hôm nay</span>
            </>
          )}
        </button>
        {!status.can_spin && (
          <p className="text-[11px] text-muted mt-2">
            Lượt quay sẽ được làm mới vào lúc 00:00 ngày mai.
          </p>
        )}
      </div>

      {/* Won Prize Celebration Modal */}
      {wonPrize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-md animate-slide-in">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-sm w-full border border-amber/40 shadow-2xl text-center relative overflow-hidden">
            {/* Ambient gold glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber/20 rounded-full blur-2xl -z-10 pointer-events-none" />

            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber/20 border border-amber/40 flex items-center justify-center mb-4 animate-bounce-subtle">
                <CurrencyIcon size={36} />
              </div>

              <h3 className="font-display text-xl font-bold text-ink">
                {wonPrize.reward > 0 ? 'Chúc mừng bạn trúng thưởng!' : 'Chúc may mắn lần sau!'}
              </h3>

              <div className="font-mono text-3xl font-extrabold text-amber my-3 flex items-center justify-center gap-2">
                <span>+{wonPrize.reward}</span>
                <span className="text-lg font-body font-normal text-muted">VNC</span>
              </div>

              <p className="text-xs text-muted leading-relaxed mb-6">
                {wonPrize.reward > 0
                  ? 'Phần thưởng VNC đã được cộng trực tiếp vào ví của bạn.'
                  : 'Đừng buồn, hãy quay lại vào ngày mai để thử lại vận may nhé!'}
              </p>

              <button
                onClick={() => {
                  playClickSound();
                  setWonPrize(null);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo to-indigo/90 hover:brightness-110 text-white font-semibold text-sm transition btn-press shadow-md"
              >
                Tuyệt vời, cảm ơn!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

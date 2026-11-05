import { useEffect, useState, useRef } from 'react';
import { api, type ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playWheelTick, playWinFanfare, playCoinSound } from '../utils/sound.js';
import type { SpinStatus, SpinSegment } from '../types.js';

const DEFAULT_SEGMENTS: SpinSegment[] = [
  { label: '50 VNC', reward: 50, weight: 10, color: '#5ab8ff' },
  { label: '100 VNC', reward: 100, weight: 10, color: '#2f7bff' },
  { label: '0 VNC', reward: 0, weight: 20, color: '#7dd3fc' },
  { label: '200 VNC', reward: 200, weight: 10, color: '#4b6bff' },
  { label: '500 VNC', reward: 500, weight: 5, color: '#5ab8ff' },
  { label: '100 VNC', reward: 100, weight: 10, color: '#2f7bff' },
  { label: '20 VNC', reward: 20, weight: 20, color: '#7dd3fc' },
  { label: '1000 VNC', reward: 1000, weight: 5, color: '#4b6bff' },
];

export default function LuckyWheel() {
  const { refresh } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();

  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const tickIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    api.spinStatus().then(setStatus).catch(() => {});
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
  }, []);

  const segments: SpinSegment[] =
    status?.segments && status.segments.length > 0 ? status.segments : DEFAULT_SEGMENTS;

  async function handleSpin() {
    if (!status?.can_spin || spinning) return;
    playClickSound();
    setSpinning(true);

    try {
      const res = await api.spin();
      const numSegs = segments.length;
      const sliceAngle = 360 / numSegs;
      const targetIndex =
        res.segmentIndex >= 0 && res.segmentIndex < numSegs ? res.segmentIndex : 0;
      const centerAngle = targetIndex * sliceAngle + sliceAngle / 2;

      // Calculate destination angle to align slice with top pointer pin
      const cur = rotation % 360;
      const delta = ((360 - centerAngle - cur) % 360 + 360) % 360;
      const newRotation = rotation + 1800 + delta;

      setRotation(newRotation);

      // Play tick audio effects during spin
      let ticks = 0;
      tickIntervalRef.current = window.setInterval(() => {
        playWheelTick();
        ticks++;
        if (ticks >= 25 && tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
      }, 130);

      // Spin duration is 3.5s based on CSS cubic-bezier
      setTimeout(() => {
        setSpinning(false);
        setStatus((prev) => (prev ? { ...prev, can_spin: false } : prev));
        refresh();

        if (res.reward > 0) {
          playWinFanfare();
          triggerConfetti();
          toastSuccess(`Bạn trúng +${res.reward.toLocaleString('vi-VN')} VNC!`, 'Vòng quay may mắn');
        } else {
          playCoinSound();
          toastSuccess('Chúc bạn may mắn lần sau!', 'Vòng quay');
        }
      }, 3600);
    } catch (err) {
      setSpinning(false);
      const msg = (err as ApiError).message || 'Không thể quay thưởng';
      toastError(msg, 'Lỗi vòng quay');
    }
  }

  if (!status) {
    return (
      <div className="pg" style={{ maxWidth: '480px', margin: '40px auto', textAlign: 'center' }}>
        <Skeleton className="h-8 w-48 mx-auto rounded-lg" />
        <Skeleton className="h-60 w-60 mx-auto rounded-full my-6" />
        <Skeleton className="h-10 w-36 mx-auto rounded-xl" />
      </div>
    );
  }

  return (
    <div className="pg">
      <div className="hd">
        <div>
          <h2>Vòng quay may mắn</h2>
          <p>Mỗi ngày có lượt quay miễn phí.</p>
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div className="wheel">
          <div
            className="wd"
            id="wd"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          >
            {segments.map((seg, i) => {
              const sliceAngle = 360 / segments.length;
              const centerAngle = i * sliceAngle + sliceAngle / 2;
              return (
                <span
                  key={i}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${centerAngle}deg) translateY(-84px)`,
                  }}
                >
                  {seg.reward}
                </span>
              );
            })}
          </div>
          <i className="pt" />
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            className="btn"
            id="spin"
            disabled={!status?.can_spin || spinning}
            onClick={handleSpin}
            style={{ margin: '0 auto' }}
          >
            {spinning
              ? 'Đang quay...'
              : status?.can_spin
              ? 'Quay ngay (1 lượt)'
              : 'Hết lượt quay hôm nay'}
          </button>
        </div>
      </div>
    </div>
  );
}

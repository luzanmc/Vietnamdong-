import { useEffect, useState, useRef } from 'react';
import { api, type ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playWheelTick, playWinFanfare, playCoinSound } from '../utils/sound.js';
import type { SpinStatus } from '../types.js';

// Exact 8 values from VND-Dashboard.html: const W = [50, 100, 0, 200, 500, 100, 20, 1000]
const W = [50, 100, 0, 200, 500, 100, 20, 1000];

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

  async function handleSpin() {
    if (!status?.can_spin || spinning) return;
    playClickSound();
    setSpinning(true);

    try {
      const res = await api.spin();
      const targetIndex =
        res.segmentIndex >= 0 && res.segmentIndex < W.length ? res.segmentIndex : 0;

      // Exact rotation math from VND-Dashboard.html:
      // const c = i * 45 + 22.5, cur = (S.rot || 0) % 360, dl = ((360 - c) - cur + 720) % 360;
      // S.rot = (S.rot || 0) + 1800 + dl;
      const c = targetIndex * 45 + 22.5;
      const cur = rotation % 360;
      const dl = ((360 - c) - cur + 720) % 360;
      const newRotation = rotation + 1800 + dl;

      setRotation(newRotation);

      // Audio ticks
      let ticks = 0;
      tickIntervalRef.current = window.setInterval(() => {
        playWheelTick();
        ticks++;
        if (ticks >= 25 && tickIntervalRef.current) {
          clearInterval(tickIntervalRef.current);
          tickIntervalRef.current = null;
        }
      }, 130);

      // Spin completes after 3.5s transition
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
            {W.map((v, i) => (
              <span
                key={i}
                style={{
                  transform: `translate(-50%, -50%) rotate(${i * 45 + 22.5}deg) translateY(-84px)`,
                }}
              >
                {v}
              </span>
            ))}
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

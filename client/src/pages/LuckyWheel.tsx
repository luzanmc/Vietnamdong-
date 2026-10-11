import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { SpinStatus } from '../types.js';

export default function LuckyWheel() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<SpinStatus | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.spinStatus().then(setStatus);
  }, []);

  const segments = status?.segments ?? [];
  const segmentAngle = segments.length ? 360 / segments.length : 0;

  const gradient = segments
    .map((s, i) => `${s.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`)
    .join(', ');

  async function doSpin() {
    if (!status?.can_spin || spinning) return;
    setSpinning(true);
    setError(null);
    setResult(null);
    try {
      const r = await api.spin();
      const targetAngle = 360 * 5 + (360 - (r.segmentIndex * segmentAngle + segmentAngle / 2));
      setRotation((prev) => prev + targetAngle);
      setTimeout(() => {
        setResult(r.reward);
        setSpinning(false);
        setStatus((s) => (s ? { ...s, can_spin: false } : s));
      }, 4000);
    } catch (err) {
      setError((err as ApiError).message);
      setSpinning(false);
    }
  }

  if (!status) {
    return <Skeleton className="h-80 w-full max-w-sm mx-auto rounded-full" />;
  }

  return (
    <div className="max-w-sm mx-auto text-center">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center justify-center gap-2">
        <i className="bi bi-stars text-amber" /> {t('spin.title')}
      </h1>

      <div className="relative w-64 h-64 mx-auto mb-6">
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-amber" />
        <div
          className="w-64 h-64 rounded-full border-4 border-line"
          style={{
            background: `conic-gradient(${gradient})`,
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.35, 1)' : 'none',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-surface border-2 border-line flex items-center justify-center">
            <i className="bi bi-gift text-amber" />
          </div>
        </div>
      </div>

      {result !== null && <p className="text-sm text-cyan mb-3">{t('spin.result', { reward: result })}</p>}
      {error && <p className="text-sm text-rose mb-3">{error}</p>}

      <button
        onClick={doSpin}
        disabled={!status.can_spin || spinning}
        className="bg-indigo hover:brightness-110 disabled:opacity-40 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
      >
        {status.can_spin ? (spinning ? t('spin.spinning') : t('spin.spin_button')) : t('spin.already_spun')}
      </button>
    </div>
  );
}

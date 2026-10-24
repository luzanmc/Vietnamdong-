import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext.js';
import { api } from '../api/client.js';

export default function Maintenance() {
  const { maintenanceMessage, maintenanceEta } = useSettings();
  const navigate = useNavigate();

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    if (!maintenanceEta) {
      setTimeLeft(null);
      return;
    }

    function calculate() {
      const diff = new Date(maintenanceEta!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      setTimeLeft({ days, hours, minutes, seconds });
    }

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [maintenanceEta]);

  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const d = await api.publicSettings();
        if (!d.maintenance) {
          window.location.href = '/';
        }
      } catch {}
    }, 6000);

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="min-h-screen bg-[#08090c] text-ink flex flex-col items-center justify-between p-4 sm:p-6 select-none relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md pt-4 flex items-center justify-center gap-2 relative z-10">
        <div className="w-8 h-8 rounded-xl bg-indigo/20 border border-indigo/40 flex items-center justify-center shadow-lg">
          <i className="bi bi-shield-shaded text-indigo text-lg" />
        </div>
        <span className="font-display font-bold text-base sm:text-lg tracking-wide bg-gradient-to-r from-ink via-indigo/80 to-muted bg-clip-text text-transparent">
          VIETNAMDONG
        </span>
      </div>

      <div className="w-full max-w-lg my-auto py-8 px-4 sm:px-8 bg-surface/80 border border-line rounded-3xl backdrop-blur-xl shadow-2xl text-center space-y-6 relative z-10">
        <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-amber/15 border border-amber/30 flex items-center justify-center shadow-inner">
          <i className="bi bi-cone-striped text-3xl sm:text-4xl text-amber animate-pulse-soft" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber/15 border border-amber/30 text-amber text-[11px] font-semibold tracking-wider uppercase">
            <i className="bi bi-tools text-xs" />
            <span>Chế độ bảo trì hệ thống</span>
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-ink">
            Hệ Thống Đang Nâng Cấp
          </h1>
          <p className="text-xs sm:text-sm text-muted leading-relaxed max-w-md mx-auto whitespace-pre-line">
            {maintenanceMessage ||
              'Chúng tôi đang tiến hành bảo trì máy chủ để tối ưu hiệu năng và cập nhật tính năng mới. Vui lòng quay lại sau ít phút!'}
          </p>
        </div>

        {timeLeft && (
          <div className="pt-2 pb-1">
            <div className="text-[11px] uppercase tracking-wider text-muted font-medium mb-2.5 flex items-center justify-center gap-1.5">
              <i className="bi bi-clock-history text-amber" />
              <span>Dự kiến hoàn tất sau</span>
            </div>
            <div className="grid grid-cols-4 gap-2 max-w-xs mx-auto">
              <div className="bg-surface2/90 border border-line rounded-xl p-2 text-center">
                <span className="font-mono text-lg sm:text-xl font-bold text-ink block leading-none">
                  {String(timeLeft.days).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-muted block mt-1">Ngày</span>
              </div>
              <div className="bg-surface2/90 border border-line rounded-xl p-2 text-center">
                <span className="font-mono text-lg sm:text-xl font-bold text-ink block leading-none">
                  {String(timeLeft.hours).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-muted block mt-1">Giờ</span>
              </div>
              <div className="bg-surface2/90 border border-line rounded-xl p-2 text-center">
                <span className="font-mono text-lg sm:text-xl font-bold text-ink block leading-none">
                  {String(timeLeft.minutes).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-muted block mt-1">Phút</span>
              </div>
              <div className="bg-surface2/90 border border-line rounded-xl p-2 text-center">
                <span className="font-mono text-lg sm:text-xl font-bold text-amber block leading-none">
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
                <span className="text-[9px] text-muted block mt-1">Giây</span>
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 text-[11px] text-muted flex items-center justify-center gap-2">
          <i className="bi bi-arrow-repeat animate-spin text-xs" />
          <span>Trang web sẽ tự động mở lại ngay khi bảo trì kết thúc</span>
        </div>
      </div>

      <div className="w-full max-w-md pb-4 text-center relative z-10">
        <button
          onClick={() => navigate('/login')}
          className="text-[11px] text-muted/70 hover:text-ink transition flex items-center justify-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg hover:bg-surface2"
        >
          <i className="bi bi-shield-lock" />
          <span>Đăng nhập quản trị</span>
        </button>
      </div>
    </div>
  );
}

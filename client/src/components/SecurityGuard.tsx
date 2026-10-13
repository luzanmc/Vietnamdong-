import { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function SecurityGuard() {
  const [isIncognito, setIsIncognito] = useState(false);
  const [isVpn, setIsVpn] = useState(false);
  const [checking, setChecking] = useState(true);

  async function detectIncognito(): Promise<boolean> {
    try {
      // Chromium storage quota test
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const { quota } = await navigator.storage.estimate();
        if (quota && quota < 130 * 1024 * 1024) {
          return true;
        }
      }

      // Safari check
      const isSafari = /constructor/i.test(String((window as any).HTMLElement)) ||
        (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!((window as any)['safari'] && (typeof (window as any)['safari'] !== 'undefined' && (window as any)['safari'].pushNotification)));
      if (isSafari) {
        try {
          (window as any).openDatabase(null as any, null as any, null as any, null as any);
        } catch (_) {
          return true;
        }
      }
    } catch {}
    return false;
  }

  async function runChecks() {
    setChecking(true);
    try {
      const incognito = await detectIncognito();
      setIsIncognito(incognito);

      // Check VPN via server API
      const net = await api.networkStatus().catch(() => ({ ip: '', isVpn: false }));
      setIsVpn(Boolean(net.isVpn));
    } catch {} finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    runChecks();
  }, []);

  if (!isIncognito && !isVpn) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fade-in-up">
      <div className="max-w-md w-full bg-surface border border-rose/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose/15 border border-rose/30 flex items-center justify-center text-rose shadow-lg">
          <i className="bi bi-shield-slash-fill text-3xl" />
        </div>

        <div className="space-y-2">
          <h2 className="font-display text-xl sm:text-2xl font-bold text-ink tracking-tight">
            Phát hiện {isVpn && isIncognito ? 'VPN & Ẩn danh' : isVpn ? 'Mạng VPN / Proxy' : 'Chế độ Ẩn danh'}
          </h2>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            VietnamDong không cho phép sử dụng VPN, Proxy hoặc trình duyệt ẩn danh (Incognito) nhằm đảm bảo sự công bằng và chống gian lận nhiệm vụ.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface2/80 border border-line text-left text-xs space-y-2.5">
          <div className="font-semibold text-ink flex items-center gap-1.5">
            <i className="bi bi-info-circle-fill text-cyan" /> Hướng dẫn khắc phục:
          </div>
          {isVpn && (
            <div className="flex items-start gap-2 text-muted">
              <i className="bi bi-check2 text-cyan shrink-0 mt-0.5" />
              <span>Tắt các phần mềm VPN, WARP (1.1.1.1), Fake IP hoặc Proxy đang chạy trên thiết bị của bạn.</span>
            </div>
          )}
          {isIncognito && (
            <div className="flex items-start gap-2 text-muted">
              <i className="bi bi-check2 text-cyan shrink-0 mt-0.5" />
              <span>Đóng tab ẩn danh và mở lại VietnamDong trong cửa sổ duyệt web thông thường.</span>
            </div>
          )}
        </div>

        <button
          onClick={runChecks}
          disabled={checking}
          className="w-full py-3 px-5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo to-cyan hover:brightness-110 shadow-lg shadow-indigo/25 transition btn-press flex items-center justify-center gap-2"
        >
          {checking ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin" />
              <span>Đang kiểm tra lại...</span>
            </>
          ) : (
            <>
              <i className="bi bi-arrow-clockwise text-base" />
              <span>Kiểm tra lại kết nối</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

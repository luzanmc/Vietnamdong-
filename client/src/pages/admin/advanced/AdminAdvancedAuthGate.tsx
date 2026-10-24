import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../components/Skeleton.js';

export default function AdminAdvancedAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionActive, setSessionActive] = useState<boolean | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);

  async function checkSession() {
    try {
      const res = await fetch('/api/admin/auth/status', { credentials: 'include' });
      const data = await res.json();
      setSessionActive(Boolean(data.advancedSessionActive));
    } catch {
      setSessionActive(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (!sessionActive) return;
    setTimeLeft(600);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setSessionActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionActive]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/advanced/auth/verify-totp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mã xác thực không hợp lệ');
      setTotpCode('');
      setSessionActive(true);
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-md mx-auto py-12 space-y-4">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  if (!sessionActive) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <form onSubmit={handleVerify} className="bg-surface border border-line rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose/15 border border-rose/30 flex items-center justify-center text-rose text-xl shrink-0">
              <i className="bi bi-shield-lock-fill" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Xác Thực Quản Lý Nâng Cao</h2>
              <p className="text-xs text-muted">Yêu cầu nhập lại mã TOTP (phiên hết hạn sau 10 phút)</p>
            </div>
          </div>

          <div className="p-3 bg-amber/10 border border-amber/30 rounded-xl text-xs text-amber leading-relaxed flex items-start gap-2">
            <i className="bi bi-info-circle-fill text-sm shrink-0 mt-0.5" />
            <span>
              Khu vực Quản lý nâng cao chứa các tác vụ nhạy cảm (Cơ sở dữ liệu, Đổi mật khẩu, Ban, Xóa tài khoản). Bạn cần nhập lại mã TOTP để xác thực danh tính.
            </span>
          </div>

          {error && (
            <div className="p-3 bg-rose/15 border border-rose/30 text-rose text-xs rounded-xl flex items-center gap-2">
              <i className="bi bi-exclamation-triangle" /> {error}
            </div>
          )}

          <div>
            <label className="text-[11px] text-muted block mb-1">Mã xác thực TOTP (6 chữ số)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2.5 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-rose"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/admin"
              className="px-4 py-2.5 rounded-xl border border-line text-xs font-medium text-muted hover:text-ink text-center flex-1"
            >
              ← Quay lại /admin
            </a>
            <button
              type="submit"
              disabled={submitting || totpCode.length !== 6}
              className="px-4 py-2.5 bg-gradient-to-r from-rose to-amber hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex-1 flex items-center justify-center gap-1.5"
            >
              {submitting && <i className="bi bi-arrow-repeat animate-spin" />}
              <span>Vào trang nâng cao</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs px-3 py-2 bg-rose/10 border border-rose/20 rounded-xl">
        <span className="flex items-center gap-1.5 text-rose font-medium">
          <i className="bi bi-shield-fill-exclamation" /> Đang trong phiên Quản trị nâng cao
        </span>
        <span className="font-mono text-amber font-bold">
          <i className="bi bi-stopwatch mr-1" /> Hết hạn sau: {timeFormatted}
        </span>
      </div>
      {children}
    </div>
  );
}

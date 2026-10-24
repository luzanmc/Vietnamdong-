import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface StatusResponse {
  loggedIn: boolean;
  hasTotp: boolean;
  sessionActive: boolean;
  advancedSessionActive: boolean;
  user?: {
    id: string;
    username: string;
    email: string | null;
    role: string;
  };
}

export default function AdminAuthGate({
  children,
  onSessionReady,
}: {
  children: React.ReactNode;
  onSessionReady?: () => void;
}) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [totpCode, setTotpCode] = useState('');
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function checkStatus() {
    try {
      const res = await fetch('/api/admin/auth/status', { credentials: 'include' });
      const data: StatusResponse = await res.json();
      setStatus(data);
      if (data.sessionActive && onSessionReady) {
        onSessionReady();
      }
    } catch {
      setStatus({ loggedIn: false, hasTotp: false, sessionActive: false, advancedSessionActive: false });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkStatus();
  }, []);

  async function handleSetupStart() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/setup-totp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi thiết lập TOTP');
      setSetupData(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEnableTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/enable-totp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mã xác thực không hợp lệ');
      setTotpCode('');
      setSetupData(null);
      await checkStatus();
    } catch (err: any) {
      setError(err.message || 'Lỗi kích hoạt TOTP');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyTotp(e: React.FormEvent) {
    e.preventDefault();
    if (!totpCode.trim()) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/auth/verify-totp', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: totpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mã xác thực không hợp lệ');
      setTotpCode('');
      await checkStatus();
    } catch (err: any) {
      setError(err.message || 'Lỗi xác thực TOTP');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-md mx-auto py-12">
        <Skeleton className="h-8 w-48 rounded-xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    );
  }

  if (!status?.loggedIn) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 text-center">
        <div className="w-12 h-12 rounded-2xl bg-rose/15 border border-rose/30 flex items-center justify-center mx-auto mb-3 text-rose text-xl">
          <i className="bi bi-shield-x" />
        </div>
        <h2 className="text-base font-semibold mb-1">Không có quyền truy cập</h2>
        <p className="text-xs text-muted mb-4">Bạn cần đăng nhập bằng tài khoản quản trị viên để tiếp tục.</p>
        <a href="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-indigo text-white rounded-xl">
          <i className="bi bi-box-arrow-in-right" /> Đăng nhập
        </a>
      </div>
    );
  }

  if (!status.hasTotp) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber/15 border border-amber/30 flex items-center justify-center text-amber text-lg">
              <i className="bi bi-shield-lock" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Thiết lập bảo mật 2 lớp (TOTP)</h2>
              <p className="text-[11px] text-muted">Bắt buộc đối với tất cả quản trị viên</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
              <i className="bi bi-exclamation-circle" /> {error}
            </div>
          )}

          {!setupData ? (
            <div className="space-y-3">
              <p className="text-xs text-muted leading-relaxed">
                Để bảo vệ quyền truy cập quản trị hệ thống, bạn cần bật xác thực TOTP qua ứng dụng Google Authenticator hoặc ứng dụng tương đương.
              </p>
              <button
                onClick={handleSetupStart}
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5"
              >
                <i className="bi bi-qr-code" /> Khởi tạo mã bí mật
              </button>
            </div>
          ) : (
            <form onSubmit={handleEnableTotp} className="space-y-3">
              <div className="p-3 bg-surface2 border border-line rounded-xl space-y-2 text-xs">
                <span className="text-muted block text-[11px]">Mã bí mật (Secret Key):</span>
                <span className="font-mono text-cyan font-bold break-all select-all block text-sm">{setupData.secret}</span>
                <span className="text-[10px] text-muted block">Nhập mã này vào Google Authenticator hoặc ứng dụng TOTP của bạn.</span>
              </div>

              <div>
                <label className="text-[11px] text-muted block mb-1">Mã xác thực gồm 6 chữ số</label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2.5 text-center font-mono text-lg tracking-widest uppercase focus:outline-none focus:border-indigo"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting || totpCode.length !== 6}
                className="w-full py-2.5 px-4 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-medium transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <i className="bi bi-check2-circle" /> Kích hoạt và tiếp tục
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (!status.sessionActive) {
    return (
      <div className="max-w-md mx-auto py-10 px-4">
        <form onSubmit={handleVerifyTotp} className="bg-surface border border-line rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo/15 border border-indigo/30 flex items-center justify-center text-indigo text-lg">
              <i className="bi bi-shield-lock" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Xác thực Quản trị viên</h2>
              <p className="text-[11px] text-muted">Nhập mã 6 chữ số từ ứng dụng TOTP</p>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
              <i className="bi bi-exclamation-triangle" /> {error}
            </div>
          )}

          <div>
            <label className="text-[11px] text-muted block mb-1.5">Mã xác thực TOTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoFocus
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2.5 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-indigo"
              required
            />
          </div>

          <div className="text-[11px] text-muted">
            <i className="bi bi-info-circle mr-1" /> Phiên quản trị sẽ tự động hết hạn sau 30 phút không hoạt động.
          </div>

          <button
            type="submit"
            disabled={submitting || totpCode.length !== 6}
            className="w-full py-2.5 px-4 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <i className="bi bi-key" /> Xác thực và vào Admin
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}

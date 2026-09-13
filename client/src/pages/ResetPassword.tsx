import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import Alert from '../components/Alert.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    setBusy(true);
    try {
      await api.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-surface to-surface2 border border-line rounded-2xl p-6">
        <div className="text-center mb-5">
          <img src="/logo-mark.png" alt="VietnamDong" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="font-display font-semibold text-lg">Đặt lại mật khẩu</h1>
        </div>

        {error && (
          <div className="mb-3">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {done ? (
          <Alert type="success">Mật khẩu đã được cập nhật, đang chuyển tới trang đăng nhập...</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu mới"
              required
              minLength={8}
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              required
              minLength={8}
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              {busy ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
            </button>
          </form>
        )}

        <p className="text-xs text-muted text-center mt-4">
          <Link to="/login" className="text-indigo hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

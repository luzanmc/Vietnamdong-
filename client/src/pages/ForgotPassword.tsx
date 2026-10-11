import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import Alert from '../components/Alert.js';
import TurnstileWidget from '../components/TurnstileWidget.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError('Vui lòng hoàn thành xác thực Captcha.');
      return;
    }

    setBusy(true);
    try {
      await api.forgotPassword({ email, captchaToken });
      setSent(true);
    } catch (e) {
      setError((e as ApiError).message);
      setCaptchaToken('');
      setCaptchaReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-gradient-to-b from-surface to-surface2 border border-line rounded-2xl p-6">
        <div className="text-center mb-5">
          <img src="/logo-mark.png" alt="VietnamDong" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="font-display font-semibold text-lg">Quên mật khẩu</h1>
          <p className="text-xs text-muted mt-1">Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu</p>
        </div>

        {error && (
          <div className="mb-3">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        {sent ? (
          <Alert type="success">Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới hộp thư của bạn.</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
            <TurnstileWidget onToken={setCaptchaToken} reset={captchaReset} />
            <button
              type="submit"
              disabled={busy}
              className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              {busy ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
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

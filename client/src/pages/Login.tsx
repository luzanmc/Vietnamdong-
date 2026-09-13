import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import Alert from '../components/Alert.js';
import TurnstileWidget from '../components/TurnstileWidget.js';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (resp: { credential: string }) => void }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type Mode = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (params.get('verified') === '1') setNotice('Email đã được xác thực thành công, mời bạn đăng nhập.');
    if (params.get('verified') === '0') setError('Liên kết xác thực email không hợp lệ hoặc đã hết hạn.');
    if (params.get('error') === 'oauth_failed') setError('Đăng nhập Discord thất bại, vui lòng thử lại.');
  }, [params]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          try {
            await api.loginGoogle(response.credential);
            await refresh();
            navigate('/dashboard');
          } catch {
            setError('Đăng nhập Google thất bại, vui lòng thử lại.');
          }
        },
      });
      const container = document.getElementById('googleLoginContainer');
      if (container) window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320, locale: 'vi' });
    };
    document.body.appendChild(script);
  }, [navigate, refresh]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setCaptchaToken('');
    setCaptchaReset((n) => n + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!captchaToken) {
      setError('Vui lòng hoàn thành xác thực Captcha.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        await api.login({ email, password, captchaToken });
      } else {
        await api.register({ username, email, password, captchaToken });
      }
      await refresh();
      navigate('/dashboard');
    } catch (e) {
      setError((e as ApiError).message);
      setCaptchaToken('');
      setCaptchaReset((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-gradient-to-b from-surface to-surface2 border border-line rounded-2xl p-6">
        <div className="text-center mb-5">
          <img src="/logo-mark.png" alt="VietnamDong" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="font-display font-semibold text-lg">
            {mode === 'login' ? 'Đăng nhập VietnamDong' : 'Tạo tài khoản VietnamDong'}
          </h1>
          <p className="text-xs text-muted mt-1">Kiếm Nova bằng cách hoàn thành nhiệm vụ rút gọn link</p>
        </div>

        {notice && (
          <div className="mb-3">
            <Alert type="success">{notice}</Alert>
          </div>
        )}
        {error && (
          <div className="mb-3">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        <a
          href="/api/auth/discord"
          className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:brightness-110 text-white text-sm font-medium py-2.5 rounded-lg mb-3 transition"
        >
          <i className="bi bi-discord" /> Đăng nhập bằng Discord
        </a>

        <div id="googleLoginContainer" className="flex justify-center mb-3" />
        {!GOOGLE_CLIENT_ID && (
          <p className="text-[11px] text-amber-500 mb-3 text-center">Chưa cấu hình VITE_GOOGLE_CLIENT_ID.</p>
        )}

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-line flex-1" />
          <span className="text-[11px] text-muted">hoặc dùng email</span>
          <div className="h-px bg-line flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Tên đăng nhập"
              required
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm"
          />
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu"
              required
              minLength={8}
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 pr-10 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              tabIndex={-1}
            >
              <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
            </button>
          </div>

          {mode === 'login' && (
            <div className="text-right">
              <Link to="/forgot-password" className="text-xs text-indigo hover:underline">
                Quên mật khẩu?
              </Link>
            </div>
          )}

          <TurnstileWidget onToken={setCaptchaToken} reset={captchaReset} />

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            {busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </form>

        <p className="text-xs text-muted text-center mt-4">
          {mode === 'login' ? (
            <>
              Chưa có tài khoản?{' '}
              <button onClick={() => switchMode('register')} className="text-indigo hover:underline">
                Đăng ký ngay
              </button>
            </>
          ) : (
            <>
              Đã có tài khoản?{' '}
              <button onClick={() => switchMode('login')} className="text-indigo hover:underline">
                Đăng nhập
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

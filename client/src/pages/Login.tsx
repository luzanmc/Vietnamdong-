import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import TurnstileWidget from '../components/TurnstileWidget.js';
import { playClickSound } from '../utils/sound.js';
import './Login.css';

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

function fmt(n: number) {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function Login() {
  const navigate = useNavigate();
  const { me, refresh } = useAuth();
  const { lang, toggle: toggleLang, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const [params] = useSearchParams();

  const [mode, setMode] = useState<Mode>(() =>
    window.location.pathname === '/register' || params.get('mode') === 'register' ? 'register' : 'login'
  );

  // Form inputs
  const [username, setUsername] = useState('');
  const [identifier, setIdentifier] = useState(''); // email or username for login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Captcha & States
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingRef] = useState(() => localStorage.getItem('vnd_pending_ref'));

  // Live balance simulation for VNC Card
  const [vncBalance, setVncBalance] = useState(128450);

  // Calculate password strength (0-4)
  const passwordStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) s++;
    if (/\d/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s || 1;
  })();

  // 1. Sync Document Title
  useEffect(() => {
    document.title = mode === 'login' ? 'VietnamDong - Đăng Nhập' : 'VietnamDong - Đăng Ký';
  }, [mode]);

  // 2. Redirect if already authenticated
  useEffect(() => {
    if (me) {
      navigate('/dashboard', { replace: true });
    }
  }, [me, navigate]);

  // 3. Handle query params
  useEffect(() => {
    const requestedMode = params.get('mode') || params.get('tab');
    if (requestedMode === 'register') {
      setMode('register');
    } else if (requestedMode === 'login') {
      setMode('login');
    }
  }, [params]);

  useEffect(() => {
    if (pendingRef) {
      setMode('register');
      setNotice(t('referral.claimed_notice', { ref: pendingRef }));
    }
  }, [pendingRef, t]);

  useEffect(() => {
    if (params.get('verified') === '1') setNotice(t('login.verified_ok'));
    if (params.get('verified') === '0') setError(t('login.verified_bad'));
    if (params.get('error') === 'oauth_failed') setError(t('login.discord_failed'));
  }, [params, t]);

  // 4. Live VNC Balance ticker animation
  useEffect(() => {
    const gains = [100, 300, 100, 1000, 300];
    const timer = setInterval(() => {
      setVncBalance((prev) => prev + gains[Math.floor(Math.random() * gains.length)]);
    }, 2600);
    return () => clearInterval(timer);
  }, []);

  // 5. Google Sign-In initialization
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
            setError(t('login.google_failed'));
          }
        },
      });
      const container = document.getElementById('googleLoginContainer');
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: 200,
          locale: lang,
        });
      }
    };
    document.body.appendChild(script);
  }, [navigate, refresh, lang, theme, t]);

  function switchMode(next: Mode) {
    playClickSound();
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setPasswordConfirm('');
    setAcceptedTerms(false);
    setCaptchaToken('');
    setCaptchaReset((n) => n + 1);
    try {
      window.history.replaceState(null, '', next === 'login' ? '/login' : '/register');
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    setError(null);

    if (mode === 'login') {
      if (!identifier.trim() || !password) {
        setError('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
        return;
      }
    } else {
      if (!username.trim() || !/^[A-Za-z0-9_]{3,20}$/.test(username)) {
        setError('Tên đăng nhập gồm 3–20 ký tự: chữ, số hoặc dấu gạch dưới.');
        return;
      }
      if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
        setError('Email chưa đúng định dạng.');
        return;
      }
      if (password.length < 8) {
        setError('Mật khẩu cần tối thiểu 8 ký tự.');
        return;
      }
      if (password !== passwordConfirm) {
        setError('Hai mật khẩu chưa khớp nhau.');
        return;
      }
      if (!acceptedTerms) {
        setError(t('login.terms_required') || 'Bạn cần đồng ý với điều khoản để tiếp tục.');
        return;
      }
    }

    if (!captchaToken) {
      setError(t('login.captcha_required') || 'Vui lòng hoàn thành xác thực Cloudflare Turnstile.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const result = await api.login({ email: identifier, password, captchaToken });
        if ('requires2fa' in result) {
          setPendingToken(result.pendingToken);
          setTwoFactorCode('');
          setPassword('');
          return;
        }
      } else {
        await api.register({ username, email, password, captchaToken, acceptedTerms });
        const ref = localStorage.getItem('vnd_pending_ref');
        if (ref) {
          await api.claimReferral(ref).catch(() => {});
          localStorage.removeItem('vnd_pending_ref');
        }
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

  async function handleTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    if (!pendingToken) return;
    setError(null);
    setBusy(true);
    try {
      await api.login2fa({ pendingToken, code: twoFactorCode });
      await refresh();
      navigate('/dashboard');
    } catch (err) {
      const apiErr = err as ApiError;
      setError(apiErr.message);
      setTwoFactorCode('');
      if (apiErr.status === 401 && /hết hạn/i.test(apiErr.message)) {
        setPendingToken(null);
        setCaptchaToken('');
        setCaptchaReset((n) => n + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  function cancelTwoFactor() {
    playClickSound();
    setPendingToken(null);
    setTwoFactorCode('');
    setError(null);
    setCaptchaToken('');
    setCaptchaReset((n) => n + 1);
  }

  // 2FA Modal View
  if (pendingToken) {
    return (
      <div className={`vnd-auth-page ${theme === 'light' ? 'light-mode' : ''}`} data-theme={theme}>
        <header className="topbar">
          <Link className="brand" to="/" onClick={playClickSound}>
            <span className="brand-mark">
              <img src="/logo-dark.png" alt="VietnamDong" className="brand-logo" />
            </span>
            <span>
              VIETNAMDONG
              <span className="brand-sub">VƯỢT LINK · KIẾM XU</span>
            </span>
          </Link>
          <div className="topbar-actions">
            <button
              onClick={() => { playClickSound(); toggleTheme(); }}
              aria-label="Toggle theme"
              className="btn-icon"
              title="Đổi giao diện Sáng/Tối"
            >
              <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
            </button>
            <Link className="btn" to="/" onClick={playClickSound}>
              <i className="bi bi-arrow-left" />
              <span>Về trang chủ</span>
            </Link>
          </div>
        </header>

        <main className="auth" style={{ minHeight: 'calc(100vh - 72px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="twofa-modal">
            <div className="twofa-icon">
              <i className="bi bi-shield-lock" />
            </div>
            <h1 style={{ fontSize: '22px' }}>{t('login.2fa_title') || 'Xác thực 2 bước (2FA)'}</h1>
            <p className="sub" style={{ fontSize: '13px', marginBottom: '20px' }}>
              {t('login.2fa_subtitle') || 'Nhập mã 6 chữ số từ ứng dụng xác thực (Google Authenticator) của bạn.'}
            </p>

            {error && (
              <div className="err-box error" style={{ marginBottom: '16px' }}>
                <i className="bi bi-exclamation-triangle-fill" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleTwoFactor}>
              <input
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                placeholder="000000"
                required
                className="twofa-input"
              />
              <button
                type="submit"
                disabled={busy || twoFactorCode.length !== 6}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '14px' }}
              >
                {busy ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle" />
                    <span>Xác nhận</span>
                  </>
                )}
              </button>
            </form>

            <p className="swap" style={{ marginTop: '20px' }}>
              <button onClick={cancelTwoFactor} type="button">
                Quay lại đăng nhập
              </button>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`vnd-auth-page ${theme === 'light' ? 'light-mode' : ''}`} data-theme={theme}>
      {/* Top Header Bar */}
      <header className="topbar">
        <Link className="brand" to="/" onClick={playClickSound}>
          <span className="brand-mark">
            <img src="/logo-dark.png" alt="VietnamDong" className="brand-logo" />
          </span>
          <span>
            VIETNAMDONG
            <span className="brand-sub">VƯỢT LINK · KIẾM XU</span>
          </span>
        </Link>

        <div className="topbar-actions">
          {/* Theme toggle */}
          <button
            onClick={() => { playClickSound(); toggleTheme(); }}
            aria-label="Toggle theme"
            className="btn-icon"
            title="Đổi giao diện Sáng/Tối"
          >
            <i className={`bi ${theme === 'dark' ? 'bi-sun-fill' : 'bi-moon-stars-fill'}`} />
          </button>

          {/* Language switch */}
          <button
            onClick={() => { playClickSound(); toggleLang(); }}
            aria-label="Switch language"
            className="btn-icon"
            title="Đổi ngôn ngữ VI/EN"
          >
            <span style={{ fontSize: '11px', fontWeight: 700 }}>{lang === 'vi' ? 'VI' : 'EN'}</span>
          </button>

          {/* Back to Home */}
          <Link className="btn" to="/" onClick={playClickSound}>
            <i className="bi bi-arrow-left" />
            <span className="hidden sm:inline">Về trang chủ</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="auth">
        {/* Left Side: VNC 3D Glass Card & Feature Points */}
        <aside className="side">
          <div className="art">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="glass-card">
              <div className="card-top">
                <span>VIETNAMDONG / VNC</span>
                <span className="live">
                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }} />
                  LIVE
                </span>
              </div>
              <div className="cube">
                V<span>NC</span>
              </div>
              <div className="card-bottom">
                <span>Ví Xu</span>
                <span>
                  0000<b id="bal">{fmt(vncBalance)}</b> Xu
                </span>
              </div>
            </div>
          </div>

          <h2>
            Vượt link, <span className="grad">kiếm Xu mỗi ngày</span>
          </h2>

          <ul className="points">
            <li>
              <span>
                <i className="bi bi-link-45deg" />
              </span>
              <span>Vượt link và nhận Xu ngay vào ví</span>
            </li>
            <li>
              <span>
                <i className="bi bi-cash-stack" />
              </span>
              <span>Rút tiền hoặc đổi thẻ cào linh hoạt</span>
            </li>
            <li>
              <span>
                <i className="bi bi-shield-check" />
              </span>
              <span>Bảo mật tài khoản, theo dõi minh bạch</span>
            </li>
          </ul>
        </aside>

        {/* Right Side: Auth Panel */}
        <section className="panel">
          {/* Mode Switch Tabs */}
          <div className="tabs" id="tabs" data-on={mode} role="tablist">
            <span className="ink" />
            <button
              type="button"
              className={`tab ${mode === 'login' ? 'on' : ''}`}
              onClick={() => switchMode('login')}
              role="tab"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              className={`tab ${mode === 'register' ? 'on' : ''}`}
              onClick={() => switchMode('register')}
              role="tab"
            >
              Đăng ký
            </button>
          </div>

          <h1>
            {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản miễn phí'}
          </h1>
          <p className="sub">
            {mode === 'login'
              ? 'Chào mừng quay trở lại, đăng nhập tài khoản để tiếp tục.'
              : 'Mất khoảng 30 giây, tạo tài khoản để sử dụng dịch vụ.'}
          </p>

          {/* Social OAuth Buttons */}
          <div className="social">
            <div id="googleLoginWrapper" style={{ position: 'relative', width: '100%' }}>
              <div id="googleLoginContainer" style={{ display: 'flex', justifyContent: 'center' }} />
              {!GOOGLE_CLIENT_ID && (
                <button
                  type="button"
                  className="btn"
                  style={{ width: '100%' }}
                  onClick={() => {
                    playClickSound();
                    setError('Chưa cấu hình Google Client ID trên hệ thống.');
                  }}
                >
                  <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                  </svg>
                  <span>Google</span>
                </button>
              )}
            </div>

            <a className="btn" href="/api/auth/discord" onClick={playClickSound}>
              <svg viewBox="0 0 24 24">
                <path fill="#5865F2" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              <span>Discord</span>
            </a>
          </div>

          <div className="or">hoặc dùng tài khoản</div>

          {/* Feedback Alerts */}
          {notice && (
            <div className="err-box success" style={{ marginBottom: '14px' }}>
              <i className="bi bi-check-circle-fill" />
              <span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="err-box error" style={{ marginBottom: '14px' }}>
              <i className="bi bi-exclamation-triangle-fill" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === 'login' ? (
            <form onSubmit={handleSubmit} noValidate>
              <label className="fld">
                <span>Email hoặc tên đăng nhập</span>
                <div className="inp">
                  <i className="bi bi-person" />
                  <input
                    name="id"
                    type="text"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="ban@example.com hoặc username"
                    required
                  />
                </div>
              </label>

              <label className="fld">
                <span>Mật khẩu</span>
                <div className="inp">
                  <i className="bi bi-lock" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="pw"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    required
                  />
                  <button
                    className="eye"
                    type="button"
                    onClick={() => { playClickSound(); setShowPassword((v) => !v); }}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </label>

              <div className="row">
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => { playClickSound(); setRememberMe(e.target.checked); }}
                  />
                  <span className="chk-box">
                    <svg viewBox="0 0 14 14">
                      <polyline points="2.5 7 5.5 10 11.5 3.5" />
                    </svg>
                  </span>
                  <span>Ghi nhớ đăng nhập</span>
                </label>

                <Link to="/forgot-password" onClick={playClickSound}>
                  Quên mật khẩu?
                </Link>
              </div>

              {/* Cloudflare Turnstile Verification */}
              <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
                <TurnstileWidget onToken={setCaptchaToken} reset={captchaReset} />
              </div>

              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Đang đăng nhập...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-arrow-in-right" />
                    <span>Đăng nhập</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* REGISTER FORM */
            <form onSubmit={handleSubmit} noValidate>
              <label className="fld">
                <span>Tên đăng nhập</span>
                <div className="inp">
                  <i className="bi bi-person" />
                  <input
                    name="user"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="VD: near_user99"
                    required
                  />
                </div>
              </label>

              <label className="fld">
                <span>Email</span>
                <div className="inp">
                  <i className="bi bi-envelope" />
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ban@example.com"
                    required
                  />
                </div>
              </label>

              <label className="fld">
                <span>Mật khẩu</span>
                <div className="inp">
                  <i className="bi bi-lock" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="pw"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    required
                  />
                  <button
                    className="eye"
                    type="button"
                    onClick={() => { playClickSound(); setShowPassword((v) => !v); }}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
                {/* Strength Meter Bar */}
                <div className="meter" data-s={passwordStrength}>
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
              </label>

              <label className="fld">
                <span>Nhập lại mật khẩu</span>
                <div className="inp">
                  <i className="bi bi-lock-fill" />
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    name="pw2"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                  />
                  <button
                    className="eye"
                    type="button"
                    onClick={() => { playClickSound(); setShowPasswordConfirm((v) => !v); }}
                    aria-label={showPasswordConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    tabIndex={-1}
                  >
                    <i className={`bi ${showPasswordConfirm ? 'bi-eye-slash' : 'bi-eye'}`} />
                  </button>
                </div>
              </label>

              <label className="chk">
                <input
                  type="checkbox"
                  name="tos"
                  checked={acceptedTerms}
                  onChange={(e) => { playClickSound(); setAcceptedTerms(e.target.checked); }}
                />
                <span className="chk-box">
                  <svg viewBox="0 0 14 14">
                    <polyline points="2.5 7 5.5 10 11.5 3.5" />
                  </svg>
                </span>
                <span>
                  Tôi đồng ý với{' '}
                  <Link to="/terms" target="_blank" onClick={(e) => e.stopPropagation()}>
                    Điều khoản dịch vụ
                  </Link>{' '}
                  và{' '}
                  <Link to="/privacy" target="_blank" onClick={(e) => e.stopPropagation()}>
                    Chính sách bảo mật
                  </Link>
                </span>
              </label>

              {/* Cloudflare Turnstile Verification */}
              <div style={{ marginTop: '2px', display: 'flex', justifyContent: 'center' }}>
                <TurnstileWidget onToken={setCaptchaToken} reset={captchaReset} />
              </div>

              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Đang tạo tài khoản...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-plus-fill" />
                    <span>Tạo tài khoản</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Switch Prompt */}
          <p className="swap">
            {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
            <button
              type="button"
              onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
            >
              {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
            </button>
          </p>
        </section>
      </main>
    </div>
  );
}

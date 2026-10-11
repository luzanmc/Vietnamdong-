import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import Alert from '../components/Alert.js';
import TurnstileWidget from '../components/TurnstileWidget.js';
import { playClickSound } from '../utils/sound.js';

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
  const { me, refresh } = useAuth();
  const { lang, toggle, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const [params] = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => (window.location.pathname === '/register' || params.get('mode') === 'register') ? 'register' : 'login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaReset, setCaptchaReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [pendingRef] = useState(() => localStorage.getItem('vnd_pending_ref'));

  useEffect(() => {
    if (me) {
      navigate('/dashboard', { replace: true });
    }
  }, [me, navigate]);

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
      if (container) window.google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320, locale: lang });
    };
    document.body.appendChild(script);
  }, [navigate, refresh, lang, t]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword('');
    setAcceptedTerms(false);
    setCaptchaToken('');
    setCaptchaReset((n) => n + 1);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === 'register' && !acceptedTerms) {
      setError(t('login.terms_required'));
      return;
    }
    if (!captchaToken) {
      setError(t('login.captcha_required'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'login') {
        const result = await api.login({ email, password, captchaToken });
        if ('requires2fa' in result) {
          setPendingToken(result.pendingToken);
          setTwoFactorCode('');
          setPassword('');
          return;
        }
      } else {
        await api.register({ username, email, password, captchaToken, acceptedTerms });
        const pendingRef = localStorage.getItem('vnd_pending_ref');
        if (pendingRef) {
          await api.claimReferral(pendingRef).catch(() => {});
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
    setPendingToken(null);
    setTwoFactorCode('');
    setError(null);
    setCaptchaToken('');
    setCaptchaReset((n) => n + 1);
  }

  if (pendingToken) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10 relative">
        <div className="w-full max-w-sm bg-gradient-to-b from-surface to-surface2 border border-line rounded-2xl p-6">
          <div className="text-center mb-5">
            <img src="/logo-mark.png" alt="VietnamDong" className="w-14 h-14 mx-auto mb-3" />
            <h1 className="font-display font-semibold text-lg">{t('login.2fa_title')}</h1>
            <p className="text-xs text-muted mt-1">{t('login.2fa_subtitle')}</p>
          </div>
          {error && (
            <div className="mb-3">
              <Alert type="error">{error}</Alert>
            </div>
          )}
          <form onSubmit={handleTwoFactor} className="space-y-3">
            <input
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              required
              className="w-full bg-surface2 border border-line rounded-lg px-3 py-3 text-center text-xl font-mono tracking-[0.5em]"
            />
            <button
              type="submit"
              disabled={busy || twoFactorCode.length !== 6}
              className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              {busy ? t('login.processing') : t('login.2fa_submit')}
            </button>
          </form>
          <p className="text-xs text-muted text-center mt-4">
            <button onClick={cancelTwoFactor} className="text-indigo hover:underline">
              {t('login.2fa_back')}
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo/15 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan/10 rounded-full blur-3xl -z-10 pointer-events-none" />

      <button
        onClick={() => {
          playClickSound();
          toggleTheme();
        }}
        aria-label="Toggle theme"
        className="absolute top-5 left-5 w-10 h-10 flex items-center justify-center rounded-xl text-muted hover:text-ink hover:bg-surface2 transition border border-line btn-press z-10"
      >
        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber' : 'bi-moon-stars-fill text-indigo'}`} />
      </button>

      <button
        onClick={() => {
          playClickSound();
          toggle();
        }}
        aria-label="Switch language"
        className="absolute top-5 right-5 flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition px-3 py-2 rounded-xl hover:bg-surface2 border border-line btn-press z-10"
      >
        <i className="bi bi-translate text-sm text-cyan" />
        <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
      </button>

      <div className="w-full max-w-md glass-panel rounded-3xl p-6 sm:p-8 border border-line shadow-2xl relative z-10">
        <div className="text-center mb-6">
          <Link to="/" onClick={playClickSound} className="inline-block group mb-3">
            <div className="relative inline-block">
              <img src="/logo-mark.png" alt="VietnamDong" className="w-14 h-14 mx-auto group-hover:scale-105 transition-transform" />
              <div className="absolute inset-0 rounded-full bg-indigo/25 blur-md -z-10" />
            </div>
          </Link>
          <h1 className="font-display font-bold text-xl sm:text-2xl text-ink">
            {mode === 'login' ? t('login.title') : t('login.register_title')}
          </h1>
          <p className="text-xs text-muted mt-1 max-w-xs mx-auto">{t('login.subtitle')}</p>
        </div>

        {/* Mode Switch Tabs */}
        <div className="grid grid-cols-2 p-1 bg-surface2/80 rounded-2xl border border-line mb-5">
          <button
            type="button"
            onClick={() => {
              playClickSound();
              switchMode('login');
            }}
            className={`py-2 rounded-xl text-xs font-bold transition btn-press ${
              mode === 'login' ? 'bg-indigo text-white shadow-md' : 'text-muted hover:text-ink'
            }`}
          >
            {t('login.submit_login')}
          </button>
          <button
            type="button"
            onClick={() => {
              playClickSound();
              switchMode('register');
            }}
            className={`py-2 rounded-xl text-xs font-bold transition btn-press ${
              mode === 'register' ? 'bg-indigo text-white shadow-md' : 'text-muted hover:text-ink'
            }`}
          >
            {t('login.submit_register')}
          </button>
        </div>

        {notice && (
          <div className="mb-4">
            <Alert type="success">{notice}</Alert>
          </div>
        )}
        {error && (
          <div className="mb-4">
            <Alert type="error">{error}</Alert>
          </div>
        )}

        <a
          href="/api/auth/discord"
          onClick={playClickSound}
          className="w-full flex items-center justify-center gap-2 bg-[#5865F2] hover:brightness-110 text-white text-xs sm:text-sm font-bold py-3 rounded-xl mb-3 transition shadow-md btn-press"
        >
          <i className="bi bi-discord text-base" /> {t('login.discord')}
        </a>

        <div id="googleLoginContainer" className="flex justify-center mb-3" />
        {!GOOGLE_CLIENT_ID && (
          <p className="text-[11px] text-amber-500 mb-3 text-center">{t('login.google_not_configured')}</p>
        )}

        <div className="flex items-center gap-3 my-4">
          <div className="h-px bg-line flex-1" />
          <span className="text-[11px] text-muted uppercase font-medium">{t('login.or_email')}</span>
          <div className="h-px bg-line flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">{t('login.username')}</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="VD: nguyenvan_a"
                required
                className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
              />
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tenban@gmail.com"
              required
              className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 text-sm text-ink focus:outline-none focus:border-indigo"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-muted">{t('login.password')}</label>
              {mode === 'login' && (
                <Link to="/forgot-password" onClick={playClickSound} className="text-xs text-indigo hover:underline">
                  {t('login.forgot')}
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full bg-surface2 border border-line rounded-xl px-4 py-2.5 pr-11 text-sm text-ink focus:outline-none focus:border-indigo"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition"
                tabIndex={-1}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`} />
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <label className="flex items-start gap-2 text-xs text-muted leading-relaxed cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-indigo"
              />
              <span>
                {t('login.accept_prefix')}{' '}
                <Link to="/terms" target="_blank" className="text-indigo hover:underline font-semibold">{t('footer.terms')}</Link>{' '}
                {t('login.accept_and')}{' '}
                <Link to="/privacy" target="_blank" className="text-indigo hover:underline font-semibold">{t('footer.privacy')}</Link>
              </span>
            </label>
          )}

          <div className="py-1">
            <TurnstileWidget onToken={setCaptchaToken} reset={captchaReset} />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-gradient-to-r from-indigo to-cyan hover:brightness-110 disabled:opacity-60 text-white text-sm font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo/20 btn-press flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" />
                <span>{t('login.processing')}</span>
              </>
            ) : mode === 'login' ? (
              t('login.submit_login')
            ) : (
              t('login.submit_register')
            )}
          </button>
        </form>

        {mode === 'login' && (
          <p className="text-[11px] text-muted text-center mt-5 leading-relaxed">
            {t('login.oauth_notice')}{' '}
            <Link to="/terms" target="_blank" className="text-indigo hover:underline">{t('footer.terms')}</Link>{' '}
            {t('login.accept_and')}{' '}
            <Link to="/privacy" target="_blank" className="text-indigo hover:underline">{t('footer.privacy')}</Link>
          </p>
        )}
      </div>
    </div>
  );
}

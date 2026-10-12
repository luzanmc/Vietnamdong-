import { useEffect, useState } from 'react';
import { api, ApiError, type TwoFactorSetup } from '../api/client.js';
import Alert from '../components/Alert.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';

type Msg = { type: 'success' | 'error'; text: string };

function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

export default function Security() {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadStatus() {
    try {
      const data = await api.twoFactorStatus();
      setEnabled(data.enabled);
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  function onCodeChange(value: string) {
    setCode(value.replace(/\D/g, '').slice(0, 6));
  }

  async function startSetup() {
    playClickSound();
    setBusy(true);
    setMsg(null);
    try {
      const data = await api.twoFactorSetup();
      setSetup(data);
      setCode('');
    } catch (err) {
      const errorText = (err as ApiError).message;
      setMsg({ type: 'error', text: errorText });
      toastError(errorText, 'Lỗi thiết lập 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    setBusy(true);
    setMsg(null);
    try {
      await api.twoFactorEnable(code);
      playCoinSound();
      setSetup(null);
      setCode('');
      setEnabled(true);
      const okText = t('security.enabled_ok');
      setMsg({ type: 'success', text: okText });
      toastSuccess(okText, 'Bảo mật 2FA');
    } catch (err) {
      const errorText = (err as ApiError).message;
      setMsg({ type: 'error', text: errorText });
      toastError(errorText, 'Lỗi bật 2FA');
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    playClickSound();
    setBusy(true);
    setMsg(null);
    try {
      await api.twoFactorDisable(code);
      setCode('');
      setEnabled(false);
      const okText = t('security.disabled_ok');
      setMsg({ type: 'success', text: okText });
      toastSuccess(okText, 'Bảo mật 2FA');
    } catch (err) {
      const errorText = (err as ApiError).message;
      setMsg({ type: 'error', text: errorText });
      toastError(errorText, 'Lỗi tắt 2FA');
    } finally {
      setBusy(false);
    }
  }

  function cancelSetup() {
    playClickSound();
    setSetup(null);
    setCode('');
    setMsg(null);
  }

  async function copySecret() {
    if (!setup) return;
    playClickSound();
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      toastSuccess('Đã chép mã bí mật!', 'Sao chép');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const codeInput = (
    <input
      value={code}
      onChange={(e) => onCodeChange(e.target.value)}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      required
      className="w-full bg-surface2 border border-line rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.4em] text-ink focus:outline-none focus:border-indigo"
    />
  );

  return (
    <div className="max-w-md mx-auto py-4 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
          <i className="bi bi-shield-check" />
          <span>Bảo vệ tài khoản</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-shield-lock-fill text-indigo" /> {t('security.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
          Kích hoạt xác thực 2 bước để ngăn chặn hoàn toàn nguy cơ mất tài khoản hoặc số dư VNC.
        </p>
      </div>

      {msg && (
        <div className="mb-4">
          <Alert type={msg.type}>{msg.text}</Alert>
        </div>
      )}

      <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-line shadow-xl space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-ink">{t('security.2fa_title')}</h2>
            <p className="text-xs text-muted mt-1 leading-relaxed">{t('security.2fa_desc')}</p>
          </div>
          {enabled === null ? (
            <Skeleton className="h-6 w-16 rounded-full" />
          ) : (
            <span
              className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${
                enabled
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                  : 'bg-surface2 border-line text-muted'
              }`}
            >
              {enabled ? t('security.status_on') : t('security.status_off')}
            </span>
          )}
        </div>

        {enabled === false && !setup && (
          <button
            onClick={startSetup}
            disabled={busy}
            className="w-full py-3.5 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-indigo to-cyan hover:brightness-110 disabled:opacity-60 text-white shadow-md transition btn-press flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" />
                <span>{t('login.processing')}</span>
              </>
            ) : (
              <span>{t('security.start_setup')}</span>
            )}
          </button>
        )}

        {enabled === false && setup && (
          <form onSubmit={enable} className="space-y-4 pt-2 border-t border-line/60">
            <div className="text-xs text-muted font-medium">{t('security.step_secret')}</div>
            <div className="bg-surface2 border border-line rounded-xl px-4 py-3 flex items-center justify-between gap-2">
              <span className="font-mono text-sm break-all select-all text-ink font-semibold">
                {formatSecret(setup.secret)}
              </span>
              <button
                type="button"
                onClick={copySecret}
                className="shrink-0 text-xs font-bold text-indigo hover:text-cyan transition"
              >
                {copied ? t('security.copied') : t('security.copy')}
              </button>
            </div>

            <a
              href={setup.otpauthUri}
              className="w-full flex items-center justify-center gap-2 border border-indigo/40 text-indigo hover:bg-indigo/10 text-xs sm:text-sm font-semibold py-2.5 rounded-xl transition btn-press"
            >
              <i className="bi bi-box-arrow-up-right" /> {t('security.open_app')}
            </a>

            <p className="text-[11px] text-muted leading-relaxed">{t('security.no_qr_note')}</p>

            <div className="text-xs text-muted font-medium pt-1">{t('security.step_code')}</div>
            {codeInput}

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={cancelSetup}
                className="py-3 rounded-xl border border-line text-muted hover:text-ink text-xs font-bold transition btn-press"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="py-3 rounded-xl bg-gradient-to-r from-indigo to-cyan hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition btn-press shadow-md"
              >
                {busy ? t('login.processing') : t('security.enable')}
              </button>
            </div>
          </form>
        )}

        {enabled === true && (
          <form onSubmit={disable} className="space-y-4 pt-2 border-t border-line/60">
            <div className="text-xs text-muted font-medium">{t('security.disable_hint')}</div>
            {codeInput}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full py-3.5 rounded-xl bg-rose hover:brightness-110 disabled:opacity-50 text-white font-bold text-xs transition btn-press shadow-md"
            >
              {busy ? t('login.processing') : t('security.disable')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

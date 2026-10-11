import { useEffect, useState } from 'react';
import { api, ApiError, type TwoFactorSetup } from '../api/client.js';
import Alert from '../components/Alert.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';

type Msg = { type: 'success' | 'error'; text: string };

function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

export default function Security() {
  const { t } = useLanguage();
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
    setBusy(true);
    setMsg(null);
    try {
      const data = await api.twoFactorSetup();
      setSetup(data);
      setCode('');
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  }

  async function enable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.twoFactorEnable(code);
      setSetup(null);
      setCode('');
      setEnabled(true);
      setMsg({ type: 'success', text: t('security.enabled_ok') });
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  }

  async function disable(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await api.twoFactorDisable(code);
      setCode('');
      setEnabled(false);
      setMsg({ type: 'success', text: t('security.disabled_ok') });
    } catch (err) {
      setMsg({ type: 'error', text: (err as ApiError).message });
    } finally {
      setBusy(false);
    }
  }

  function cancelSetup() {
    setSetup(null);
    setCode('');
    setMsg(null);
  }

  async function copySecret() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
      className="w-full bg-surface2 border border-line rounded-lg px-3 py-3 text-center text-xl font-mono tracking-[0.5em]"
    />
  );

  return (
    <div className="max-w-md">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-shield-check text-indigo" /> {t('security.title')}
      </h1>

      {msg && (
        <div className="mb-4">
          <Alert type={msg.type}>{msg.text}</Alert>
        </div>
      )}

      <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-medium text-sm">{t('security.2fa_title')}</h2>
            <p className="text-xs text-muted mt-1">{t('security.2fa_desc')}</p>
          </div>
          {enabled === null ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <span
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
                enabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
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
            className="w-full bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
          >
            {busy ? t('login.processing') : t('security.start_setup')}
          </button>
        )}

        {enabled === false && setup && (
          <form onSubmit={enable} className="space-y-3">
            <div className="text-xs text-muted">{t('security.step_secret')}</div>
            <div className="bg-surface2 border border-line rounded-lg px-3 py-2.5 flex items-center justify-between gap-2">
              <span className="font-mono text-sm break-all select-all">{formatSecret(setup.secret)}</span>
              <button type="button" onClick={copySecret} className="shrink-0 text-xs text-indigo hover:underline">
                {copied ? t('security.copied') : t('security.copy')}
              </button>
            </div>
            <a
              href={setup.otpauthUri}
              className="w-full flex items-center justify-center gap-2 border border-indigo/40 text-indigo hover:bg-indigo/10 text-sm font-medium py-2.5 rounded-lg transition"
            >
              <i className="bi bi-box-arrow-up-right" /> {t('security.open_app')}
            </a>
            <p className="text-[11px] text-muted">{t('security.no_qr_note')}</p>
            <div className="text-xs text-muted pt-1">{t('security.step_code')}</div>
            {codeInput}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={cancelSetup}
                className="border border-line text-muted hover:text-ink text-sm py-2.5 rounded-lg transition"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="bg-indigo hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
              >
                {busy ? t('login.processing') : t('security.enable')}
              </button>
            </div>
          </form>
        )}

        {enabled === true && (
          <form onSubmit={disable} className="space-y-3">
            <div className="text-xs text-muted">{t('security.disable_hint')}</div>
            {codeInput}
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="w-full bg-rose hover:brightness-110 disabled:opacity-60 text-white text-sm font-medium py-2.5 rounded-lg transition"
            >
              {busy ? t('login.processing') : t('security.disable')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

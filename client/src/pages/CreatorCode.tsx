import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';
import type { CreatorCodeInfo } from '../types.js';

export default function CreatorCode() {
  const { t } = useLanguage();
  const { success: toastSuccess, error: toastError } = useToast();
  const [mine, setMine] = useState<CreatorCodeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function load() {
    api.myCreatorCode()
      .then((d) => {
        setMine(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }
  useEffect(load, []);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    playClickSound();
    setSubmitting(true);
    try {
      await api.applyCreatorCode(code.trim().toUpperCase());
      playCoinSound();
      toastSuccess(t('creator.apply_success'), 'Áp dụng Creator Code');
      setCode('');
      load();
    } catch (err) {
      const msg = (err as ApiError).message;
      toastError(msg, 'Lỗi áp dụng code');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-4 space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
          <i className="bi bi-tag-fill" />
          <span>Chương trình đối tác</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          {t('creator.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
          Ủng hộ Content Creator yêu thích của bạn hoặc theo dõi mã đối tác cá nhân.
        </p>
      </div>

      {loading && (
        <div className="glass-card rounded-2xl p-4 sm:p-6 space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-44" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-14 rounded-xl" />
            <Skeleton className="h-14 rounded-xl" />
          </div>
        </div>
      )}

      {mine?.owns_code && (
        <div className="glass-panel rounded-3xl p-4 sm:p-6 border border-amber/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold uppercase text-muted tracking-wider">
                {t('creator.your_code')}
              </div>
              <div className="font-mono text-xl sm:text-2xl font-extrabold text-amber mt-0.5 tracking-wider truncate">
                {mine.code}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber/20 border border-amber/40 flex items-center justify-center text-amber text-lg shrink-0">
              <i className="bi bi-stars" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-line/60">
            <div className="glass-card rounded-2xl p-3 sm:p-3.5 text-center min-w-0">
              <div className="text-[11px] text-muted">{t('creator.used_by')}</div>
              <div className="font-mono text-lg sm:text-xl font-bold text-ink mt-0.5 truncate">
                {mine.used_by_count} <span className="text-xs font-body font-normal text-muted">{t('creator.used_by_suffix')}</span>
              </div>
            </div>
            <div className="glass-card rounded-2xl p-3 sm:p-3.5 text-center min-w-0">
              <div className="text-[11px] text-muted">{t('creator.total_earned')}</div>
              <div className="font-mono text-lg sm:text-xl font-bold text-amber mt-0.5 flex items-center justify-center gap-1 min-w-0">
                <CurrencyIcon size={16} />
                <span className="truncate">{mine.total_earned_nova} VNC</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enter code form */}
      <form
        onSubmit={apply}
        className="glass-card rounded-3xl p-4 sm:p-6 border border-line shadow-xl space-y-4"
      >
        <div>
          <h2 className="font-display font-bold text-base text-ink">
            {t('creator.enter_code_title')}
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Nhập mã để nhận thưởng hỗ trợ và gắn kết với Creator
          </p>
        </div>

        <div className="space-y-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="VD: LUZANMC"
            className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm font-mono tracking-wider text-ink focus:outline-none focus:border-indigo uppercase"
          />
        </div>

        <button
          type="submit"
          disabled={submitting || !code.trim()}
          className="w-full py-3 rounded-xl font-display font-bold text-sm bg-gradient-to-r from-indigo to-cyan hover:brightness-110 text-white shadow-md transition btn-press flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <i className="bi bi-arrow-repeat animate-spin" />
              <span>Đang kiểm tra...</span>
            </>
          ) : (
            <span>{t('creator.apply_button')}</span>
          )}
        </button>
      </form>
    </div>
  );
}

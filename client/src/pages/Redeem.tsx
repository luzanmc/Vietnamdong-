import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { RedeemItemSkeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSettings, formatVnd } from '../context/SettingsContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { triggerConfetti } from '../components/Confetti.js';
import { playClickSound, playClaimSound } from '../utils/sound.js';
import type { RedeemCatalog, RedeemItem } from '../types.js';

export default function Redeem() {
  const { t } = useLanguage();
  const { refresh } = useAuth();
  const { novaToVndRate } = useSettings();
  const { success: toastSuccess, error: toastError } = useToast();

  const CATEGORY_INFO: Record<string, { label: string; icon: string; color: string }> = {
    game_topup: { label: t('redeem.category_game_topup') || 'Nạp Game', icon: 'bi-controller', color: 'text-indigo' },
    card: { label: t('redeem.category_card') || 'Thẻ cào', icon: 'bi-credit-card-2-front', color: 'text-amber' },
    wallet: { label: t('redeem.category_wallet') || 'Ví điện tử', icon: 'bi-wallet2', color: 'text-cyan' },
  };

  const [catalog, setCatalog] = useState<RedeemCatalog | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<RedeemItem | null>(null);
  const [destination, setDestination] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.redeemCatalog().then(setCatalog).catch(() => {});
  }, []);

  function openOrder(item: RedeemItem) {
    playClickSound();
    setActiveItem(item);
    setDestination('');
    setError(null);
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!activeItem) return;
    if (!destination.trim()) {
      toastError('Vui lòng nhập thông tin nhận thưởng.', 'Thiếu thông tin');
      return;
    }

    playClickSound();
    setSubmitting(true);
    setError(null);

    try {
      await api.redeemOrder({ item_id: activeItem.id, destination });
      playClaimSound();
      triggerConfetti();
      toastSuccess(t('redeem.submit_success'), 'Đổi thưởng thành công');
      setActiveItem(null);
      await refresh();
    } catch (err) {
      const msg = (err as ApiError).message;
      setError(msg);
      toastError(msg, 'Lỗi đổi thưởng');
    } finally {
      setSubmitting(false);
    }
  }

  const categories = catalog ? Object.keys(catalog) : [];
  const displayCategories = activeTab === 'all' ? categories : categories.filter((c) => c === activeTab);

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-6">
      {/* Page Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo/15 text-indigo border border-indigo/30 mb-2">
          <i className="bi bi-gift-fill" />
          <span>Kho phần thưởng chính hãng</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          {t('redeem.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 max-w-xl">
          {t('redeem.subtitle')}
        </p>
      </div>

      {/* Category Filter Tabs */}
      {catalog && (
        <div className="flex gap-2 overflow-x-auto pb-1 p-1 rounded-2xl bg-surface2/60 border border-line w-fit">
          <button
            onClick={() => {
              playClickSound();
              setActiveTab('all');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition btn-press ${
              activeTab === 'all'
                ? 'bg-indigo text-white shadow-md shadow-indigo/20'
                : 'text-muted hover:text-ink'
            }`}
          >
            Tất cả
          </button>
          {categories.map((cat) => {
            const info = CATEGORY_INFO[cat] || { label: cat, icon: 'bi-tag', color: 'text-ink' };
            return (
              <button
                key={cat}
                onClick={() => {
                  playClickSound();
                  setActiveTab(cat);
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition btn-press ${
                  activeTab === cat
                    ? 'bg-indigo text-white shadow-md shadow-indigo/20'
                    : 'text-muted hover:text-ink'
                }`}
              >
                <i className={`bi ${info.icon} ${activeTab === cat ? 'text-white' : info.color}`} />
                <span>{info.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Catalog Grid */}
      {!catalog ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <RedeemItemSkeleton key={i} />
          ))}
        </div>
      ) : displayCategories.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center text-muted">
          <i className="bi bi-inbox text-3xl mb-2 inline-block text-muted/60" />
          <div>Hiện chưa có vật phẩm nào trong danh mục này.</div>
        </div>
      ) : (
        displayCategories.map((category) => {
          const items = catalog[category] || [];
          const catInfo = CATEGORY_INFO[category] || { label: category, icon: 'bi-tag', color: 'text-indigo' };

          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold text-ink uppercase tracking-wide">
                <i className={`bi ${catInfo.icon} ${catInfo.color}`} />
                <span>{catInfo.label}</span>
                <span className="text-xs text-muted font-normal">({items.length} lựa chọn)</span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col justify-between group relative overflow-hidden"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="font-semibold text-sm sm:text-base text-ink line-clamp-1 group-hover:text-indigo transition">
                          {item.label}
                        </div>
                        <span className="w-8 h-8 rounded-xl bg-surface2/80 border border-line flex items-center justify-center shrink-0">
                          <i className={`bi ${catInfo.icon} ${catInfo.color} text-sm`} />
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5 mt-2">
                        <CurrencyIcon size={20} />
                        <span className="font-mono text-xl font-extrabold text-amber">
                          {item.price_nova}
                        </span>
                        <span className="text-xs font-bold text-amber">VNC</span>
                      </div>

                      {novaToVndRate > 0 && (
                        <div className="text-[11px] text-muted mt-0.5">
                          ≈ {formatVnd(item.price_nova, novaToVndRate)}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-line/50 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted truncate max-w-[140px]">
                        {item.field_label || 'Nhập thông tin'}
                      </span>
                      <button
                        onClick={() => openOrder(item)}
                        className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo to-indigo/90 hover:brightness-110 text-white shadow-sm transition btn-press shrink-0"
                      >
                        {t('redeem.redeem_button')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}

      {/* Confirmation Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-md animate-slide-in">
          <form
            onSubmit={submitOrder}
            className="glass-panel rounded-3xl p-6 sm:p-7 max-w-md w-full max-h-[90dvh] overflow-y-auto border border-indigo/40 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo/20 flex items-center justify-center text-indigo">
                  <i className="bi bi-gift-fill text-lg" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink">Xác nhận đổi thưởng</h3>
                  <div className="text-xs text-muted">Vui lòng kiểm tra kỹ thông tin</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="w-8 h-8 rounded-lg text-muted hover:text-ink flex items-center justify-center"
              >
                <i className="bi bi-x-lg text-sm" />
              </button>
            </div>

            {/* Selected item overview card */}
            <div className="p-3.5 rounded-2xl bg-surface2/60 border border-line flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm text-ink">{activeItem.label}</div>
                <div className="text-xs text-muted">Phần thưởng đã chọn</div>
              </div>
              <div className="font-mono text-base font-bold text-amber flex items-center gap-1">
                <CurrencyIcon size={18} />
                <span>{activeItem.price_nova} VNC</span>
              </div>
            </div>

            {/* Destination Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted">
                {activeItem.field_label || t('redeem.destination_placeholder')}
              </label>
              <input
                autoFocus
                required
                placeholder={activeItem.field_label || t('redeem.destination_placeholder')}
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-surface2 border border-line rounded-xl px-4 py-3 text-sm text-ink focus:outline-none focus:border-indigo"
              />
              <p className="text-[11px] text-muted">
                Admin sẽ duyệt và chuyển phần thưởng đến thông tin này trong thời gian sớm nhất.
              </p>
            </div>

            {error && <div className="text-xs text-rose">{error}</div>}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="flex-1 py-3 rounded-xl border border-line text-sm font-semibold text-muted hover:text-ink transition btn-press"
              >
                {t('redeem.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo to-cyan hover:brightness-110 text-white font-semibold text-sm transition btn-press shadow-md flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin" />
                    <span>Đang đổi...</span>
                  </>
                ) : (
                  <span>{t('redeem.submit')}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

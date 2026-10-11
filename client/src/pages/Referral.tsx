import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useToast } from '../context/ToastContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import { playClickSound, playCoinSound } from '../utils/sound.js';
import type { ReferralInfo } from '../types.js';

export default function Referral() {
  const { t } = useLanguage();
  const { success: toastSuccess } = useToast();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referral().then(setInfo).catch(() => {});
  }, []);

  function copyLink() {
    if (!info) return;
    playClickSound();
    navigator.clipboard.writeText(info.referral_link).then(() => {
      setCopied(true);
      playCoinSound();
      toastSuccess('Đã sao chép link giới thiệu vào bộ nhớ tạm!', 'Sao chép');
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const shareText = encodeURIComponent('Tham gia VietnamDong cùng mình, kiếm VDX đổi tiền thật mỗi ngày!');
  const shareUrl = info ? encodeURIComponent(info.referral_link) : '';

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan/15 text-cyan border border-cyan/30 mb-2">
          <i className="bi bi-people-fill" />
          <span>Hoa hồng 20% trọn đời</span>
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-ink flex items-center gap-2">
          <i className="bi bi-people text-indigo" /> {t('referral.title')}
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
          Mời bạn bè tham gia VietnamDong. Bạn sẽ nhận được 20% hoa hồng VDX vĩnh viễn từ mọi nhiệm vụ mà người bạn giới thiệu hoàn thành!
        </p>
      </div>

      {!info ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full rounded-3xl" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
        </div>
      ) : (
        <>
          {/* Main Referral Card with QR & Link */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-line shadow-xl flex flex-col md:flex-row items-center gap-6">
            <div className="p-3 bg-white rounded-2xl shadow-md border border-line shrink-0">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${shareUrl}`}
                alt="QR code"
                width={140}
                height={140}
                className="rounded-lg"
              />
            </div>

            <div className="flex-1 w-full space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1.5">
                  {t('referral.your_link')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={info.referral_link}
                    className="flex-1 bg-surface2 border border-line rounded-xl px-4 py-2.5 text-xs font-mono text-ink truncate focus:outline-none"
                  />
                  <button
                    onClick={copyLink}
                    className="shrink-0 px-4 py-2.5 bg-gradient-to-r from-indigo to-indigo/90 hover:brightness-110 text-white text-xs font-bold rounded-xl transition btn-press shadow-sm flex items-center gap-1.5"
                  >
                    <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard-fill'}`} />
                    <span>{copied ? t('referral.copied') : t('referral.copy')}</span>
                  </button>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div>
                <div className="text-xs text-muted mb-2 font-medium">{t('referral.share_title')}</div>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playClickSound}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30 text-xs font-semibold hover:bg-[#229ED9]/25 transition btn-press"
                  >
                    <i className="bi bi-telegram" />
                    <span>Telegram</span>
                  </a>

                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playClickSound}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1877F2]/15 text-[#1877F2] border border-[#1877F2]/30 text-xs font-semibold hover:bg-[#1877F2]/25 transition btn-press"
                  >
                    <i className="bi bi-facebook" />
                    <span>Facebook</span>
                  </a>

                  <a
                    href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={playClickSound}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan/15 text-cyan border border-cyan/30 text-xs font-semibold hover:bg-cyan/25 transition btn-press"
                  >
                    <i className="bi bi-twitter-x" />
                    <span>Twitter/X</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-5 text-center">
              <div className="text-xs text-muted uppercase font-medium">{t('referral.stat_referred')}</div>
              <div className="font-mono text-3xl font-bold text-ink mt-1 flex items-center justify-center gap-1">
                <i className="bi bi-person-check-fill text-indigo text-2xl mr-1" />
                <span>{info.referred_count}</span>
                <span className="text-xs text-muted font-body font-normal">{t('referral.people_suffix')}</span>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 text-center">
              <div className="text-xs text-muted uppercase font-medium">{t('referral.stat_earned')}</div>
              <div className="font-mono text-3xl font-bold text-amber mt-1 flex items-center justify-center gap-1.5">
                <CurrencyIcon size={24} />
                <span>{info.total_earned_nova}</span>
                <span className="text-xs text-muted font-body font-normal">VDX</span>
              </div>
            </div>
          </div>

          {/* Referred Users List */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink flex items-center gap-2">
              <i className="bi bi-list-ul text-cyan" /> {t('referral.list_title')}
            </h2>

            <div className="glass-panel rounded-2xl border border-line overflow-hidden">
              {(info.referred_users || []).length === 0 ? (
                <div className="p-8 text-center text-muted text-xs leading-relaxed">
                  {t('referral.no_referrals')}
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {info.referred_users.map((r, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-surface2/40 transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo/20 text-indigo font-bold text-xs flex items-center justify-center">
                          {r.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-sm text-ink">{r.username}</div>
                          <div className="text-[10px] text-muted font-mono">
                            Ngày tham gia: {new Date(r.created_at).toLocaleDateString('vi-VN')}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-cyan bg-cyan/10 px-2.5 py-1 rounded-full border border-cyan/20">
                        Đang hoạt động
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

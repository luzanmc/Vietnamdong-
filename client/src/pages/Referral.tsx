import { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { Skeleton } from '../components/Skeleton.js';
import { useLanguage } from '../context/LanguageContext.js';
import type { ReferralInfo } from '../types.js';

export default function Referral() {
  const { t } = useLanguage();
  const [info, setInfo] = useState<ReferralInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referral().then(setInfo);
  }, []);

  function copyLink() {
    if (!info) return;
    navigator.clipboard.writeText(info.referral_link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shareText = encodeURIComponent('Tham gia VietnamDong cùng mình, kiếm VDX đổi tiền thật mỗi ngày!');
  const shareUrl = info ? encodeURIComponent(info.referral_link) : '';

  return (
    <div className="max-w-lg">
      <h1 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <i className="bi bi-people text-indigo" /> {t('referral.title')}
      </h1>

      {!info ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <>
          <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-5 mb-4 flex flex-col sm:flex-row items-center gap-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${shareUrl}`}
              alt="QR code"
              width={140}
              height={140}
              className="rounded-lg border border-line shrink-0"
            />
            <div className="flex-1 w-full">
              <div className="text-xs text-muted mb-1">{t('referral.your_link')}</div>
              <div className="flex items-center gap-2">
                <input readOnly value={info.referral_link} className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-xs font-mono truncate" />
                <button onClick={copyLink} className="shrink-0 bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">
                  {copied ? t('referral.copied') : t('referral.copy')}
                </button>
              </div>

              <div className="text-xs text-muted mt-4 mb-2">{t('referral.share_title')}</div>
              <div className="flex gap-2">
                <a href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#1877F2] text-white">
                  <i className="bi bi-facebook" />
                </a>
                <a href={`https://t.me/share/url?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#26A5E4] text-white">
                  <i className="bi bi-telegram" />
                </a>
                <a href={`https://www.twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-black text-white">
                  <i className="bi bi-twitter-x" />
                </a>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-surface border border-line rounded-xl p-4">
              <div className="text-[11px] text-muted uppercase">{t('referral.stat_referred')}</div>
              <div className="font-mono text-2xl font-semibold mt-1">{info.referred_count} <span className="text-sm text-muted">{t('referral.people_suffix')}</span></div>
            </div>
            <div className="bg-surface border border-line rounded-xl p-4">
              <div className="text-[11px] text-muted uppercase">{t('referral.stat_earned')}</div>
              <div className="font-mono text-2xl font-semibold text-amber mt-1">{info.total_earned_nova} VDX</div>
            </div>
          </div>

          <h2 className="text-sm font-semibold mb-2">{t('referral.list_title')}</h2>
          {info.referred_users.length === 0 ? (
            <p className="text-sm text-muted">{t('referral.no_referrals')}</p>
          ) : (
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              {info.referred_users.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-line last:border-0 text-sm">
                  <span>{u.username}</span>
                  <span className="text-xs text-muted font-mono">{new Date(u.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

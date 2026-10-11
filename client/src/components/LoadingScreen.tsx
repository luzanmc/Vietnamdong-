import { useLanguage } from '../context/LanguageContext.js';

interface LoadingScreenProps {
  fullScreen?: boolean;
}

export default function LoadingScreen({ fullScreen = true }: LoadingScreenProps) {
  const { t } = useLanguage();
  return (
    <div
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[40vh]'} bg-bg flex flex-col items-center justify-center gap-5`}
      role="status"
      aria-live="polite"
    >
      <div className="relative w-20 h-20 flex items-center justify-center">
        <span className="loader-ring absolute inset-0 rounded-full border-2 border-indigo/20 border-t-indigo" />
        <span className="loader-ring-slow absolute inset-2 rounded-full border-2 border-cyan/20 border-b-cyan" />
        <img src="/logo-mark.png" alt="VietnamDong" className="loader-pulse w-9 h-9" />
      </div>
      <div className="flex items-end gap-1 text-sm text-muted">
        <span>{t('common.loading')}</span>
        <span className="loader-dot">.</span>
        <span className="loader-dot loader-dot-2">.</span>
        <span className="loader-dot loader-dot-3">.</span>
      </div>
    </div>
  );
}

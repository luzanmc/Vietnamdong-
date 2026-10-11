import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import CurrencyIcon from '../components/CurrencyIcon.js';
import Footer from '../components/Footer.js';

const FEATURE_KEYS = [
  { icon: 'bi-link-45deg', titleKey: 'landing.feature_tasks_title', descKey: 'landing.feature_tasks_desc' },
  { icon: 'bi-calendar-check', titleKey: 'landing.feature_daily_title', descKey: 'landing.feature_daily_desc' },
  { icon: 'bi-people', titleKey: 'landing.feature_referral_title', descKey: 'landing.feature_referral_desc' },
  { icon: 'bi-arrow-left-right', titleKey: 'landing.feature_redeem_title', descKey: 'landing.feature_redeem_desc' },
];

export default function Landing() {
  const { lang, toggle: toggleLang, t } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="flex items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 h-16">
        <div className="flex items-center gap-2">
          <img src="/logo-mark.png" alt="VietnamDong" className="w-8 h-8" />
          <span className="font-display font-semibold tracking-tight">VietnamDong</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="w-9 h-9 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface2 transition"
          >
            <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
          </button>
          <button
            onClick={toggleLang}
            className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition px-2.5 py-1.5 rounded-md hover:bg-surface2 border border-line"
          >
            <i className="bi bi-translate text-sm" />
            <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
          </button>
          <Link
            to="/login"
            className="text-sm font-medium bg-indigo hover:brightness-110 text-white px-4 py-2 rounded-lg transition"
          >
            {t('login.title')}
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-surface border border-line rounded-full px-4 py-1.5 text-xs text-muted mb-6">
            <CurrencyIcon size={16} />
            <span>VDX · VietnamDong</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-bold tracking-tight leading-tight">
            {t('landing.hero_title')}
          </h1>
          <p className="text-muted mt-4 text-sm sm:text-base max-w-xl mx-auto">{t('landing.hero_subtitle')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              to="/login"
              className="w-full sm:w-auto bg-indigo hover:brightness-110 text-white text-sm font-medium px-6 py-3 rounded-lg transition"
            >
              {t('landing.cta_start')}
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-surface2 border border-line hover:bg-line text-sm font-medium px-6 py-3 rounded-lg transition"
            >
              {t('landing.cta_login')}
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          {FEATURE_KEYS.map((f) => (
            <div key={f.titleKey} className="bg-surface border border-line rounded-xl p-5">
              <i className={`bi ${f.icon} text-2xl text-indigo`} />
              <h3 className="font-semibold text-sm mt-3">{t(f.titleKey)}</h3>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 mt-16 text-xs text-muted">
          <span className="flex items-center gap-1.5"><i className="bi bi-shield-check text-cyan" /> {t('landing.trust_secure')}</span>
          <span className="flex items-center gap-1.5"><i className="bi bi-person-check text-cyan" /> {t('landing.trust_admin')}</span>
          <span className="flex items-center gap-1.5"><i className="bi bi-clipboard-data text-cyan" /> {t('landing.trust_transparent')}</span>
        </div>
      </main>
      <Footer />
    </div>
  );
}

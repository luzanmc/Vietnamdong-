import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.js';

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL as string | undefined;
const DISCORD_URL = import.meta.env.VITE_DISCORD_URL as string | undefined;
const FACEBOOK_URL = import.meta.env.VITE_FACEBOOK_URL as string | undefined;
const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || '1.0.0';

const linkClass = 'block py-1.5 text-sm text-muted hover:text-ink transition';
const headingClass = 'font-display font-semibold text-sm uppercase tracking-wide text-ink mb-3';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-line bg-surface mt-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-6">
        <div className="flex items-center gap-2 mb-3">
          <img src="/logo-mark.png" alt="VietnamDong" className="w-8 h-8" />
          <span className="font-display font-semibold tracking-tight">VietnamDong</span>
        </div>
        <p className="text-sm text-muted max-w-xl leading-relaxed">{t('footer.tagline')}</p>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8 mt-8">
          <div>
            <h3 className={headingClass}>{t('footer.general')}</h3>
            <Link to="/about" className={linkClass}>{t('footer.about')}</Link>
            <Link to="/terms" className={linkClass}>{t('footer.terms')}</Link>
            <Link to="/privacy" className={linkClass}>{t('footer.privacy')}</Link>
            {DISCORD_URL && (
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t('footer.discord')}
              </a>
            )}
          </div>

          <div>
            <h3 className={headingClass}>{t('footer.support')}</h3>
            <Link to="/support" className={linkClass}>{t('footer.support_center')}</Link>
            <Link to="/faq" className={linkClass}>{t('footer.faq')}</Link>
            <Link to="/wallet" className={linkClass}>{t('footer.withdraw')}</Link>
            <Link to="/redeem" className={linkClass}>{t('footer.redeem')}</Link>
            <Link to="/referral" className={linkClass}>{t('footer.affiliate')}</Link>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <h3 className={headingClass}>{t('footer.contact')}</h3>
            {SUPPORT_EMAIL && (
              <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-2 py-1.5 text-sm text-muted hover:text-ink transition">
                <i className="bi bi-envelope" /> {SUPPORT_EMAIL}
              </a>
            )}
            <Link to="/support" className="flex items-center gap-2 py-1.5 text-sm text-muted hover:text-ink transition">
              <i className="bi bi-headset" /> {t('footer.send_ticket')}
            </Link>
            <div className="flex items-center gap-3 mt-3">
              {DISCORD_URL && (
                <a
                  href={DISCORD_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Discord"
                  className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink hover:border-indigo transition"
                >
                  <i className="bi bi-discord" />
                </a>
              )}
              {FACEBOOK_URL && (
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                  className="w-10 h-10 rounded-full border border-line flex items-center justify-center text-muted hover:text-ink hover:border-indigo transition"
                >
                  <i className="bi bi-facebook" />
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-8 text-sm text-muted">
          <span className="w-8 h-8 rounded-full bg-[#da251d] flex items-center justify-center shrink-0">
            <i className="bi bi-star-fill text-[#ffcd00] text-sm" />
          </span>
          <span>{t('footer.sovereignty')}</span>
        </div>

        <div className="border-t border-line mt-6 pt-5 flex flex-col items-center gap-2 text-xs text-muted">
          <span>© {new Date().getFullYear()} VietnamDong. {t('footer.rights')}</span>
          <span className="inline-flex items-center gap-1.5 bg-surface2 border border-line rounded-full px-3 py-1 font-mono">
            <i className="bi bi-tag" /> {APP_VERSION}
          </span>
        </div>
      </div>
    </footer>
  );
}

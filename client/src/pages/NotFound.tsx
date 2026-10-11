import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import Footer from '../components/Footer.js';

export default function NotFound() {
  const { t } = useLanguage();
  const { me } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center relative overflow-hidden">
        <div className="notfound-glow absolute w-72 h-72 rounded-full bg-indigo/20 blur-3xl" aria-hidden="true" />
        <div className="relative page-enter">
          <img src="/logo-mark.png" alt="VietnamDong" className="notfound-float w-16 h-16 mx-auto mb-4" />
          <div className="notfound-number font-display font-bold text-7xl sm:text-9xl tracking-tight leading-none">
            404
          </div>
          <h1 className="font-display text-xl sm:text-2xl font-semibold mt-4">{t('notfound.title')}</h1>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto">{t('notfound.desc')}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
            <Link
              to={me ? '/dashboard' : '/'}
              className="w-full sm:w-auto bg-indigo hover:brightness-110 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition"
            >
              <i className="bi bi-house" /> {me ? t('notfound.to_dashboard') : t('notfound.to_home')}
            </Link>
            <button
              onClick={() => navigate(-1)}
              className="w-full sm:w-auto bg-surface2 border border-line hover:bg-line text-sm font-medium px-6 py-2.5 rounded-lg transition"
            >
              <i className="bi bi-arrow-left" /> {t('notfound.back')}
            </button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

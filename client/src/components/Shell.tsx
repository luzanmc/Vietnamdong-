import { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useSettings } from '../context/SettingsContext.js';
import BackgroundMusicPlayer from './BackgroundMusicPlayer.js';
import NotificationBell from './NotificationBell.js';
import Footer from './Footer.js';

interface NavItem {
  to: string;
  icon: string;
  labelKey: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', icon: 'bi-grid-1x2-fill', labelKey: 'nav.dashboard' },
  { to: '/chart', icon: 'bi-graph-up', labelKey: 'nav.chart' },
  { to: '/daily-reward', icon: 'bi-gift', labelKey: 'nav.daily' },
  { to: '/lucky-wheel', icon: 'bi-stars', labelKey: 'nav.spin' },
  { to: '/quests', icon: 'bi-list-task', labelKey: 'nav.quests' },
  { to: '/leaderboard', icon: 'bi-trophy', labelKey: 'nav.leaderboard' },
  { to: '/wallet', icon: 'bi-cash-coin', labelKey: 'nav.wallet' },
  { to: '/history', icon: 'bi-clock-history', labelKey: 'nav.history' },
  { to: '/redeem', icon: 'bi-controller', labelKey: 'nav.redeem' },
  { to: '/creator-code', icon: 'bi-tag', labelKey: 'nav.creator' },
  { to: '/referral', icon: 'bi-people', labelKey: 'nav.referral' },
  { to: '/vietsub-studio', icon: 'bi-badge-cc', labelKey: 'nav.vietsub' },
  { to: '/achievements', icon: 'bi-award', labelKey: 'nav.achievements' },
  { to: '/faq', icon: 'bi-question-circle', labelKey: 'nav.faq' },
  { to: '/support', icon: 'bi-headset', labelKey: 'nav.support' },
  { to: '/security', icon: 'bi-shield-check', labelKey: 'nav.security' },
  { to: '/admin', icon: 'bi-shield-lock', labelKey: 'nav.admin', adminOnly: true },
];

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
  const { t } = useLanguage();
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.filter((item) => !item.adminOnly || isAdmin).map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition ${
              isActive ? 'text-white bg-indigo/10 border-l-2 border-indigo' : 'text-muted hover:text-ink hover:bg-surface2'
            }`
          }
        >
          <i className={`bi ${item.icon} w-4 shrink-0`} />
          <span className="truncate">{t(item.labelKey)}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-ink hover:bg-surface2 transition"
    >
      <i className={`bi ${theme === 'dark' ? 'bi-sun' : 'bi-moon-stars'}`} />
    </button>
  );
}

function LanguageToggle() {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={toggle}
      aria-label="Switch language"
      className="flex items-center gap-1 text-xs font-medium text-muted hover:text-ink transition px-2 py-1.5 rounded-md hover:bg-surface2"
    >
      <i className="bi bi-translate text-sm" />
      <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
    </button>
  );
}

export default function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const { me, logout } = useAuth();
  const { t } = useLanguage();
  const { announcement } = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = me?.role === 'admin';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-3 sm:px-5 h-14">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo-mark.png" alt="VietnamDong" className="w-7 h-7 shrink-0" />
            <span className="font-display font-semibold tracking-tight truncate">VietnamDong</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {me && (
              <div className="hidden lg:flex items-center gap-2 text-sm text-muted">
                {me.avatar_url && <img src={me.avatar_url} alt={me.username} className="w-6 h-6 rounded-full" />}
                <span className="max-w-[140px] truncate">{me.username}</span>
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <NotificationBell />
            <button
              onClick={handleLogout}
              aria-label={t('nav.logout')}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-rose transition px-2 py-1.5 rounded-md hover:bg-surface2"
            >
              <i className="bi bi-box-arrow-right text-base" />
              <span className="hidden md:inline">{t('nav.logout')}</span>
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center text-ink shrink-0"
              aria-label={t('nav.menu')}
            >
              <i className="bi bi-list text-xl" />
            </button>
          </div>
        </div>
      </header>

      {announcement && !bannerDismissed && (
        <div className="bg-indigo/10 border-b border-indigo/30 px-4 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-ink min-w-0">
            <i className="bi bi-megaphone-fill text-indigo shrink-0" />
            <span className="truncate">{announcement}</span>
          </div>
          <button onClick={() => setBannerDismissed(true)} className="shrink-0 text-muted hover:text-ink">
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-surface border-l border-line p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center text-muted">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={isAdmin} />
            <div className="sm:hidden flex items-center gap-2 px-3 py-2 mt-1">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 mt-2 rounded-md text-sm text-rose hover:bg-surface2 transition"
            >
              <i className="bi bi-box-arrow-right" /> {t('nav.logout')}
            </button>
          </aside>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto flex">
        <aside className="w-56 shrink-0 border-r border-line hidden lg:block py-4 h-[calc(100vh-56px)] sticky top-14">
          <NavLinks isAdmin={isAdmin} />
        </aside>
        <main key={pathname} className="page-enter flex-1 px-3 sm:px-5 py-5 sm:py-6 min-w-0 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
      <Footer />
      <BackgroundMusicPlayer />
    </div>
  );
}

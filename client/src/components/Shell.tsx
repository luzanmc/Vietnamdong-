import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useSettings } from '../context/SettingsContext.js';
import BackgroundMusicPlayer from './BackgroundMusicPlayer.js';
import MusicTab from './MusicTab.js';
import NotificationBell from './NotificationBell.js';
import Footer from './Footer.js';
import CurrencyIcon from './CurrencyIcon.js';
import AnimatedNumber from './AnimatedNumber.js';
import { playClickSound, isSoundEnabled, toggleSound } from '../utils/sound.js';

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface NavItem {
  to: string;
  icon: string;
  labelKey: string;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Khám phá',
    items: [
      { to: '/dashboard', icon: 'bi-grid-1x2-fill', labelKey: 'nav.dashboard' },
      { to: '/chart', icon: 'bi-graph-up', labelKey: 'nav.chart' },
      { to: '/daily-reward', icon: 'bi-gift-fill', labelKey: 'nav.daily', badge: 'HOT', badgeColor: 'bg-rose text-white' },
      { to: '/lucky-wheel', icon: 'bi-stars', labelKey: 'nav.spin', badge: 'FREE', badgeColor: 'bg-amber text-black' },
      { to: '/giftcode', icon: 'bi-ticket-perforated-fill', labelKey: 'nav.giftcode', badge: 'HOT', badgeColor: 'bg-amber text-black' },
      { to: '/quests', icon: 'bi-list-task', labelKey: 'nav.quests' },
      { to: '/leaderboard', icon: 'bi-trophy-fill', labelKey: 'nav.leaderboard' },
    ],
  },

  {
    title: 'Tài chính',
    items: [
      { to: '/wallet', icon: 'bi-wallet2', labelKey: 'nav.wallet' },
      { to: '/history', icon: 'bi-clock-history', labelKey: 'nav.history' },
      { to: '/redeem', icon: 'bi-controller', labelKey: 'nav.redeem' },
    ],
  },
  {
    title: 'Cộng đồng',
    items: [
      { to: '/referral', icon: 'bi-people-fill', labelKey: 'nav.referral', badge: '20%', badgeColor: 'bg-cyan text-black' },
      { to: '/creator-code', icon: 'bi-tag-fill', labelKey: 'nav.creator' },
      { to: '/vietsub-studio', icon: 'bi-badge-cc-fill', labelKey: 'nav.vietsub' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { to: '/profile', icon: 'bi-person-circle', labelKey: 'nav.profile' },
      { to: '/achievements', icon: 'bi-award-fill', labelKey: 'nav.achievements' },
      { to: '/faq', icon: 'bi-question-circle-fill', labelKey: 'nav.faq' },
      { to: '/support', icon: 'bi-headset', labelKey: 'nav.support' },
      { to: '/security', icon: 'bi-shield-check', labelKey: 'nav.security' },
      { to: '/admin', icon: 'bi-shield-lock-fill', labelKey: 'nav.admin', adminOnly: true },
    ],
  },
];

function SoundToggle() {
  const [enabled, setEnabled] = useState(isSoundEnabled);

  function handleToggle() {
    const next = toggleSound();
    setEnabled(next);
    if (next) playClickSound();
  }

  return (
    <button
      onClick={handleToggle}
      aria-label="Toggle Sound Effects"
      title={enabled ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press"
    >
      <i className={`bi ${enabled ? 'bi-volume-up-fill text-indigo' : 'bi-volume-mute-fill'}`} />
    </button>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={() => {
        playClickSound();
        toggle();
      }}
      aria-label="Toggle theme"
      className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press"
    >
      <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber' : 'bi-moon-stars-fill text-indigo'}`} />
    </button>
  );
}

function LanguageToggle() {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={() => {
        playClickSound();
        toggle();
      }}
      aria-label="Switch language"
      className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition px-2.5 py-1.5 rounded-lg hover:bg-surface2 btn-press border border-line/60"
    >
      <i className="bi bi-translate text-sm text-cyan" />
      <span>{lang === 'vi' ? 'VI' : 'EN'}</span>
    </button>
  );
}

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
  const { t } = useLanguage();

  return (
    <nav className="flex flex-col gap-5 px-3 py-2">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (!visibleItems.length) return null;

        return (
          <div key={group.title}>
            <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted/70">
              {group.title}
            </div>
            <div className="flex flex-col gap-0.5">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    playClickSound();
                    if (onNavigate) onNavigate();
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
                      isActive
                        ? 'text-indigo dark:text-cyan bg-indigo/10 dark:bg-indigo/25 border border-indigo/30 dark:border-indigo/40 shadow-sm font-semibold'
                        : 'text-muted hover:text-ink hover:bg-surface2/80 hover:translate-x-0.5'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <i
                      className={`bi ${item.icon} text-base shrink-0 transition-transform group-hover:scale-110`}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        item.badgeColor || 'bg-indigo text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    playClickSound();
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-line sticky top-0 z-30 bg-bg/90 backdrop-blur-md">
        <div className="w-full flex items-center justify-between px-3 sm:px-6 h-16 gap-2">
          {/* Logo & Brand */}
          <Link
            to="/dashboard"
            onClick={playClickSound}
            className="flex items-center gap-2.5 group cursor-pointer shrink-0"
          >
            <div className="relative shrink-0">
              <img
                src="/logo-mark.png"
                alt="VietnamDong"
                className="w-8 h-8 shrink-0 transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 rounded-full bg-indigo/25 blur-sm -z-10 group-hover:bg-indigo/40 transition" />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-bold text-sm sm:text-base tracking-tight gradient-text-indigo leading-none">
                VietnamDong
              </span>
              <span className="text-[9px] font-mono text-muted uppercase tracking-widest leading-none mt-0.5 hidden xs:inline">
                VNC Rewards
              </span>
            </div>
          </Link>

          {/* Music Tab Mini Player */}
          <MusicTab />

          {/* User Status, Balance & Quick Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {me && (
              <>
                {/* Quick Balance Pill */}
                <Link
                  to="/wallet"
                  onClick={playClickSound}
                  title="Xem số dư & Rút tiền"
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-surface2/90 border border-line/80 hover:border-amber/50 hover:shadow-[0_0_15px_rgba(245,165,36,0.15)] transition btn-press group shrink-0"
                >
                  <CurrencyIcon size={16} />
                  <span className="font-mono text-xs sm:text-sm font-bold text-ink">
                    <AnimatedNumber value={me.balance_nova} />
                  </span>
                  <span className="text-[10px] font-bold text-amber hidden xs:inline">VNC</span>
                  <i className="bi bi-plus-circle-fill text-indigo text-xs ml-0.5 group-hover:scale-110 transition-transform hidden sm:inline" />
                </Link>

                {/* Streak Badge */}
                <Link
                  to="/daily-reward"
                  onClick={playClickSound}
                  title="Chuỗi điểm danh"
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-rose/10 border border-rose/30 text-rose text-xs font-semibold hover:bg-rose/20 transition btn-press shrink-0"
                >
                  <i className="bi bi-fire text-rose text-sm animate-pulse-soft" />
                  <span>{me.streak_days}d</span>
                </Link>

                {/* Profile Link Button (Shown on sm+ to prevent header overcrowding on small phones) */}
                <Link
                  to="/profile"
                  onClick={playClickSound}
                  title="Hồ sơ & Cài đặt"
                  className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-muted hover:text-ink hover:bg-surface2 transition btn-press border border-line/60 shrink-0 overflow-hidden"
                >
                  {me.avatar_url ? (
                    <img src={me.avatar_url} alt={me.username} className="w-full h-full object-cover" />
                  ) : (
                    <i className="bi bi-person-fill text-sm" />
                  )}
                </Link>
              </>
            )}

            {/* Controls */}
            <div className="hidden md:flex items-center gap-1 pl-1 border-l border-line/70">
              <SoundToggle />
              <LanguageToggle />
            </div>

            <div className="hidden sm:flex items-center">
              <ThemeToggle />
            </div>
            <NotificationBell />

            {/* Desktop Logout button */}
            <button
              onClick={handleLogout}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
              className="hidden lg:flex items-center gap-1.5 text-xs text-muted hover:text-rose transition px-2.5 py-1.5 rounded-lg hover:bg-rose/10 btn-press shrink-0"
            >
              <i className="bi bi-box-arrow-right text-sm" />
              <span>{t('nav.logout')}</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => {
                playClickSound();
                setMobileOpen(true);
              }}
              className="lg:hidden w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-ink rounded-lg hover:bg-surface2 transition btn-press shrink-0"
              aria-label={t('nav.menu')}
            >
              <i className="bi bi-list text-2xl" />
            </button>
          </div>
        </div>
      </header>

      {/* Announcement Banner */}
      {announcement && !bannerDismissed && (
        <div className="bg-gradient-to-r from-indigo/15 via-cyan/15 to-indigo/15 border-b border-indigo/25 px-4 py-2 flex items-center justify-between gap-3 backdrop-blur-sm">
          <div className="flex items-center gap-2.5 text-xs text-ink min-w-0 max-w-4xl mx-auto flex-1">
            <span className="w-5 h-5 rounded-full bg-indigo/20 flex items-center justify-center shrink-0">
              <i className="bi bi-megaphone-fill text-indigo text-xs" />
            </span>
            <span className="font-medium truncate">{announcement}</span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="shrink-0 text-muted hover:text-ink p-1 rounded-md transition"
            aria-label="Dismiss banner"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-surface/95 border-l border-line p-4 flex flex-col justify-between overflow-y-auto backdrop-blur-lg animate-slide-in">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <img src="/logo-mark.png" alt="VietnamDong" className="w-7 h-7" />
                  <span className="font-display font-bold text-sm gradient-text-indigo">Menu</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition"
                >
                  <i className="bi bi-x-lg text-sm" />
                </button>
              </div>

              {/* Mobile User Profile Summary */}
              {me && (
                <Link
                  to="/profile"
                  onClick={() => {
                    playClickSound();
                    setMobileOpen(false);
                  }}
                  className="block p-3.5 rounded-xl bg-surface2/60 border border-line mb-3 hover:border-indigo/40 transition"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    {me.avatar_url ? (
                      <img src={me.avatar_url} alt={me.username} className="w-9 h-9 rounded-full object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-indigo/20 text-indigo flex items-center justify-center font-bold text-sm">
                        {me.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate flex items-center justify-between">
                        <span>{me.username}</span>
                        <i className="bi bi-gear-fill text-muted text-xs" />
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-pulse" />
                        <span>{me.role === 'admin' ? 'Admin' : 'Thành viên'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60">
                    <div className="text-center p-1.5 rounded-lg bg-bg/50">
                      <div className="text-[10px] text-muted">Số dư</div>
                      <div className="font-mono text-xs font-bold text-amber">{me.balance_nova} VNC</div>
                    </div>
                    <div className="text-center p-1.5 rounded-lg bg-bg/50">
                      <div className="text-[10px] text-muted">Chuỗi ngày</div>
                      <div className="font-mono text-xs font-bold text-rose flex items-center justify-center gap-1">
                        <span>{me.streak_days} ngày</span>
                        <i className="bi bi-fire" />
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Drawer Links */}
              <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={isAdmin} />
            </div>

            {/* Drawer Footer Controls */}
            <div className="pt-4 mt-4 border-t border-line space-y-2">
              <div className="flex items-center justify-around py-1 bg-surface2/40 rounded-xl border border-line">
                <SoundToggle />
                <LanguageToggle />
                <ThemeToggle />
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose bg-rose/10 hover:bg-rose/20 transition btn-press"
              >
                <i className="bi bi-box-arrow-right" /> {t('nav.logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="w-full flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* Desktop Sidebar */}
        <aside className="w-64 shrink-0 border-r border-line hidden lg:flex lg:flex-col py-4 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto bg-surface/30 backdrop-blur-sm z-20">
          <NavLinks isAdmin={isAdmin} />
        </aside>

        {/* Content Wrapper (Page Outlet + Footer on Desktop) */}
        <div className="flex-1 flex flex-col min-w-0">
          <main
            key={pathname}
            className="page-enter flex-1 px-3 sm:px-8 py-5 sm:py-6 pb-40 sm:pb-28 lg:pb-8 min-w-0 w-full max-w-7xl mx-auto overflow-x-hidden"
          >
            <Outlet />
          </main>
          <div className="hidden lg:block border-t border-line/60">
            <Footer />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Persistent on screens < lg) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-line/80 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_25px_rgba(0,0,0,0.15)] pb-[calc(0.4rem+env(safe-area-inset-bottom))]">
        <NavLink
          to="/dashboard"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-indigo dark:text-cyan' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`bi ${isActive ? 'bi-grid-1x2-fill' : 'bi-grid-1x2'} text-lg`} />
              <span className="mt-0.5 leading-none">Tổng quan</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-indigo dark:bg-cyan mt-1" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/quests"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-indigo dark:text-cyan' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`bi ${isActive ? 'bi-list-task' : 'bi-list-check'} text-lg`} />
              <span className="mt-0.5 leading-none">Nhiệm vụ</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-indigo dark:bg-cyan mt-1" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/lucky-wheel"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-amber font-bold' : 'text-amber/80 hover:text-amber'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className="bi bi-stars text-xl text-amber animate-pulse-soft" />
              <span className="mt-0.5 leading-none text-amber font-bold">Vòng quay</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-amber mt-1" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/wallet"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-indigo dark:text-cyan' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`bi ${isActive ? 'bi-wallet2' : 'bi-wallet'} text-lg`} />
              <span className="mt-0.5 leading-none">Ví tiền</span>
              {isActive && <span className="w-1 h-1 rounded-full bg-indigo dark:bg-cyan mt-1" />}
            </>
          )}
        </NavLink>

        <button
          onClick={() => {
            playClickSound();
            setMobileOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-semibold text-muted hover:text-ink transition"
          aria-label="Khám phá thêm"
        >
          <i className="bi bi-grid-3x3-gap text-lg" />
          <span className="mt-0.5 leading-none">Khám phá</span>
        </button>
      </nav>

      {/* Mobile Footer */}
      <div className="lg:hidden">
        <Footer />
      </div>
      <BackgroundMusicPlayer />
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { useLanguage } from '../context/LanguageContext.js';
import { useTheme } from '../context/ThemeContext.js';
import { useSettings } from '../context/SettingsContext.js';
import BackgroundMusicPlayer from './BackgroundMusicPlayer.js';
import ErrorBoundary from './ErrorBoundary.js';
import MusicTab from './MusicTab.js';
import NotificationBell from './NotificationBell.js';
import Footer from './Footer.js';
import CurrencyIcon from './CurrencyIcon.js';
import AnimatedNumber from './AnimatedNumber.js';
import LevelBadge from './LevelBadge.js';
import AvatarFrame from './AvatarFrame.js';
import UserName from './UserName.js';
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
      { to: '/daily-reward', icon: 'bi-gift-fill', labelKey: 'nav.daily', badge: 'HOT', badgeColor: 'bg-rose/10 text-rose border border-rose/25' },
      { to: '/lucky-wheel', icon: 'bi-stars', labelKey: 'nav.spin', badge: 'FREE', badgeColor: 'bg-amber/10 text-amber border border-amber/25' },
      { to: '/giftcode', icon: 'bi-ticket-perforated-fill', labelKey: 'nav.giftcode', badge: 'HOT', badgeColor: 'bg-amber/10 text-amber border border-amber/25' },
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
      { to: '/referral', icon: 'bi-people-fill', labelKey: 'nav.referral', badge: '20%', badgeColor: 'bg-indigo/10 text-indigo border border-indigo/25' },
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
    <nav className="flex flex-col gap-4 px-3 py-3">
      {NAV_GROUPS.map((group) => {
        const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
        if (!visibleItems.length) return null;

        return (
          <div key={group.title} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted/60 select-none">
              {group.title}
            </div>
            <div className="space-y-1">
              {visibleItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    playClickSound();
                    if (onNavigate) onNavigate();
                  }}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 group ${
                      isActive
                        ? 'text-blue-400 font-semibold bg-blue-600/15 border border-blue-500/30 shadow-[0_0_18px_rgba(59,130,246,0.18)] dark:bg-blue-600/20 dark:border-blue-500/35 dark:text-blue-400'
                        : 'text-muted hover:text-ink hover:bg-white/[0.04]'
                    }`
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <i
                      className={`bi ${item.icon} text-base shrink-0 transition-transform group-hover:scale-110 group-hover:text-blue-400`}
                    />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                        item.badgeColor || 'bg-blue-500/15 text-blue-400 border border-blue-500/25'
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
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('vnd_desktop_sidebar');
      return stored !== null ? stored === 'true' : true;
    } catch {
      return true;
    }
  });
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [isBannerClamped, setIsBannerClamped] = useState(false);
  const bannerTextRef = useRef<HTMLParagraphElement>(null);
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

  function toggleMenu() {
    playClickSound();
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setDesktopSidebarOpen((prev) => {
        const next = !prev;
        try {
          localStorage.setItem('vnd_desktop_sidebar', String(next));
        } catch {}
        return next;
      });
    } else {
      setMobileOpen(true);
    }
  }

  useEffect(() => {
    const el = bannerTextRef.current;
    if (!el || !announcement) {
      setIsBannerClamped(false);
      return;
    }
    const check = () => {
      setIsBannerClamped(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const frameId = requestAnimationFrame(check);
    window.addEventListener('resize', check);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', check);
    };
  }, [announcement]);

  async function handleLogout() {
    playClickSound();
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header */}
      <header className="border-b border-line/60 sticky top-0 z-30 glass-panel">
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
              <div className="absolute inset-0 rounded-full bg-blue-500/25 blur-sm -z-10 group-hover:bg-blue-500/40 transition" />
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
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-pill hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition btn-press group shrink-0"
                >
                  <CurrencyIcon size={16} />
                  <span className="font-mono text-xs sm:text-sm font-bold text-ink">
                    <AnimatedNumber value={me.balance_nova} />
                  </span>
                  <span className="text-[10px] font-bold text-blue-400 hidden xs:inline">VNC</span>
                  <i className="bi bi-plus-circle-fill text-blue-500 text-xs ml-0.5 group-hover:scale-110 transition-transform hidden sm:inline" />
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

                <Link
                  to="/profile"
                  onClick={playClickSound}
                  title="Hồ sơ & Cài đặt"
                  className="flex items-center gap-1.5 px-2 py-1 rounded-full glass-pill hover:border-blue-500/40 transition btn-press shrink-0"
                >
                  <AvatarFrame level={me.level} shape="circle">
                    {me.avatar_url ? (
                      <img src={me.avatar_url} alt={me.username} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-[9px] sm:text-[10px]">
                        {me.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </AvatarFrame>
                  <LevelBadge level={me.level} size="xs" />
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

            {/* Menu Toggle Button (Mobile Drawer & Desktop Sidebar) */}
            <button
              onClick={toggleMenu}
              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-ink rounded-lg hover:bg-surface2 transition btn-press shrink-0"
              aria-label={t('nav.menu')}
              title="Menu điều hướng"
            >
              <i className="bi bi-list text-2xl" />
            </button>
          </div>
        </div>
      </header>

      {announcement && !bannerDismissed && (
        <div
          onClick={() => {
            if (isBannerClamped) {
              playClickSound();
              setBannerModalOpen(true);
            }
          }}
          className={`bg-gradient-to-r from-indigo/15 via-cyan/15 to-indigo/15 border-b border-indigo/25 px-2 sm:px-4 py-1 flex items-center justify-between gap-1 sm:gap-2 backdrop-blur-sm ${
            isBannerClamped ? 'cursor-pointer hover:bg-indigo/20 transition-colors' : ''
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs text-ink min-w-0 max-w-4xl mx-auto flex-1">
            <div className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0">
              <span className="w-6 h-6 rounded-full bg-indigo/20 flex items-center justify-center">
                <i className="bi bi-megaphone-fill text-indigo text-xs" />
              </span>
            </div>
            <p
              ref={bannerTextRef}
              className="font-medium text-xs text-ink line-clamp-2 break-words [overflow-wrap:anywhere] min-w-0 flex-1 leading-snug"
            >
              {announcement}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              playClickSound();
              setBannerDismissed(true);
            }}
            className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0 text-muted hover:text-ink transition rounded-lg"
            aria-label="Đóng thông báo"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>
      )}

      {bannerModalOpen && announcement && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setBannerModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-surface border border-line rounded-t-2xl sm:rounded-2xl p-4 shadow-2xl flex flex-col max-h-[60vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2 font-semibold text-sm text-ink min-w-0">
                <i className="bi bi-megaphone-fill text-indigo shrink-0" />
                <span className="truncate">Thông báo chung</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setBannerModalOpen(false);
                }}
                className="w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition shrink-0"
                aria-label="Đóng"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] py-3 text-xs sm:text-sm text-ink leading-relaxed break-words [overflow-wrap:anywhere]">
              {announcement}
            </div>
          </div>
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

              {/* Mobile User Profile Summary - Apple Account Widget */}
              {me && (
                <Link
                  to="/profile"
                  onClick={() => {
                    playClickSound();
                    setMobileOpen(false);
                  }}
                  className="block p-3.5 rounded-2xl bg-surface2/60 border border-line mb-3 hover:border-line/80 transition"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <AvatarFrame level={me.level} shape="circle">
                      {me.avatar_url ? (
                        <img src={me.avatar_url} alt={me.username} className="w-9 h-9 rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-indigo/20 text-indigo flex items-center justify-center font-bold text-sm">
                          {me.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </AvatarFrame>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <UserName name={me.username} level={me.level} className="truncate" />
                          <LevelBadge level={me.level} size="xs" />
                        </div>
                        <i className="bi bi-gear-fill text-muted text-xs shrink-0" />
                      </div>
                      <div className="text-[11px] text-muted flex items-center gap-1.5 mt-0.5">
                        <span className="w-2 h-2 rounded-full bg-cyan inline-block animate-pulse" />
                        <span>{me.role === 'admin' ? 'Admin' : 'Thành viên'}</span>
                        <span>•</span>
                        <span>Cấp {me.level ?? 1}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-line/60">
                    <div className="text-center p-2 rounded-xl bg-surface/70 border border-line/40">
                      <div className="text-[10px] text-muted font-medium">Số dư</div>
                      <div className="font-mono text-xs font-bold text-amber">{me.balance_nova} VNC</div>
                    </div>
                    <div className="text-center p-2 rounded-xl bg-surface/70 border border-line/40">
                      <div className="text-[10px] text-muted font-medium">Chuỗi ngày</div>
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
        {/* Desktop Sidebar (Collapsible with toggle & smooth independent scroll - Image 4) */}
        {desktopSidebarOpen ? (
          <aside className="w-64 shrink-0 border-r border-line/60 hidden lg:flex lg:flex-col h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto overscroll-contain glass-sidebar z-20 select-none touch-pan-y transition-all">
            {/* Desktop Sidebar Header (Image 4 Header with << button) */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-line/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shadow-[0_0_12px_rgba(59,130,246,0.2)]">
                  <i className="bi bi-compass" />
                </div>
                <div>
                  <span className="font-display font-bold text-sm text-ink block leading-none">VietnamDong</span>
                  <span className="text-[10px] text-muted font-mono uppercase tracking-wider block mt-0.5">VNC Portal</span>
                </div>
              </div>
              <button
                onClick={() => {
                  playClickSound();
                  setDesktopSidebarOpen(false);
                  try {
                    localStorage.setItem('vnd_desktop_sidebar', 'false');
                  } catch {}
                }}
                className="w-8 h-8 rounded-xl hover:bg-white/[0.06] text-muted hover:text-blue-400 flex items-center justify-center transition btn-press border border-line/40"
                title="Thu gọn menu điều hướng (<<)"
                aria-label="Thu gọn menu"
              >
                <i className="bi bi-chevron-double-left text-sm" />
              </button>
            </div>

            {/* Nav List */}
            <div className="flex-1 overflow-y-auto">
              <NavLinks isAdmin={isAdmin} />
            </div>

            {/* Promo / Cashout Card (Image 4 'Upgrade to Pro' Style) */}
            <div className="p-3 mt-auto">
              <div className="relative rounded-2xl p-3.5 bg-gradient-to-b from-blue-900/25 via-blue-950/40 to-black/60 border border-blue-500/30 backdrop-blur-md overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/35 transition-all" />
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                    <i className="bi bi-lightning-charge-fill text-xs" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink truncate">VietnamDong Pro</div>
                    <div className="text-[10px] text-blue-400/90 font-medium truncate">Đổi thưởng siêu tốc</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted leading-tight mb-2.5">
                  Rút tiền tức thì về ngân hàng hoặc thẻ cào 24/7.
                </p>
                <Link
                  to="/wallet"
                  onClick={playClickSound}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-[0_0_15px_rgba(37,99,235,0.35)] transition-all btn-press"
                >
                  <span>Rút tiền ngay</span>
                  <i className="bi bi-arrow-right text-xs" />
                </Link>
              </div>
            </div>
          </aside>
        ) : (
          /* Mini Collapsed Bar with >> expand button */
          <div className="hidden lg:flex flex-col items-center py-4 px-2 w-14 shrink-0 border-r border-line/60 h-[calc(100vh-4rem)] sticky top-16 glass-sidebar z-20">
            <button
              onClick={() => {
                playClickSound();
                setDesktopSidebarOpen(true);
                try {
                  localStorage.setItem('vnd_desktop_sidebar', 'true');
                } catch {}
              }}
              className="w-9 h-9 rounded-xl hover:bg-white/[0.08] text-blue-400 flex items-center justify-center transition btn-press border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.15)] mb-4"
              title="Mở rộng menu (>>)"
              aria-label="Mở menu"
            >
              <i className="bi bi-chevron-double-right text-sm" />
            </button>
            <div className="flex flex-col gap-3">
              <NavLink to="/dashboard" title="Tổng quan" className={({isActive}) => `w-9 h-9 rounded-xl flex items-center justify-center text-sm transition ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-muted hover:text-ink'}`}>
                <i className="bi bi-grid-1x2-fill" />
              </NavLink>
              <NavLink to="/quests" title="Nhiệm vụ" className={({isActive}) => `w-9 h-9 rounded-xl flex items-center justify-center text-sm transition ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-muted hover:text-ink'}`}>
                <i className="bi bi-list-task" />
              </NavLink>
              <NavLink to="/lucky-wheel" title="Vòng quay" className={({isActive}) => `w-9 h-9 rounded-xl flex items-center justify-center text-sm transition ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-muted hover:text-ink'}`}>
                <i className="bi bi-stars" />
              </NavLink>
              <NavLink to="/wallet" title="Ví tiền" className={({isActive}) => `w-9 h-9 rounded-xl flex items-center justify-center text-sm transition ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-muted hover:text-ink'}`}>
                <i className="bi bi-wallet2" />
              </NavLink>
            </div>
          </div>
        )}

        {/* Content Wrapper (Page Outlet + Footer on Desktop) */}
        <div className="flex-1 flex flex-col min-w-0">
          <main
            key={pathname}
            className="page-enter flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-36 sm:pb-28 lg:pb-8 min-w-0 w-full max-w-6xl mx-auto overflow-x-hidden"
          >
            <Outlet />
          </main>
          <div className="hidden lg:block border-t border-line/60">
            <Footer />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar (Floating Pill Navigation - Image 1) */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40 rounded-full glass-pill px-3 py-1.5 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.65)] border border-white/10 backdrop-blur-2xl">
        <NavLink
          to="/dashboard"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-blue-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`bi ${isActive ? 'bi-grid-1x2-fill' : 'bi-grid-1x2'} text-lg`} />
              <span className="mt-0.5 leading-none">Tổng quan</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] mt-0.5" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/quests"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-blue-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`bi ${isActive ? 'bi-list-task' : 'bi-list-check'} text-lg`} />
              <span className="mt-0.5 leading-none">Nhiệm vụ</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] mt-0.5" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/lucky-wheel"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-blue-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className="bi bi-stars text-lg text-blue-400 animate-pulse-soft" />
              <span className="mt-0.5 leading-none">Vòng quay</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] mt-0.5" />}
            </>
          )}
        </NavLink>

        <NavLink
          to="/wallet"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-blue-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <i className={`bi ${isActive ? 'bi-wallet2' : 'bi-wallet'} text-lg`} />
              <span className="mt-0.5 leading-none">Ví tiền</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6] mt-0.5" />}
            </>
          )}
        </NavLink>

        <button
          onClick={() => {
            playClickSound();
            setMobileOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-full text-[10px] font-semibold text-muted hover:text-ink transition"
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
      <ErrorBoundary
        fallback={(reset) => (
          <div
            className="fixed right-3.5 z-40"
            style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom))' }}
          >
            <button
              type="button"
              onClick={reset}
              className="h-9 px-3 rounded-full bg-surface2/90 border border-line text-muted hover:text-ink shadow-lg flex items-center justify-center gap-1.5 transition backdrop-blur-md text-xs font-semibold"
              title="Thử lại"
              aria-label="Thử lại"
            >
              <i className="bi bi-arrow-clockwise text-xs" />
              <span>Thử lại</span>
            </button>
          </div>
        )}
      >
        <BackgroundMusicPlayer />
      </ErrorBoundary>
    </div>
  );
}

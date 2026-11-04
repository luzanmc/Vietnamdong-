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

interface NavItem {
  to: string;
  icon: string;
  labelKey: string;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

const PRIMARY_NAV: NavItem[] = [
  { to: '/dashboard', icon: 'bi-grid-fill', labelKey: 'nav.dashboard' },
  { to: '/quests', icon: 'bi-lightning-charge-fill', labelKey: 'nav.quests', badge: 'HOT', badgeColor: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  { to: '/lucky-wheel', icon: 'bi-stars', labelKey: 'nav.spin', badge: 'FREE', badgeColor: 'bg-amber/15 text-amber border border-amber/30' },
  { to: '/wallet', icon: 'bi-wallet2', labelKey: 'nav.wallet' },
  { to: '/leaderboard', icon: 'bi-trophy-fill', labelKey: 'nav.leaderboard' },
  { to: '/referral', icon: 'bi-people-fill', labelKey: 'nav.referral', badge: '20%', badgeColor: 'bg-blue-500/15 text-blue-400 border border-blue-500/25' },
  { to: '/profile', icon: 'bi-gear-fill', labelKey: 'nav.profile' },
];

const ADMIN_NAV: NavItem = {
  to: '/admin',
  icon: 'bi-shield-lock-fill',
  labelKey: 'nav.admin',
  adminOnly: true,
};

function SoundToggle({ compact = false }: { compact?: boolean }) {
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
      className={compact 
        ? "flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-muted hover:text-ink transition"
        : "w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press"
      }
    >
      <div className="flex items-center gap-2">
        <i className={`bi ${enabled ? 'bi-volume-up-fill text-blue-400' : 'bi-volume-mute-fill'} text-sm`} />
        {compact && <span>Hiệu ứng âm thanh</span>}
      </div>
      {compact && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enabled ? 'bg-blue-500/20 text-blue-400' : 'bg-surface2 text-muted'}`}>
          {enabled ? 'BẬT' : 'TẮT'}
        </span>
      )}
    </button>
  );
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={() => {
        playClickSound();
        toggle();
      }}
      aria-label="Toggle theme"
      className={compact
        ? "flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-muted hover:text-ink transition"
        : "w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press"
      }
    >
      <div className="flex items-center gap-2">
        <i className={`bi ${theme === 'dark' ? 'bi-sun-fill text-amber' : 'bi-moon-stars-fill text-blue-400'} text-sm`} />
        {compact && <span>Chế độ giao diện</span>}
      </div>
      {compact && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface2 text-muted uppercase">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </button>
  );
}

function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { lang, toggle } = useLanguage();
  return (
    <button
      onClick={() => {
        playClickSound();
        toggle();
      }}
      aria-label="Switch language"
      className={compact
        ? "flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-muted hover:text-ink transition"
        : "flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition px-2.5 py-1.5 rounded-lg hover:bg-surface2 btn-press border border-line/60"
      }
    >
      <div className="flex items-center gap-2">
        <i className="bi bi-translate text-sm text-blue-400" />
        {compact && <span>Ngôn ngữ hiển thị</span>}
      </div>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
        {lang === 'vi' ? 'Tiếng Việt' : 'English'}
      </span>
    </button>
  );
}

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
  const { t } = useLanguage();
  const navItems = isAdmin ? [...PRIMARY_NAV, ADMIN_NAV] : PRIMARY_NAV;

  return (
    <nav className="flex flex-col gap-1.5 px-1 py-1">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={() => {
            playClickSound();
            if (onNavigate) onNavigate();
          }}
          className={({ isActive }) =>
            `flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 group ${
              isActive
                ? 'text-blue-400 font-bold bg-blue-600/20 border border-blue-500/35 shadow-[0_0_20px_rgba(37,99,235,0.25)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.05]'
            }`
          }
        >
          <div className="flex items-center gap-3 min-w-0">
            <i
              className={`bi ${item.icon} text-lg shrink-0 transition-transform group-hover:scale-110 group-hover:text-blue-400`}
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
    </nav>
  );
}

export default function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const { me, logout } = useAuth();
  const { t } = useLanguage();
  const { announcement } = useSettings();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAdmin = me?.role === 'admin';

  // Close mobile drawer & profile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setProfileMenuOpen(false);
  }, [pathname]);

  // Click outside to close profile dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      {/* Minimalist Top Navbar (Image 01) */}
      <header className="border-b border-line/60 sticky top-0 z-40 glass-panel">
        <div className="w-full flex items-center justify-between px-4 sm:px-8 h-16">
          {/* Brand Logo */}
          <Link
            to="/dashboard"
            onClick={playClickSound}
            className="flex items-center gap-3 group shrink-0"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 p-0.5 shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-105 transition-transform">
              <img
                src="/logo-mark.png"
                alt="VietnamDong"
                className="w-full h-full rounded-[14px] object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black text-base sm:text-lg tracking-tight gradient-text-indigo leading-none">
                VietnamDong
              </span>
              <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest leading-none mt-1 hidden xs:inline">
                VNC Platform
              </span>
            </div>
          </Link>

          {/* Clean Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {me && (
              <Link
                to="/wallet"
                onClick={playClickSound}
                title="Số dư & Rút tiền"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full glass-pill hover:border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)] transition btn-press group shrink-0"
              >
                <CurrencyIcon size={16} />
                <span className="font-mono text-xs sm:text-sm font-bold text-ink">
                  <AnimatedNumber value={me.balance_nova} />
                </span>
                <span className="text-[10px] font-bold text-blue-400">VNC</span>
              </Link>
            )}

            <NotificationBell />

            {/* Profile Menu Trigger */}
            {me && (
              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={() => {
                    playClickSound();
                    setProfileMenuOpen((prev) => !prev);
                  }}
                  className="flex items-center gap-1 p-0.5 rounded-full glass-pill hover:border-blue-500/50 transition btn-press"
                  aria-label="Tài khoản cá nhân"
                >
                  <AvatarFrame level={me.level} shape="circle">
                    {me.avatar_url ? (
                      <img src={me.avatar_url} alt={me.username} className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                        {me.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </AvatarFrame>
                </button>

                {/* Profile Popover Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 w-72 rounded-3xl glass-panel p-4 shadow-2xl z-50 border border-white/10 animate-fade-in space-y-3">
                    {/* User info */}
                    <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                      <AvatarFrame level={me.level} shape="circle">
                        {me.avatar_url ? (
                          <img src={me.avatar_url} alt={me.username} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-sm">
                            {me.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </AvatarFrame>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-ink truncate flex items-center gap-1.5">
                          <UserName name={me.username} level={me.level} className="truncate" />
                          <LevelBadge level={me.level} size="xs" />
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span className="text-amber flex items-center gap-1 font-semibold">
                            <i className="bi bi-fire text-xs" /> {me.streak_days}d streak
                          </span>
                          <span>•</span>
                          <span>Cấp {me.level ?? 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* Settings toggles */}
                    <div className="space-y-1">
                      <ThemeToggle compact />
                      <SoundToggle compact />
                      <LanguageToggle compact />
                    </div>

                    {/* Quick Profile Links */}
                    <div className="pt-2 border-t border-white/10 space-y-1 text-xs">
                      <Link
                        to="/profile"
                        onClick={() => { playClickSound(); setProfileMenuOpen(false); }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <i className="bi bi-person-circle text-blue-400 text-sm" />
                        <span>Hồ sơ & Đổi Avatar</span>
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => { playClickSound(); setProfileMenuOpen(false); }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <i className="bi bi-clock-history text-blue-400 text-sm" />
                        <span>Lịch sử giao dịch</span>
                      </Link>
                      <Link
                        to="/giftcode"
                        onClick={() => { playClickSound(); setProfileMenuOpen(false); }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <i className="bi bi-ticket-perforated text-blue-400 text-sm" />
                        <span>Nhập mã Giftcode</span>
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="pt-2 border-t border-white/10">
                      <button
                        onClick={() => {
                          setProfileMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose hover:bg-rose/15 transition"
                      >
                        <i className="bi bi-box-arrow-right" />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="lg:hidden w-9 h-9 flex items-center justify-center text-ink rounded-full glass-pill hover:border-blue-500/40 transition btn-press shrink-0"
              aria-label={t('nav.menu')}
            >
              <i className="bi bi-list text-xl" />
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
          className={`bg-gradient-to-r from-blue-600/15 via-sky-500/15 to-blue-600/15 border-b border-blue-500/25 px-2 sm:px-4 py-1.5 flex items-center justify-between gap-1 sm:gap-2 backdrop-blur-sm ${
            isBannerClamped ? 'cursor-pointer hover:bg-blue-600/20 transition-colors' : ''
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-ink min-w-0 max-w-4xl mx-auto flex-1">
            <span className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <i className="bi bi-megaphone-fill text-blue-400 text-xs" />
            </span>
            <p
              ref={bannerTextRef}
              className="font-medium text-xs text-ink line-clamp-1 break-words [overflow-wrap:anywhere] min-w-0 flex-1 leading-snug"
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
            className="w-8 h-8 flex items-center justify-center shrink-0 text-muted hover:text-ink transition rounded-lg"
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
            className="w-full sm:max-w-md glass-panel border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col max-h-[60vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 font-semibold text-sm text-ink min-w-0">
                <i className="bi bi-megaphone-fill text-blue-400 shrink-0" />
                <span className="truncate">Thông báo chung</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setBannerModalOpen(false);
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-white/[0.08] transition shrink-0"
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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 right-0 h-full w-80 max-w-[85vw] glass-panel border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto backdrop-blur-2xl animate-slide-in">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 p-0.5 shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    <img src="/logo-mark.png" alt="VietnamDong" className="w-full h-full rounded-[14px] object-cover" />
                  </div>
                  <span className="font-display font-bold text-base gradient-text-indigo">Menu</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-white/[0.08] transition"
                >
                  <i className="bi bi-x-lg text-sm" />
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={isAdmin} />
            </div>

            {/* Drawer Footer */}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <ThemeToggle compact />
              <SoundToggle compact />
              <LanguageToggle compact />
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold text-rose bg-rose/10 hover:bg-rose/20 transition btn-press mt-2"
              >
                <i className="bi bi-box-arrow-right" /> {t('nav.logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Layout Area */}
      <div className="w-full flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* Desktop Isolated Floating Sidebar (Image 04) */}
        {desktopSidebarOpen ? (
          <aside className="w-64 shrink-0 hidden lg:flex lg:flex-col h-[calc(100vh-5.5rem)] sticky top-20 my-3 ml-4 rounded-[2rem] glass-sidebar p-4 select-none z-20 justify-between shadow-2xl border border-white/10 transition-all duration-300">
            <div>
              {/* Desktop Sidebar Header */}
              <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/10 px-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 flex items-center justify-center text-white text-xs shadow-[0_0_15px_rgba(37,99,235,0.4)]">
                    <i className="bi bi-grid-fill" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-ink block leading-tight">VietnamDong</span>
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider block">VNC Portal</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    playClickSound();
                    setDesktopSidebarOpen(false);
                    try { localStorage.setItem('vnd_desktop_sidebar', 'false'); } catch {}
                  }}
                  className="w-8 h-8 rounded-full hover:bg-white/[0.08] text-muted hover:text-white flex items-center justify-center transition btn-press"
                  title="Thu gọn menu (<<)"
                  aria-label="Thu gọn menu"
                >
                  <i className="bi bi-chevron-double-left text-sm" />
                </button>
              </div>

              {/* Nav List */}
              <NavLinks isAdmin={isAdmin} />
            </div>

            {/* Promo Card (Image 04 - Upgrade to Pro Style) */}
            <div className="pt-2">
              <div className="relative rounded-2xl p-4 bg-gradient-to-b from-blue-900/35 via-blue-950/50 to-black/80 border border-blue-500/30 overflow-hidden group shadow-lg">
                <div className="absolute -top-8 -right-8 w-20 h-20 bg-blue-500/25 rounded-full blur-xl pointer-events-none group-hover:bg-blue-500/40 transition-all" />
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <i className="bi bi-lightning-charge-fill text-blue-400" />
                    <span>Đổi Thưởng VNC</span>
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-zinc-400 mb-3 leading-tight">
                  Rút tiền về tài khoản ngân hàng & thẻ cào 24/7 tức thì.
                </p>
                <Link
                  to="/wallet"
                  onClick={playClickSound}
                  className="w-full block py-2 px-3 text-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(37,99,235,0.45)] transition btn-press"
                >
                  Rút tiền ngay →
                </Link>
              </div>
            </div>
          </aside>
        ) : (
          /* Collapsed Pill Bar (Image 04 - Center variation) */
          <aside className="w-20 shrink-0 hidden lg:flex lg:flex-col h-[calc(100vh-5.5rem)] sticky top-20 my-3 ml-4 rounded-[2.5rem] glass-sidebar p-3 select-none z-20 justify-between items-center shadow-2xl border border-white/10 transition-all duration-300">
            {/* Expand button on top */}
            <button
              onClick={() => {
                playClickSound();
                setDesktopSidebarOpen(true);
                try { localStorage.setItem('vnd_desktop_sidebar', 'true'); } catch {}
              }}
              className="w-10 h-10 rounded-2xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/35 flex items-center justify-center transition btn-press shadow-[0_0_15px_rgba(37,99,235,0.3)]"
              title="Mở rộng menu (>>)"
              aria-label="Mở menu"
            >
              <i className="bi bi-chevron-double-right text-sm" />
            </button>

            {/* Center Icons */}
            <div className="flex flex-col gap-2 w-full items-center">
              {(isAdmin ? [...PRIMARY_NAV, ADMIN_NAV] : PRIMARY_NAV).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={playClickSound}
                  title={t(item.labelKey)}
                  className={({ isActive }) =>
                    `w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition relative ${
                      isActive
                        ? 'bg-blue-600/25 text-blue-400 border border-blue-500/40 shadow-[0_0_15px_rgba(37,99,235,0.3)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <i className={`bi ${item.icon} text-lg`} />
                      {isActive && <span className="w-1 h-1 rounded-full bg-blue-400 shadow-[0_0_6px_#60a5fa] mt-0.5" />}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Bottom Avatar with online dot */}
            <Link
              to="/profile"
              onClick={playClickSound}
              title="Trang cá nhân"
              className="relative group p-1"
            >
              <AvatarFrame level={me?.level} shape="circle">
                {me?.avatar_url ? (
                  <img src={me.avatar_url} alt={me.username} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-xs">
                    {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
                  </div>
                )}
              </AvatarFrame>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black absolute -bottom-0.5 -right-0.5 shadow-sm" />
            </Link>
          </aside>
        )}

        {/* Content Wrapper */}
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
      {/* Floating Discreet Music Pill */}
      <div className="fixed right-4 bottom-20 lg:bottom-5 z-30 pointer-events-auto">
        <MusicTab />
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

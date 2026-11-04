import React, { useState, useEffect, useRef } from 'react';
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
import {
  IconLayoutDashboard,
  IconBolt,
  IconSparkles,
  IconWallet,
  IconGift,
  IconTicket,
  IconSubtitles,
  IconCode,
  IconFlame,
  IconHistory,
  IconTrophy,
  IconChartBar,
  IconUsers,
  IconHeadset,
  IconHelpCircle,
  IconShieldLock,
  IconMenu2,
  IconChevronsLeft,
  IconChevronsRight,
  IconArrowRight,
  IconSun,
  IconMoon,
  IconVolume,
  IconVolumeOff,
  IconLanguage,
  IconLogout,
  IconUser,
  IconX,
  IconExternalLink,
  IconSpeakerphone,
} from '@tabler/icons-react';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string; stroke?: number }>;
  labelKey: string;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Tổng quan',
    items: [
      { to: '/dashboard', icon: IconLayoutDashboard, labelKey: 'nav.dashboard' },
      { to: '/quests', icon: IconBolt, labelKey: 'nav.quests', badge: 'HOT', badgeColor: 'bg-sky-500/15 text-sky-400 border border-sky-500/25' },
      { to: '/lucky-wheel', icon: IconSparkles, labelKey: 'nav.spin', badge: 'FREE', badgeColor: 'bg-amber-400/15 text-amber-300 border border-amber-400/25' },
      { to: '/wallet', icon: IconWallet, labelKey: 'nav.wallet' },
    ],
  },
  {
    title: 'Tiện ích & Thưởng',
    items: [
      { to: '/redeem', icon: IconGift, labelKey: 'nav.redeem' },
      { to: '/giftcode', icon: IconTicket, labelKey: 'nav.giftcode' },
      { to: '/vietsub-studio', icon: IconSubtitles, labelKey: 'nav.vietsub' },
      { to: '/creator-code', icon: IconCode, labelKey: 'nav.creator' },
      { to: '/daily-reward', icon: IconFlame, labelKey: 'nav.daily', badge: 'STREAK', badgeColor: 'bg-amber-400/15 text-amber-300 border border-amber-400/25' },
    ],
  },
  {
    title: 'Cộng đồng',
    items: [
      { to: '/achievements', icon: IconTrophy, labelKey: 'nav.achievements' },
      { to: '/leaderboard', icon: IconChartBar, labelKey: 'nav.leaderboard' },
      { to: '/referral', icon: IconUsers, labelKey: 'nav.referral', badge: '20%', badgeColor: 'bg-sky-500/15 text-sky-400 border border-sky-500/25' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { to: '/history', icon: IconHistory, labelKey: 'nav.history' },
      { to: '/support', icon: IconHeadset, labelKey: 'nav.support' },
      { to: '/faq', icon: IconHelpCircle, labelKey: 'nav.faq' },
    ],
  },
];

const ADMIN_ITEM: NavItem = {
  to: '/admin',
  icon: IconShieldLock,
  labelKey: 'nav.admin',
  adminOnly: true,
};

// Primary icons for the collapsed vertical bar (Image 4 middle)
const COLLAPSED_ITEMS: NavItem[] = [
  { to: '/dashboard', icon: IconLayoutDashboard, labelKey: 'nav.dashboard' },
  { to: '/quests', icon: IconBolt, labelKey: 'nav.quests' },
  { to: '/lucky-wheel', icon: IconSparkles, labelKey: 'nav.spin' },
  { to: '/wallet', icon: IconWallet, labelKey: 'nav.wallet' },
  { to: '/giftcode', icon: IconTicket, labelKey: 'nav.giftcode' },
  { to: '/leaderboard', icon: IconChartBar, labelKey: 'nav.leaderboard' },
  { to: '/referral', icon: IconUsers, labelKey: 'nav.referral' },
  { to: '/history', icon: IconHistory, labelKey: 'nav.history' },
];

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
      className={
        compact
          ? 'flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-muted hover:text-ink transition'
          : 'w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press'
      }
    >
      <div className="flex items-center gap-2">
        {enabled ? (
          <IconVolume size={18} className="text-sky-400" />
        ) : (
          <IconVolumeOff size={18} className="text-muted" />
        )}
        {compact && <span>Hiệu ứng âm thanh</span>}
      </div>
      {compact && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            enabled ? 'bg-sky-500/20 text-sky-400' : 'bg-surface2 text-muted'
          }`}
        >
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
      className={
        compact
          ? 'flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-muted hover:text-ink transition'
          : 'w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-surface2 transition btn-press'
      }
    >
      <div className="flex items-center gap-2">
        {theme === 'dark' ? (
          <IconSun size={18} className="text-amber-400" />
        ) : (
          <IconMoon size={18} className="text-sky-400" />
        )}
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
      className={
        compact
          ? 'flex items-center justify-between w-full p-2.5 rounded-xl hover:bg-white/[0.06] text-xs font-medium text-muted hover:text-ink transition'
          : 'flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition px-2.5 py-1.5 rounded-lg hover:bg-surface2 btn-press border border-line/60'
      }
    >
      <div className="flex items-center gap-2">
        <IconLanguage size={18} className="text-sky-400" />
        {compact && <span>Ngôn ngữ hiển thị</span>}
      </div>
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
        {lang === 'vi' ? 'Tiếng Việt' : 'English'}
      </span>
    </button>
  );
}

// Sidebar Navigation list with grouped categories (Full menu, perfectly styled like Image 04)
function SidebarNavList({
  onNavigate,
  isAdmin,
}: {
  onNavigate?: () => void;
  isAdmin: boolean;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4 py-1 pr-1">
      {NAV_SECTIONS.map((section) => {
        const items =
          section.title === 'Hệ thống' && isAdmin
            ? [...section.items, ADMIN_ITEM]
            : section.items;

        return (
          <div key={section.title} className="space-y-1">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              {section.title}
            </div>
            <div className="space-y-1">
              {items.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => {
                      playClickSound();
                      if (onNavigate) onNavigate();
                    }}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 group relative ${
                        isActive
                          ? 'bg-sky-500/[0.12] border border-sky-500/25 text-white font-semibold shadow-[0_0_15px_rgba(56,189,248,0.18)]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Left vertical accent indicator bar (1:1 with Image 04) */}
                          <span
                            className={`w-1.5 h-5 rounded-full transition-all shrink-0 ${
                              isActive
                                ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
                                : 'opacity-0'
                            }`}
                          />
                          <IconComponent
                            size={19}
                            stroke={isActive ? 2.2 : 1.75}
                            className={`shrink-0 transition-all ${
                              isActive
                                ? 'text-sky-400'
                                : 'text-zinc-400 group-hover:text-white group-hover:scale-110'
                            }`}
                          />
                          <span className="truncate">{t(item.labelKey)}</span>
                        </div>
                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              item.badgeColor ||
                              'bg-sky-500/15 text-sky-400 border border-sky-500/25'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 3D Isometric Mini Cube Illustration (Image 04 Promo Card)
function IsometricCubeIcon() {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 drop-shadow-[0_4px_12px_rgba(56,189,248,0.35)]"
    >
      {/* Top Cube */}
      <polygon points="24,4 40,13 24,22 8,13" fill="#38BDF8" fillOpacity="0.85" />
      <polygon points="8,13 24,22 24,35 8,26" fill="#0284C7" fillOpacity="0.9" />
      <polygon points="40,13 24,22 24,35 40,26" fill="#60A5FA" fillOpacity="0.95" />
      {/* Bottom Floating Slice */}
      <polygon points="24,28 36,35 24,42 12,35" fill="#38BDF8" fillOpacity="0.45" />
      <polygon points="12,35 24,42 24,46 12,39" fill="#0369A1" fillOpacity="0.6" />
      <polygon points="36,35 24,42 24,46 36,39" fill="#3B82F6" fillOpacity="0.6" />
    </svg>
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
  const location = useLocation();
  const { pathname } = useLocation();
  const isAdmin = me?.role === 'admin';

  // Determine current page title for the mobile header
  const getCurrentPageTitle = () => {
    if (pathname.startsWith('/dashboard')) return 'Dashboard';
    if (pathname.startsWith('/quests')) return 'Nhiệm vụ';
    if (pathname.startsWith('/lucky-wheel')) return 'Vòng quay';
    if (pathname.startsWith('/wallet')) return 'Ví & Rút tiền';
    if (pathname.startsWith('/redeem')) return 'Đổi thưởng';
    if (pathname.startsWith('/giftcode')) return 'Nhập Giftcode';
    if (pathname.startsWith('/vietsub-studio')) return 'Vietsub Studio';
    if (pathname.startsWith('/creator-code')) return 'Creator Code';
    if (pathname.startsWith('/daily-reward')) return 'Điểm danh';
    if (pathname.startsWith('/achievements')) return 'Thành tích';
    if (pathname.startsWith('/leaderboard')) return 'Bảng xếp hạng';
    if (pathname.startsWith('/referral')) return 'Giới thiệu';
    if (pathname.startsWith('/history')) return 'Lịch sử';
    if (pathname.startsWith('/profile')) return 'Tài khoản';
    if (pathname.startsWith('/support')) return 'Hỗ trợ';
    if (pathname.startsWith('/faq')) return 'Hỏi đáp';
    if (pathname.startsWith('/admin')) return 'Quản trị';
    return 'VietnamDong';
  };

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
    <div className="min-h-screen bg-bg flex flex-col text-ink selection:bg-sky-500/30 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.08] sticky top-0 z-40 glass-panel">
        <div className="w-full flex items-center justify-between px-3 sm:px-6 h-16">
          {/* Left: Mobile Menu Trigger + Title OR Desktop Brand */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger / Menu button with Tabler icon */}
            <button
              onClick={() => {
                playClickSound();
                setMobileOpen(true);
              }}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-ink rounded-xl hover:bg-white/[0.08] border border-white/10 transition btn-press shrink-0"
              aria-label="Mở menu điều hướng"
              title="Menu"
            >
              <IconMenu2 size={22} className="text-sky-400" />
            </button>

            {/* Mobile Current Page Header */}
            <div className="lg:hidden flex items-center gap-2">
              <span className="font-display font-bold text-base text-white tracking-tight">
                {getCurrentPageTitle()}
              </span>
            </div>

            {/* Desktop Brand Logo matching Image 04 Lumen Style */}
            <Link
              to="/dashboard"
              onClick={playClickSound}
              className="hidden lg:flex items-center gap-3 group shrink-0"
            >
              {/* Double circle organic gradient drop logo (Image 04) */}
              <div className="relative w-9 h-9 shrink-0 flex items-center justify-center">
                <span className="absolute w-7 h-7 rounded-full bg-blue-600 blur-sm opacity-60" />
                <span className="absolute w-6 h-6 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 shadow-[0_0_15px_rgba(56,189,248,0.6)]" />
                <span className="absolute w-4 h-4 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-400 opacity-90 -top-0.5 -right-0.5 shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="font-display font-black text-lg tracking-tight text-white leading-none">
                  VietnamDong
                </span>
                <span className="text-[10px] font-mono text-zinc-400 tracking-wider leading-none mt-1">
                  VNC Platform
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Cluster: Music Player + Balance + Notifications + Profile */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Integrated Music Player inside Navbar (not stuck in screen corner) */}
            <div className="hidden md:flex items-center">
              <MusicTab />
            </div>

            {/* Balance Pill */}
            {me && (
              <Link
                to="/wallet"
                onClick={playClickSound}
                title="Số dư & Rút tiền"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill hover:border-sky-500/40 hover:shadow-[0_0_15px_rgba(56,189,248,0.25)] transition btn-press group shrink-0"
              >
                <CurrencyIcon size={16} />
                <span className="font-mono text-xs sm:text-sm font-bold text-white">
                  <AnimatedNumber value={me.balance_nova} />
                </span>
                <span className="text-[10px] font-bold text-sky-400">VNC</span>
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
                  className="flex items-center gap-1 p-0.5 rounded-full glass-pill hover:border-sky-500/50 transition btn-press"
                  aria-label="Tài khoản cá nhân"
                >
                  <AvatarFrame level={me.level} shape="circle">
                    {me.avatar_url ? (
                      <img
                        src={me.avatar_url}
                        alt={me.username}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                        {me.username.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </AvatarFrame>
                </button>

                {/* Profile Popover Menu */}
                {profileMenuOpen && (
                  <div className="absolute right-0 top-12 w-72 rounded-2xl glass-panel p-4 shadow-2xl z-50 border border-white/10 animate-fade-in space-y-3">
                    {/* User info */}
                    <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                      <AvatarFrame level={me.level} shape="circle">
                        {me.avatar_url ? (
                          <img
                            src={me.avatar_url}
                            alt={me.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                            {me.username.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </AvatarFrame>
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                          <UserName name={me.username} level={me.level} className="truncate" />
                          <LevelBadge level={me.level} size="xs" />
                        </div>
                        <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-2">
                          <span className="text-amber-400 flex items-center gap-1 font-semibold">
                            <IconFlame size={13} className="text-amber-400" /> {me.streak_days}d streak
                          </span>
                          <span>•</span>
                          <span>Cấp {me.level ?? 1}</span>
                        </div>
                      </div>
                    </div>

                    {/* Integrated Mobile Music Tab in Profile dropdown */}
                    <div className="md:hidden pb-2 border-b border-white/10">
                      <div className="text-[10px] font-bold uppercase text-zinc-400 mb-1.5">
                        Nhạc nền & Âm thanh
                      </div>
                      <MusicTab />
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
                        onClick={() => {
                          playClickSound();
                          setProfileMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <IconUser size={16} className="text-sky-400" />
                        <span>Hồ sơ & Đổi Avatar</span>
                      </Link>
                      <Link
                        to="/history"
                        onClick={() => {
                          playClickSound();
                          setProfileMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <IconHistory size={16} className="text-sky-400" />
                        <span>Lịch sử giao dịch</span>
                      </Link>
                      <Link
                        to="/giftcode"
                        onClick={() => {
                          playClickSound();
                          setProfileMenuOpen(false);
                        }}
                        className="flex items-center gap-2.5 p-2 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.06] transition"
                      >
                        <IconTicket size={16} className="text-sky-400" />
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
                        className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/15 transition"
                      >
                        <IconLogout size={16} />
                        <span>{t('nav.logout')}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Announcement Banner */}
      {announcement && !bannerDismissed && (
        <div
          onClick={() => {
            if (isBannerClamped) {
              playClickSound();
              setBannerModalOpen(true);
            }
          }}
          className={`bg-gradient-to-r from-sky-500/10 via-blue-500/10 to-sky-500/10 border-b border-sky-500/20 px-3 sm:px-4 py-1.5 flex items-center justify-between gap-2 backdrop-blur-sm ${
            isBannerClamped ? 'cursor-pointer hover:bg-sky-500/15 transition-colors' : ''
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-ink min-w-0 max-w-4xl mx-auto flex-1">
            <span className="w-6 h-6 rounded-full bg-sky-500/15 flex items-center justify-center shrink-0">
              <IconSpeakerphone size={14} className="text-sky-400" />
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
            className="w-7 h-7 flex items-center justify-center shrink-0 text-muted hover:text-ink transition rounded-lg hover:bg-white/[0.08]"
            aria-label="Đóng thông báo"
          >
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* Announcement Modal Popup */}
      {bannerModalOpen && announcement && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-md"
          onClick={() => setBannerModalOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md glass-panel border border-white/10 rounded-t-2xl sm:rounded-2xl p-5 shadow-2xl flex flex-col max-h-[60vh]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 font-semibold text-sm text-ink min-w-0">
                <IconSpeakerphone size={18} className="text-sky-400 shrink-0" />
                <span className="truncate">Thông báo chung</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  setBannerModalOpen(false);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-muted hover:text-ink hover:bg-white/[0.08] transition shrink-0"
                aria-label="Đóng"
              >
                <IconX size={14} />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[60vh] py-3 text-xs sm:text-sm text-ink leading-relaxed break-words [overflow-wrap:anywhere]">
              {announcement}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer (SLIDES FROM THE LEFT AS REQUESTED) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute top-0 left-0 h-full w-80 max-w-[85vw] glass-panel border-r border-white/10 p-5 flex flex-col justify-between overflow-y-auto backdrop-blur-2xl animate-slide-in-left">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 mb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  {/* Lumen Style Double Drop Logo */}
                  <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                    <span className="absolute w-6 h-6 rounded-full bg-blue-600 blur-sm opacity-60" />
                    <span className="absolute w-5 h-5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
                    <span className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-400 -top-0.5 -right-0.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-white block leading-tight">
                      VietnamDong
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider block">
                      Điều hướng
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-muted hover:text-white hover:bg-white/[0.08] transition"
                  aria-label="Đóng menu"
                >
                  <IconX size={18} />
                </button>
              </div>

              {/* Full Categorized Navigation */}
              <SidebarNavList onNavigate={() => setMobileOpen(false)} isAdmin={isAdmin} />
            </div>

            {/* Drawer Footer with controls */}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-2">
              <ThemeToggle compact />
              <SoundToggle compact />
              <LanguageToggle compact />
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition btn-press mt-2"
              >
                <IconLogout size={16} /> {t('nav.logout')}
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Body Layout: Fixed Left Sidebar + Main Content */}
      <div className="w-full flex flex-1 min-h-[calc(100vh-4rem)]">
        {/* DESKTOP ISOLATED FLOATING SIDEBAR (100% MATCHING IMAGE 04) */}
        {desktopSidebarOpen ? (
          <aside className="w-64 shrink-0 hidden lg:flex lg:flex-col h-[calc(100vh-5.5rem)] sticky top-20 my-3 ml-4 rounded-2xl glass-sidebar p-4 select-none z-20 justify-between shadow-2xl border border-white/10 transition-all duration-300">
            <div className="flex flex-col min-h-0 flex-1">
              {/* Header: Logo + App Name + Collapse Button (<<) */}
              <div className="flex items-center justify-between pb-3.5 mb-2 border-b border-white/10 px-1 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 shrink-0 flex items-center justify-center">
                    <span className="absolute w-6 h-6 rounded-full bg-blue-600 blur-sm opacity-60" />
                    <span className="absolute w-5 h-5 rounded-full bg-gradient-to-tr from-sky-400 to-blue-600 shadow-[0_0_12px_rgba(56,189,248,0.5)]" />
                    <span className="absolute w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-sky-200 to-cyan-400 -top-0.5 -right-0.5" />
                  </div>
                  <div>
                    <span className="font-display font-bold text-sm text-white block leading-tight">
                      VietnamDong
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono tracking-wider block">
                      VNC Portal
                    </span>
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
                  className="w-8 h-8 rounded-xl hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition btn-press border border-white/5"
                  title="Thu gọn menu (<<)"
                  aria-label="Thu gọn menu"
                >
                  <IconChevronsLeft size={18} />
                </button>
              </div>

              {/* Scrollable Navigation Sections (All 15 routes preserved) */}
              <div className="overflow-y-auto flex-1 no-scrollbar pr-0.5">
                <SidebarNavList isAdmin={isAdmin} />
              </div>
            </div>

            {/* Bottom Card (Image 04 - Upgrade to Pro Style) */}
            <div className="pt-3 shrink-0">
              <div className="relative rounded-2xl p-4 bg-gradient-to-b from-white/[0.08] via-white/[0.03] to-black/75 border border-white/10 overflow-hidden group shadow-lg">
                <div className="absolute -top-8 -right-8 w-24 h-24 bg-sky-400/20 rounded-full blur-xl pointer-events-none group-hover:bg-sky-400/35 transition-all" />

                <div className="flex items-start justify-between gap-2 mb-2 relative z-10">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-bold text-white">Rút Thưởng VNC</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-tight">
                      Quy đổi VNC sang thẻ cào, Momo & ATM 24/7 tức thì.
                    </p>
                  </div>
                  <IsometricCubeIcon />
                </div>

                <Link
                  to="/wallet"
                  onClick={playClickSound}
                  className="w-full flex items-center justify-between py-2 px-3.5 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs transition shadow-md relative z-10 btn-press mt-1"
                >
                  <span>Rút tiền ngay</span>
                  <IconArrowRight size={14} stroke={2.5} />
                </Link>
              </div>
            </div>
          </aside>
        ) : (
          /* COLLAPSED VARIANT (IMAGE 04 CENTER COLUMN) */
          <aside className="w-20 shrink-0 hidden lg:flex lg:flex-col h-[calc(100vh-5.5rem)] sticky top-20 my-3 ml-4 rounded-2xl glass-sidebar p-3 select-none z-20 justify-between items-center shadow-2xl border border-white/10 transition-all duration-300">
            {/* Top: Expand Toggle Button (>>) */}
            <button
              onClick={() => {
                playClickSound();
                setDesktopSidebarOpen(true);
                try {
                  localStorage.setItem('vnd_desktop_sidebar', 'true');
                } catch {}
              }}
              className="w-11 h-11 rounded-2xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 flex items-center justify-center transition btn-press shadow-[0_0_15px_rgba(56,189,248,0.25)]"
              title="Mở rộng menu (>>)"
              aria-label="Mở rộng menu"
            >
              <IconChevronsRight size={20} />
            </button>

            {/* Middle: Stack of Main Icons with active dots underneath */}
            <div className="flex flex-col gap-2 w-full items-center my-auto">
              {COLLAPSED_ITEMS.map((item) => {
                const IconComponent = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={playClickSound}
                    title={t(item.labelKey)}
                    className={({ isActive }) =>
                      `w-11 h-11 rounded-2xl flex flex-col items-center justify-center transition relative ${
                        isActive
                          ? 'bg-sky-500/[0.15] text-sky-400 border border-sky-500/35 shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                          : 'text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <IconComponent size={20} stroke={isActive ? 2.2 : 1.75} />
                        {isActive && (
                          <span className="w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8] mt-0.5" />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* Bottom: User Avatar circle with green online indicator dot */}
            <Link
              to="/profile"
              onClick={playClickSound}
              title="Trang cá nhân"
              className="relative group p-1"
            >
              <AvatarFrame level={me?.level} shape="circle">
                {me?.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={me.username}
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    {me?.username?.slice(0, 2).toUpperCase() || 'VN'}
                  </div>
                )}
              </AvatarFrame>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black absolute -bottom-0.5 -right-0.5 shadow-sm" />
            </Link>
          </aside>
        )}

        {/* Content Wrapper */}
        <div className="flex-1 flex flex-col min-w-0">
          <main
            key={pathname}
            className="page-enter flex-1 px-3 sm:px-6 lg:px-8 py-6 pb-36 sm:pb-28 lg:pb-8 min-w-0 w-full max-w-6xl mx-auto overflow-x-hidden"
          >
            <Outlet />
          </main>
          <div className="hidden lg:block border-t border-line/60">
            <Footer />
          </div>
        </div>
      </div>

      {/* Mobile Floating Bottom Bar for Fast Navigation */}
      <nav className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md z-40 rounded-2xl glass-pill px-3 py-1.5 flex items-center justify-around shadow-[0_12px_40px_rgba(0,0,0,0.7)] border border-white/10 backdrop-blur-2xl">
        <NavLink
          to="/dashboard"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-sky-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconLayoutDashboard size={19} stroke={isActive ? 2.2 : 1.75} />
              <span className="mt-0.5 leading-none">Tổng quan</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] mt-0.5" />
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/quests"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-sky-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconBolt size={19} stroke={isActive ? 2.2 : 1.75} />
              <span className="mt-0.5 leading-none">Nhiệm vụ</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] mt-0.5" />
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/lucky-wheel"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-sky-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconSparkles size={19} stroke={isActive ? 2.2 : 1.75} className="text-amber-400" />
              <span className="mt-0.5 leading-none">Vòng quay</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] mt-0.5" />
              )}
            </>
          )}
        </NavLink>

        <NavLink
          to="/wallet"
          onClick={playClickSound}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold transition-all relative ${
              isActive ? 'text-sky-400' : 'text-muted hover:text-ink'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconWallet size={19} stroke={isActive ? 2.2 : 1.75} />
              <span className="mt-0.5 leading-none">Ví tiền</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] mt-0.5" />
              )}
            </>
          )}
        </NavLink>

        <button
          onClick={() => {
            playClickSound();
            setMobileOpen(true);
          }}
          className="flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-semibold text-muted hover:text-ink transition"
          aria-label="Khám phá menu đầy đủ"
        >
          <IconMenu2 size={19} />
          <span className="mt-0.5 leading-none">Menu</span>
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
              className="h-9 px-3 rounded-xl bg-surface2/90 border border-line text-muted hover:text-ink shadow-lg flex items-center justify-center gap-1.5 transition backdrop-blur-md text-xs font-semibold"
              title="Thử lại"
              aria-label="Thử lại"
            >
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

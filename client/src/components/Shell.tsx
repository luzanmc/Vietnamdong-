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
  IconTrophy,
  IconChartBar,
  IconUsers,
  IconHistory,
  IconHeadset,
  IconHelpCircle,
  IconShieldCheck,
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
  IconSearch,
  IconCoin,
  IconCrown,
  IconCheck,
  IconChevronDown,
  IconTrendingUp,
} from '@tabler/icons-react';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string; stroke?: number }>;
  label: string;
  badge?: string;
  badgeColor?: string;
  adminOnly?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Chính',
    items: [
      { to: '/dashboard', icon: IconLayoutDashboard, label: 'Dashboard' },
      { to: '/quests', icon: IconBolt, label: 'Nhiệm vụ', badge: 'HOT', badgeColor: 'bg-rose-500/15 text-rose-500' },
      { to: '/lucky-wheel', icon: IconSparkles, label: 'Vòng quay', badge: 'FREE', badgeColor: 'bg-amber-400/15 text-amber-500' },
      { to: '/wallet', icon: IconWallet, label: 'Ví tiền' },
    ],
  },
  {
    title: 'Tiện ích',
    items: [
      { to: '/redeem', icon: IconGift, label: 'Đổi thưởng' },
      { to: '/giftcode', icon: IconTicket, label: 'Giftcode', badge: 'HOT', badgeColor: 'bg-rose-500/15 text-rose-500' },
      { to: '/daily-reward', icon: IconFlame, label: 'Điểm danh', badge: 'STREAK', badgeColor: 'bg-amber-400/15 text-amber-500' },
      { to: '/vietsub-studio', icon: IconSubtitles, label: 'Vietsub Studio' },
      { to: '/creator-code', icon: IconCode, label: 'Creator Code' },
    ],
  },
  {
    title: 'Cộng đồng',
    items: [
      { to: '/achievements', icon: IconTrophy, label: 'Thành tựu' },
      { to: '/leaderboard', icon: IconChartBar, label: 'Xếp hạng' },
      { to: '/referral', icon: IconUsers, label: 'Giới thiệu', badge: '20%', badgeColor: 'bg-sky-500/15 text-sky-500' },
    ],
  },
  {
    title: 'Hệ thống',
    items: [
      { to: '/history', icon: IconHistory, label: 'Lịch sử' },
      { to: '/chart', icon: IconTrendingUp, label: 'Biểu đồ VNC' },
      { to: '/security', icon: IconShieldCheck, label: 'Bảo mật' },
      { to: '/support', icon: IconHeadset, label: 'Hỗ trợ' },
      { to: '/faq', icon: IconHelpCircle, label: 'FAQ' },
      { to: '/admin', icon: IconShieldLock, label: 'Quản trị', adminOnly: true },
    ],
  },
];

export default function Shell() {
  const { me, logout } = useAuth();
  const { t, lang, toggle: toggleLanguage } = useLanguage();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [mini, setMini] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [searchQuery, setSearchQuery] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close menus on route change
  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  // Click outside listener for user dropdown
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSoundToggle() {
    const next = toggleSound();
    setSoundOn(next);
    if (next) playClickSound();
  }

  function handleLangToggle() {
    playClickSound();
    toggleLanguage();
  }

  function handleLogout() {
    playClickSound();
    logout();
    navigate('/login');
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.trim().toLowerCase();
    // Quick search route
    if (q.includes('vòng') || q.includes('quay') || q.includes('spin') || q.includes('wheel')) {
      navigate('/lucky-wheel');
    } else if (q.includes('rút') || q.includes('ví') || q.includes('wallet')) {
      navigate('/wallet');
    } else if (q.includes('gift') || q.includes('code')) {
      navigate('/giftcode');
    } else if (q.includes('điểm') || q.includes('danh') || q.includes('streak')) {
      navigate('/daily-reward');
    } else {
      navigate(`/quests?q=${encodeURIComponent(searchQuery.trim())}`);
    }
    setSearchQuery('');
  }

  return (
    <div className="min-h-screen bg-bg text-ink flex flex-col antialiased">
      {/* Mobile Drawer Backdrop Scrim */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-[#0a142d]/60 backdrop-blur-sm z-50 lg:hidden transition-opacity"
        />
      )}

      {/* Main Flex App Wrapper (matching VND-Dashboard .app) */}
      <div className="flex gap-4 p-3 sm:p-4 min-h-screen flex-1">
        {/* ========================================================= */}
        {/* SIDEBAR (.side from VND-Dashboard)                        */}
        {/* ========================================================= */}
        <aside
          className={`
            fixed lg:sticky top-3 sm:top-4 z-50 lg:z-30 h-[calc(100dvh-24px)] sm:h-[calc(100dvh-32px)]
            bg-surface border border-line rounded-2xl shadow-[0_8px_30px_rgba(47,123,255,0.08)]
            flex flex-col p-4 transition-all duration-300 overflow-y-auto no-scrollbar
            ${mini ? 'w-[76px]' : 'w-[260px]'}
            ${mobileOpen ? 'left-3 sm:left-4 translate-x-0' : '-translate-x-[120%] lg:translate-x-0'}
          `}
        >
          {/* Brand header */}
          <div className={`flex items-center gap-2.5 pb-3 border-b border-line ${mini ? 'justify-center' : 'justify-between'}`}>
            <Link
              to="/dashboard"
              onClick={playClickSound}
              className="flex items-center gap-2.5 min-w-0 text-decoration-none group"
            >
              <img
                src="/logo-mark.png"
                alt="VietnamDong"
                className="w-9 h-9 object-contain rounded-xl shrink-0 group-hover:scale-105 transition-transform"
              />
              {!mini && (
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-[15px] leading-tight text-ink tracking-tight truncate">
                    VietnamDong
                  </span>
                  <span className="text-[10px] text-muted tracking-wide font-medium">
                    VNC Platform
                  </span>
                </div>
              )}
            </Link>

            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => {
                playClickSound();
                setMini(!mini);
              }}
              title={mini ? 'Mở rộng menu' : 'Thu gọn menu'}
              className="hidden lg:flex w-7 h-7 rounded-lg text-muted hover:text-indigo hover:bg-surface2 items-center justify-center transition"
            >
              {mini ? <IconChevronsRight size={16} /> : <IconChevronsLeft size={16} />}
            </button>

            {/* Mobile close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-surface2 flex items-center justify-center transition"
            >
              <IconX size={18} />
            </button>
          </div>

          {/* Navigation Items (Grouped) */}
          <nav className="flex-1 py-3 flex flex-col gap-1 overflow-y-auto no-scrollbar">
            {NAV_GROUPS.map((group, gIdx) => {
              const visibleItems = group.items.filter((it) => !it.adminOnly || me?.role === 'admin');
              if (visibleItems.length === 0) return null;

              return (
                <div key={gIdx} className="space-y-0.5 mb-2">
                  {!mini && (
                    <div className="text-[11px] font-bold text-muted uppercase tracking-wider px-3 pt-2 pb-1">
                      {group.title}
                    </div>
                  )}

                  {visibleItems.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={playClickSound}
                        title={mini ? item.label : undefined}
                        className={({ isActive }) => `
                          flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-[13px]
                          transition-all relative text-decoration-none group
                          ${
                            isActive
                              ? 'bg-surface2 text-indigo font-bold shadow-sm'
                              : 'text-muted hover:text-ink hover:bg-surface2/60'
                          }
                          ${mini ? 'justify-center px-0' : ''}
                        `}
                      >
                        {({ isActive }) => (
                          <>
                            {/* Left active line indicator */}
                            {isActive && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-indigo" />
                            )}
                            <IconComp
                              size={18}
                              stroke={isActive ? 2.2 : 1.8}
                              className={`shrink-0 transition-transform group-hover:scale-110 ${
                                isActive ? 'text-indigo' : 'text-muted group-hover:text-ink'
                              }`}
                            />
                            {!mini && (
                              <>
                                <span className="truncate">{item.label}</span>
                                {item.badge && (
                                  <span
                                    className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                                      item.badgeColor || 'bg-surface2 text-indigo'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })}
          </nav>

          {/* Bottom Sidebar Box (.sb) */}
          <div className="pt-2 border-t border-line flex flex-col gap-2.5 shrink-0">
            {/* VIP Upgrade Banner (.upg from VND-Dashboard) */}
            {!mini && (
              <div className="upg-vnd text-white">
                <i className="shape o1" />
                <i className="shape o2" />
                <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold tracking-wide px-2 py-0.5 rounded-full bg-white/20 border border-white/30 mb-2">
                  <IconCrown size={12} className="text-amber-300" />
                  <span>VIP</span>
                </div>
                <b className="block text-sm font-extrabold leading-tight">Nâng cấp VIP</b>
                <p className="text-[11px] text-white/80 mt-0.5 mb-2.5 leading-snug">
                  Mở khóa thưởng x2 và rút tiền siêu tốc.
                </p>
                <ul className="space-y-1.5 mb-3 text-[11px] text-white/90">
                  <li className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <IconCheck size={11} stroke={3} />
                    </span>
                    <span>Thưởng nhiệm vụ x2</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <IconCheck size={11} stroke={3} />
                    </span>
                    <span>Rút tiền ưu tiên</span>
                  </li>
                </ul>
                <Link
                  to="/profile"
                  onClick={playClickSound}
                  className="w-full py-2 px-3 rounded-xl bg-white text-indigo font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:bg-slate-50 transition active:scale-95"
                >
                  <span>Xem đặc quyền</span>
                  <IconArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Quick 3 Controls: Theme, Sound, Lang (.m3) */}
            <div className={`flex gap-1.5 ${mini ? 'flex-col items-center' : 'justify-center'}`}>
              <button
                onClick={() => {
                  playClickSound();
                  toggleTheme();
                }}
                title={theme === 'dark' ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
                className="w-9 h-9 rounded-xl bg-surface2 text-muted hover:text-indigo hover:bg-surface2/80 flex items-center justify-center transition active:scale-95"
              >
                {theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
              </button>
              <button
                onClick={handleSoundToggle}
                title={soundOn ? 'Âm thanh: BẬT' : 'Âm thanh: TẮT'}
                className="w-9 h-9 rounded-xl bg-surface2 text-muted hover:text-indigo hover:bg-surface2/80 flex items-center justify-center transition active:scale-95"
              >
                {soundOn ? <IconVolume size={17} /> : <IconVolumeOff size={17} />}
              </button>
              <button
                onClick={handleLangToggle}
                title={lang === 'vi' ? 'Ngôn ngữ: Tiếng Việt' : 'Language: English'}
                className="w-9 h-9 rounded-xl bg-surface2 text-muted hover:text-indigo hover:bg-surface2/80 flex items-center justify-center transition active:scale-95"
              >
                <IconLanguage size={17} />
              </button>
            </div>

            {/* Logout button (.out) */}
            <button
              onClick={handleLogout}
              className={`
                flex items-center justify-center gap-2 h-9 rounded-xl
                bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white
                font-bold text-xs transition-all active:scale-95
                ${mini ? 'w-9 p-0 mx-auto' : 'w-full px-3'}
              `}
              title="Đăng xuất"
            >
              <IconLogout size={16} />
              {!mini && <span>Đăng xuất</span>}
            </button>
          </div>
        </aside>

        {/* ========================================================= */}
        {/* MAIN COLUMN (.main from VND-Dashboard)                     */}
        {/* ========================================================= */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Top Navbar (.top from VND-Dashboard) */}
          <header className="sticky top-3 sm:top-4 z-40 bg-surface border border-line rounded-2xl shadow-[0_4px_20px_rgba(47,123,255,0.06)] px-3 sm:px-4 py-2.5 flex items-center gap-3">
            {/* Mobile Hamburger */}
            <button
              onClick={() => {
                playClickSound();
                setMobileOpen(true);
              }}
              className="lg:hidden w-9 h-9 rounded-xl bg-surface2 text-muted hover:text-ink flex items-center justify-center transition"
              aria-label="Menu"
            >
              <IconMenu2 size={20} />
            </button>

            {/* Search Input (.search) */}
            <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-xs items-center gap-2 bg-surface2 rounded-xl px-3 h-9 text-muted border border-transparent focus-within:border-indigo/50 transition">
              <IconSearch size={16} className="shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm nhiệm vụ, tính năng..."
                className="bg-transparent border-0 outline-none text-xs text-ink placeholder:text-muted w-full font-body"
              />
            </form>

            {/* Spacer */}
            <div className="flex-1 sm:hidden" />

            {/* Integrated Music Player Tab */}
            <div className="hidden md:flex items-center">
              <MusicTab />
            </div>

            {/* Quick Balance Pill (.bal) */}
            <Link
              to="/wallet"
              onClick={playClickSound}
              className="flex items-center gap-1.5 px-3 h-9 rounded-xl bg-surface2 text-indigo font-bold text-xs sm:text-[13px] border border-line hover:border-indigo/40 transition active:scale-95"
              title="Ví của bạn"
            >
              <CurrencyIcon size={16} />
              <AnimatedNumber value={me?.balance_nova ?? 0} />
              <span className="text-[11px] font-semibold opacity-90">VNC</span>
            </Link>

            {/* Theme Toggle Button */}
            <button
              onClick={() => {
                playClickSound();
                toggleTheme();
              }}
              className="w-9 h-9 rounded-xl bg-surface2 text-muted hover:text-indigo flex items-center justify-center transition active:scale-95"
              aria-label="Đổi giao diện Sáng/Tối"
            >
              {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
            </button>

            {/* Notification Bell with Badge */}
            <NotificationBell />

            {/* User Profile Menu (.usr from VND-Dashboard) */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => {
                  playClickSound();
                  setUserMenuOpen(!userMenuOpen);
                }}
                className="flex items-center gap-2 p-1 sm:pr-2.5 rounded-xl hover:bg-surface2 transition active:scale-95"
              >
                {/* User Avatar */}
                <AvatarFrame
                  level={me?.level}
                  frame={me?.avatar_frame}
                  className="w-8 h-8"
                >
                  {me?.avatar_url ? (
                    <img src={me.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-cyan to-indigo flex items-center justify-center text-white font-bold text-xs select-none">
                      {me?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </AvatarFrame>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-ink leading-tight truncate max-w-[100px]">
                    {me?.username || 'Tài khoản'}
                  </span>
                  <span className="text-[10px] text-muted font-medium">
                    Lv.{me?.level || 1} · VIP
                  </span>
                </div>

                <IconChevronDown size={14} className="text-muted hidden sm:block" />
              </button>

              {/* Dropdown Menu (.menu) */}
              {userMenuOpen && (
                <div className="absolute right-0 top-11 w-48 bg-surface border border-line rounded-2xl shadow-[0_16px_40px_rgba(15,27,51,0.18)] p-1.5 z-50 flex flex-col gap-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <Link
                    to="/profile"
                    onClick={playClickSound}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-surface2 transition"
                  >
                    <IconUser size={16} className="text-indigo" />
                    <span>Hồ sơ cá nhân</span>
                  </Link>
                  <Link
                    to="/history"
                    onClick={playClickSound}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-surface2 transition"
                  >
                    <IconHistory size={16} className="text-indigo" />
                    <span>Lịch sử giao dịch</span>
                  </Link>
                  <Link
                    to="/wallet"
                    onClick={playClickSound}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-surface2 transition"
                  >
                    <IconWallet size={16} className="text-indigo" />
                    <span>Ví tiền & Rút</span>
                  </Link>
                  <div className="h-px bg-line my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition text-left w-full"
                  >
                    <IconLogout size={16} />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </header>

          {/* Page Body / Router Outlet */}
          <main className="flex-1 pb-16 lg:pb-6">
            <Outlet />
          </main>

          {/* Footer (User explicitly requested to keep original footer of the web) */}
          <Footer />
        </div>
      </div>

      {/* ========================================================= */}
      {/* MOBILE BOTTOM TAB BAR (.tabs from VND-Dashboard)           */}
      {/* ========================================================= */}
      <nav className="tabs-vnd lg:hidden">
        {/* 1. Trang chủ */}
        <NavLink
          to="/dashboard"
          onClick={playClickSound}
          className={({ isActive }) => `tb-vnd ${isActive ? 'active' : ''}`}
        >
          <IconLayoutDashboard size={20} />
          <span>Trang chủ</span>
        </NavLink>

        {/* 2. Nhiệm vụ */}
        <NavLink
          to="/quests"
          onClick={playClickSound}
          className={({ isActive }) => `tb-vnd ${isActive ? 'active' : ''}`}
        >
          <IconBolt size={20} />
          <span>Nhiệm vụ</span>
        </NavLink>

        {/* 3. Center Elevated FAB: Vòng quay (.fab from VND-Dashboard) */}
        <NavLink
          to="/lucky-wheel"
          onClick={playClickSound}
          className="fab-vnd"
          aria-label="Vòng quay may mắn"
        >
          <IconSparkles size={24} />
        </NavLink>

        {/* 4. Ví tiền */}
        <NavLink
          to="/wallet"
          onClick={playClickSound}
          className={({ isActive }) => `tb-vnd ${isActive ? 'active' : ''}`}
        >
          <IconWallet size={20} />
          <span>Ví</span>
        </NavLink>

        {/* 5. Hồ sơ */}
        <NavLink
          to="/profile"
          onClick={playClickSound}
          className={({ isActive }) => `tb-vnd ${isActive ? 'active' : ''}`}
        >
          <IconUser size={20} />
          <span>Hồ sơ</span>
        </NavLink>
      </nav>

      {/* Background Music Player Bridge */}
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
              title="Thử lại âm thanh"
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

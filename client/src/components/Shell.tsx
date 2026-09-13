import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { to: '/dashboard', icon: 'bi-grid-1x2-fill', label: 'Tổng quan' },
  { to: '/chart', icon: 'bi-graph-up', label: 'Biểu đồ Nova' },
  { to: '/daily-reward', icon: 'bi-gift', label: 'Quà thưởng ngày' },
  { to: '/leaderboard', icon: 'bi-trophy', label: 'Bảng xếp hạng' },
  { to: '/wallet', icon: 'bi-cash-coin', label: 'Ví / Rút tiền' },
  { to: '/redeem', icon: 'bi-controller', label: 'Đổi thưởng' },
  { to: '/creator-code', icon: 'bi-tag', label: 'Creator Code' },
  { to: '/admin', icon: 'bi-shield-lock', label: 'Quản trị', adminOnly: true },
];

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
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
          <i className={`bi ${item.icon} w-4`} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { me, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = me?.role === 'admin';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-line sticky top-0 z-30 bg-bg/90 backdrop-blur">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2">
            <img src="/logo-mark.png" alt="VietnamDong" className="w-7 h-7" />
            <span className="font-display font-semibold tracking-tight">VietnamDong</span>
          </div>
          <div className="flex items-center gap-3">
            {me && (
              <div className="hidden md:flex items-center gap-2 text-sm text-muted">
                {me.avatar_url && <img src={me.avatar_url} alt={me.username} className="w-6 h-6 rounded-full" />}
                <span>{me.username}</span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="hidden md:flex items-center gap-1.5 text-xs text-muted hover:text-rose transition px-2 py-1.5 rounded-md hover:bg-surface2"
            >
              <i className="bi bi-box-arrow-right" /> Đăng xuất
            </button>
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-9 h-9 flex items-center justify-center text-ink"
              aria-label="Mở menu"
            >
              <i className="bi bi-list text-xl" />
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute top-0 right-0 h-full w-64 bg-surface border-l border-line p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-sm">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="w-8 h-8 flex items-center justify-center text-muted">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <NavLinks onNavigate={() => setMobileOpen(false)} isAdmin={isAdmin} />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 mt-2 rounded-md text-sm text-rose hover:bg-surface2 transition"
            >
              <i className="bi bi-box-arrow-right" /> Đăng xuất
            </button>
          </aside>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto flex">
        <aside className="w-56 shrink-0 border-r border-line hidden md:block py-4 h-[calc(100vh-56px)] sticky top-14">
          <NavLinks isAdmin={isAdmin} />
        </aside>
        <main className="flex-1 px-4 sm:px-5 py-6 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

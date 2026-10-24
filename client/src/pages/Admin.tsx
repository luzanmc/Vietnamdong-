import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAuthGate from './admin/AdminAuthGate.js';
import AdminDashboard from './admin/AdminDashboard.js';
import AdminAnalytics from './admin/AdminAnalytics.js';
import AdminUsers from './admin/AdminUsers.js';
import AdminAnnouncements from './admin/AdminAnnouncements.js';
import AdminCodes from './admin/AdminCodes.js';
import AdminWithdrawals from './admin/AdminWithdrawals.js';
import AdminRedeem from './admin/AdminRedeem.js';
import AdminTasks from './admin/AdminTasks.js';
import AdminVietsub from './admin/AdminVietsub.js';
import AdminSupport from './admin/AdminSupport.js';
import AdminAlerts from './admin/AdminAlerts.js';
import AdminReports from './admin/AdminReports.js';
import AdminSettings from './admin/AdminSettings.js';
import AdminRelatedAccounts from './admin/AdminRelatedAccounts.js';
import AdminSecurityHealth from './admin/AdminSecurityHealth.js';

type TabKey =
  | 'dashboard'
  | 'analytics'
  | 'users'
  | 'related_accounts'
  | 'security_health'
  | 'announcements'
  | 'codes'
  | 'withdrawals'
  | 'redeem'
  | 'tasks'
  | 'vietsub'
  | 'support'
  | 'alerts'
  | 'reports'
  | 'settings';

interface TabDef {
  key: TabKey;
  label: string;
  icon: string;
}

const TABS: TabDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
  { key: 'analytics', label: 'Thống kê', icon: 'bi-graph-up' },
  { key: 'users', label: 'Người dùng', icon: 'bi-people' },
  { key: 'related_accounts', label: 'Tài khoản liên quan', icon: 'bi-diagram-3' },
  { key: 'security_health', label: 'Sức khỏe bảo mật', icon: 'bi-heart-pulse' },
  { key: 'announcements', label: 'Thông báo web', icon: 'bi-megaphone' },
  { key: 'codes', label: 'Tạo code', icon: 'bi-qr-code' },
  { key: 'withdrawals', label: 'Rút tiền', icon: 'bi-cash-coin' },
  { key: 'redeem', label: 'Đổi thưởng', icon: 'bi-controller' },
  { key: 'tasks', label: 'Nhiệm vụ', icon: 'bi-list-check' },
  { key: 'vietsub', label: 'Vietsub Studio', icon: 'bi-badge-cc' },
  { key: 'support', label: 'Hỗ trợ', icon: 'bi-headset' },
  { key: 'alerts', label: 'Cảnh báo', icon: 'bi-bell' },
  { key: 'reports', label: 'Báo cáo', icon: 'bi-file-earmark-spreadsheet' },
  { key: 'settings', label: 'Cài đặt', icon: 'bi-sliders' },
];

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('dashboard');
  const navigate = useNavigate();

  async function handleLogoutAdmin() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
      window.location.reload();
    } catch {
    }
  }

  return (
    <AdminAuthGate>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-line">
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
              <i className="bi bi-shield-shaded text-indigo" /> Trang Quản Trị Hệ Thống
            </h1>
            <p className="text-[11px] text-muted mt-0.5">
              Phiên quản trị viên đang hoạt động (tự động gia hạn 30 phút khi thao tác)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/admin/advanced')}
              className="px-3.5 py-2 bg-gradient-to-r from-rose/20 via-amber/20 to-purple/20 border border-amber/40 hover:border-amber text-ink rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <i className="bi bi-shield-lock-fill text-amber" />
              <span>Quản lý nâng cao</span>
            </button>
            <button
              onClick={handleLogoutAdmin}
              className="p-2 rounded-xl bg-surface2 border border-line text-muted hover:text-rose transition text-xs"
              title="Đăng xuất phiên Admin"
            >
              <i className="bi bi-box-arrow-right" />
            </button>
          </div>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition ${
                tab === t.key
                  ? 'bg-indigo text-white border-indigo shadow-sm'
                  : 'bg-surface border-line text-muted hover:text-ink hover:bg-surface2'
              }`}
            >
              <i className={`bi ${t.icon}`} />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        <div>
          {tab === 'dashboard' && <AdminDashboard onSelectTab={(t) => setTab(t as TabKey)} />}
          {tab === 'analytics' && <AdminAnalytics />}
          {tab === 'users' && <AdminUsers />}
          {tab === 'related_accounts' && <AdminRelatedAccounts />}
          {tab === 'security_health' && <AdminSecurityHealth />}
          {tab === 'announcements' && <AdminAnnouncements />}
          {tab === 'codes' && <AdminCodes />}
          {tab === 'withdrawals' && <AdminWithdrawals />}
          {tab === 'redeem' && <AdminRedeem />}
          {tab === 'tasks' && <AdminTasks />}
          {tab === 'vietsub' && <AdminVietsub />}
          {tab === 'support' && <AdminSupport />}
          {tab === 'alerts' && <AdminAlerts />}
          {tab === 'reports' && <AdminReports />}
          {tab === 'settings' && <AdminSettings />}
        </div>
      </div>
    </AdminAuthGate>
  );
}

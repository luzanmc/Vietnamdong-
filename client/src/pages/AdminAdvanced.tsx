import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminAdvancedAuthGate from './admin/advanced/AdminAdvancedAuthGate.js';
import AdminAdvancedDatabases from './admin/advanced/AdminAdvancedDatabases.js';
import AdminAdvancedUsers from './admin/advanced/AdminAdvancedUsers.js';
import AdminAdvancedAdmins from './admin/advanced/AdminAdvancedAdmins.js';

type AdvancedTabKey = 'databases' | 'users' | 'admins';

export default function AdminAdvanced() {
  const [tab, setTab] = useState<AdvancedTabKey>('databases');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-bg text-ink py-6 px-3 sm:px-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose to-amber flex items-center justify-center text-white text-lg shadow-md shrink-0">
            <i className="bi bi-shield-shaded" />
          </div>
          <div>
            <h1 className="font-display text-lg sm:text-xl font-bold flex items-center gap-2">
              Quản Trị Nâng Cao (Advanced)
            </h1>
            <p className="text-[11px] text-muted">
              Khu vực nhạy cảm: Databases chỉ đọc, Quản lý tài khoản sâu và Quản lý Admin web
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/admin')}
          className="px-3.5 py-2 rounded-xl bg-surface2 border border-line text-xs font-semibold text-muted hover:text-ink transition flex items-center gap-1.5"
        >
          <i className="bi bi-arrow-left" /> Quay lại Admin thường
        </button>
      </div>

      <AdminAdvancedAuthGate>
        <div className="flex gap-2 border-b border-line pb-2 overflow-x-auto no-scrollbar">
          {(
            [
              { key: 'databases', label: 'Cơ sở dữ liệu (Read-only)', icon: 'bi-database' },
              { key: 'users', label: 'Users nâng cao', icon: 'bi-person-gear' },
              { key: 'admins', label: 'Quản lý Admin & Audit Log', icon: 'bi-shield-check' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-2 shrink-0 ${
                tab === t.key
                  ? 'bg-rose text-white shadow-md'
                  : 'bg-surface border border-line text-muted hover:text-ink hover:bg-surface2'
              }`}
            >
              <i className={`bi ${t.icon}`} /> {t.label}
            </button>
          ))}
        </div>

        <div>
          {tab === 'databases' && <AdminAdvancedDatabases />}
          {tab === 'users' && <AdminAdvancedUsers />}
          {tab === 'admins' && <AdminAdvancedAdmins />}
        </div>
      </AdminAdvancedAuthGate>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../components/Skeleton.js';
import AdminDangerousModal from '../AdminDangerousModal.js';

interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  created_at: string;
}

interface AuditLogRow {
  id: string;
  admin_id: string;
  admin_username: string;
  action: string;
  target: string | null;
  payload: string | null;
  ip: string | null;
  created_at: string;
}

export default function AdminAdvancedAdmins() {
  const [admins, setAdmins] = useState<AdminUser[] | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[] | null>(null);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [addEmail, setAddEmail] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<AdminUser | null>(null);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function loadAdmins() {
    try {
      const res = await fetch('/api/admin/advanced/admins', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setAdmins(data);
    } catch {
    }
  }

  async function loadAuditLogs(p = auditPage) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/advanced/audit-logs?page=${p}&limit=20`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setAuditLogs(data.rows);
        setAuditTotal(data.total);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdmins();
    loadAuditLogs(auditPage);
  }, [auditPage]);

  async function confirmAddAdmin(totpCode: string) {
    if (!addEmail.trim()) return;
    const res = await fetch('/api/admin/advanced/admins/add', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addEmail.trim(), totpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi thêm quản trị viên');
    setMsg(`Đã cấp quyền Quản trị viên cho email "${addEmail.trim()}"`);
    setShowAddModal(false);
    setAddEmail('');
    loadAdmins();
    loadAuditLogs(1);
  }

  async function confirmRemoveAdmin(totpCode: string) {
    if (!removeTarget) return;
    const res = await fetch('/api/admin/advanced/admins/remove', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminId: removeTarget.id, totpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi gỡ quyền quản trị viên');
    setMsg(`Đã gỡ quyền Quản trị viên của "${removeTarget.username}"`);
    setRemoveTarget(null);
    loadAdmins();
    loadAuditLogs(1);
  }

  const auditTotalPages = Math.max(1, Math.ceil(auditTotal / 20));

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-shield-check text-indigo" /> Danh sách Quản trị viên hệ thống ({admins?.length ?? 0})
            </h3>
            <p className="text-[11px] text-muted">
              Quản lý các tài khoản có quyền truy cập trang quản trị. Yêu cầu xác thực TOTP khi thêm hoặc gỡ quyền.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <i className="bi bi-person-plus" /> Thêm Quản trị viên
          </button>
        </div>

        {msg && (
          <div className="p-3 bg-cyan/15 border border-cyan/30 text-cyan text-xs rounded-xl flex items-center gap-2">
            <i className="bi bi-check-circle" /> {msg}
          </div>
        )}
        {err && (
          <div className="p-3 bg-rose/15 border border-rose/30 text-rose text-xs rounded-xl flex items-center gap-2">
            <i className="bi bi-exclamation-triangle" /> {err}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {!admins ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : (
            admins.map((adm) => (
              <div
                key={adm.id}
                className="p-3.5 bg-surface2 border border-line rounded-xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-surface border border-line flex items-center justify-center text-xs shrink-0 font-bold text-indigo">
                    {adm.username.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-xs text-ink truncate block">{adm.username}</span>
                    <span className="text-[10px] text-muted truncate block">{adm.email || adm.id}</span>
                  </div>
                </div>

                <button
                  onClick={() => setRemoveTarget(adm)}
                  className="p-1.5 rounded-lg border border-rose/30 bg-rose/15 text-rose hover:bg-rose/25 text-xs transition shrink-0"
                  title="Gỡ quyền Admin"
                >
                  <i className="bi bi-person-x" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-journal-text text-amber" /> Nhật ký hoạt động quản trị (Admin Audit Log)
            </h3>
            <p className="text-[11px] text-muted">
              Mọi hành động nhạy cảm đều được ghi lại với IP và nội dung thực thi
            </p>
          </div>
          <button
            onClick={() => loadAuditLogs(auditPage)}
            className="p-2 rounded-xl bg-surface2 border border-line text-xs text-muted hover:text-ink transition"
            title="Làm mới log"
          >
            <i className="bi bi-arrow-repeat" />
          </button>
        </div>

        <div className="block sm:hidden space-y-2.5">
          {loading || !auditLogs ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-muted py-4 text-center">Chưa có bản ghi nhật ký nào.</p>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-3 bg-surface2 border border-line rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-indigo">{log.admin_username}</span>
                  <span className="text-[10px] text-muted">{new Date(log.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="font-mono text-[11px] text-amber font-semibold">{log.action}</div>
                {log.payload && (
                  <p className="font-mono text-[10px] text-muted bg-surface p-1.5 rounded-lg break-all">
                    {log.payload}
                  </p>
                )}
                <div className="text-[10px] text-muted flex justify-between">
                  <span>Target: {log.target || '-'}</span>
                  <span className="font-mono">{log.ip || '-'}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:block border border-line rounded-xl overflow-hidden bg-surface2">
          <table className="w-full text-xs">
            <thead className="bg-surface text-muted uppercase text-[10px] border-b border-line">
              <tr>
                <th className="text-left px-3.5 py-2.5">Admin</th>
                <th className="text-left px-3.5 py-2.5">Hành động</th>
                <th className="text-left px-3.5 py-2.5">Target</th>
                <th className="text-left px-3.5 py-2.5">Payload rút gọn</th>
                <th className="text-left px-3.5 py-2.5">IP</th>
                <th className="text-right px-3.5 py-2.5">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading || !auditLogs ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="px-3.5 py-2.5">
                      <Skeleton className="h-5 w-full rounded" />
                    </td>
                  </tr>
                ))
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3.5 py-6 text-center text-muted">
                    Chưa có bản ghi nào.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface/50 transition">
                    <td className="px-3.5 py-2.5 font-semibold text-indigo">{log.admin_username}</td>
                    <td className="px-3.5 py-2.5 font-mono text-amber font-bold text-[11px]">{log.action}</td>
                    <td className="px-3.5 py-2.5 font-mono text-muted text-[11px]">{log.target || '-'}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[10px] text-muted max-w-[240px] truncate" title={log.payload || ''}>
                      {log.payload || '-'}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[11px] text-muted">{log.ip || '-'}</td>
                    <td className="px-3.5 py-2.5 text-right text-muted text-[10px]">
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {auditTotalPages > 1 && (
          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-muted">Tổng cộng {auditTotal} bản ghi</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                disabled={auditPage <= 1}
                className="p-1.5 rounded-lg border border-line disabled:opacity-40"
              >
                <i className="bi bi-chevron-left" />
              </button>
              <span className="font-mono text-muted px-2">
                {auditPage} / {auditTotalPages}
              </span>
              <button
                onClick={() => setAuditPage((p) => Math.min(auditTotalPages, p + 1))}
                disabled={auditPage >= auditTotalPages}
                className="p-1.5 rounded-lg border border-line disabled:opacity-40"
              >
                <i className="bi bi-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-person-plus text-indigo" /> Thêm Quản trị viên mới
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">Email tài khoản</label>
              <input
                type="email"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="admin@example.com"
                className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
                required
              />
            </div>
            <AdminDangerousModal
              title={`Cấp quyền Quản trị viên cho ${addEmail || 'tài khoản'}`}
              description="Tài khoản này sẽ có toàn quyền truy cập quản trị hệ thống. Thao tác yêu cầu xác thực mã TOTP của bạn."
              confirmLabel="Xác nhận thêm Admin"
              onCancel={() => setShowAddModal(false)}
              onConfirm={confirmAddAdmin}
            />
          </div>
        </div>
      )}

      {removeTarget && (
        <AdminDangerousModal
          title={`Gỡ quyền Quản trị viên của ${removeTarget.username}`}
          description={`Bạn sắp hạ quyền tài khoản "${removeTarget.username}" (${removeTarget.email || removeTarget.id}) xuống thành viên thường. Thao tác này yêu cầu nhập mã TOTP của bạn.`}
          confirmLabel="Xác nhận gỡ quyền"
          onCancel={() => setRemoveTarget(null)}
          onConfirm={confirmRemoveAdmin}
        />
      )}
    </div>
  );
}

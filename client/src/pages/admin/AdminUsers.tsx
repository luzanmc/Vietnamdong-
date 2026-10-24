import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';
import AvatarFrame from '../../components/AvatarFrame.js';
import UserName from '../../components/UserName.js';
import LevelBadge from '../../components/LevelBadge.js';
import AdminDangerousModal from './AdminDangerousModal.js';

interface AdminUserRow {
  id: string;
  username: string;
  email: string | null;
  avatar_url: string | null;
  balance_nova: number;
  role: 'user' | 'admin';
  created_at: string;
  locked: number;
  xp: number;
  level: number;
  avatar_frame: string | null;
  card_bg: string | null;
  card_id: string | null;
  banned_at: string | null;
  ban_reason: string | null;
}

export default function AdminUsers() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeUser, setActiveUser] = useState<AdminUserRow | null>(null);
  const [actionTab, setActionTab] = useState<'balance' | 'xp' | 'profile' | 'role'>('balance');

  const [balanceForm, setBalanceForm] = useState({ amount: '', reason: '' });
  const [xpForm, setXpForm] = useState({ xp: '', xpDelta: '' });
  const [profileForm, setProfileForm] = useState({
    username: '',
    avatar_url: '',
    avatar_frame: '',
    card_bg: '',
  });

  const [modalMessage, setModalMessage] = useState('');
  const [modalError, setModalError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [demoteModalUser, setDemoteModalUser] = useState<AdminUserRow | null>(null);

  async function loadUsers(p = page, q = search) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&page=${p}&limit=15`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setRows(data.rows);
        setTotal(data.total);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(page, search);
  }, [page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    loadUsers(1, search);
  }

  function openEditModal(u: AdminUserRow) {
    setActiveUser(u);
    setActionTab('balance');
    setBalanceForm({ amount: '', reason: '' });
    setXpForm({ xp: String(u.xp), xpDelta: '' });
    setProfileForm({
      username: u.username,
      avatar_url: u.avatar_url || '',
      avatar_frame: u.avatar_frame || '',
      card_bg: u.card_bg || '',
    });
    setModalMessage('');
    setModalError('');
  }

  async function handleAdjustBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUser) return;
    const amount = Number(balanceForm.amount);
    if (!amount) return;
    if (!balanceForm.reason.trim()) {
      setModalError('Vui lòng nhập lý do điều chỉnh số dư');
      return;
    }

    setActionLoading(true);
    setModalError('');
    setModalMessage('');

    try {
      const res = await fetch(`/api/admin/users/${activeUser.id}/adjust-balance`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: balanceForm.reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi điều chỉnh số dư');
      setModalMessage('Điều chỉnh số dư thành công');
      setBalanceForm({ amount: '', reason: '' });
      loadUsers(page, search);
    } catch (err: any) {
      setModalError(err.message || 'Lỗi hệ thống');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdjustXp(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUser) return;

    setActionLoading(true);
    setModalError('');
    setModalMessage('');

    try {
      const body: any = {};
      if (xpForm.xpDelta.trim()) body.xpDelta = Number(xpForm.xpDelta);
      else if (xpForm.xp.trim()) body.xp = Number(xpForm.xp);
      else throw new Error('Vui lòng nhập giá trị XP');

      const res = await fetch(`/api/admin/users/${activeUser.id}/adjust-xp`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi điều chỉnh cấp & XP');
      setModalMessage(`Đã cập nhật XP thành ${data.xp} (Cấp ${data.level})`);
      setXpForm({ xp: String(data.xp), xpDelta: '' });
      loadUsers(page, search);
    } catch (err: any) {
      setModalError(err.message || 'Lỗi hệ thống');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!activeUser) return;

    setActionLoading(true);
    setModalError('');
    setModalMessage('');

    try {
      const res = await fetch(`/api/admin/users/${activeUser.id}/update-profile`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: profileForm.username.trim(),
          avatar_url: profileForm.avatar_url.trim() || null,
          avatar_frame: profileForm.avatar_frame.trim() || null,
          card_bg: profileForm.card_bg.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi cập nhật hồ sơ');
      setModalMessage('Đã lưu thông tin hồ sơ thành công');
      loadUsers(page, search);
    } catch (err: any) {
      setModalError(err.message || 'Lỗi hệ thống');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleLock(u: AdminUserRow) {
    const action = u.locked ? 'unlock' : 'lock';
    try {
      await fetch(`/api/admin/users/${u.id}/${action}`, {
        method: 'POST',
        credentials: 'include',
      });
      loadUsers(page, search);
    } catch {
    }
  }

  async function handleRoleChangeDirect(u: AdminUserRow, newRole: 'user' | 'admin') {
    if (u.role === 'admin' && newRole === 'user') {
      setDemoteModalUser(u);
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${u.id}/change-role`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || 'Lỗi đổi quyền');
      loadUsers(page, search);
    } catch {
    }
  }

  async function confirmDemoteWithTotp(totpCode: string) {
    if (!demoteModalUser) return;
    const res = await fetch(`/api/admin/users/${demoteModalUser.id}/change-role`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'user', totpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi hạ quyền admin');
    setDemoteModalUser(null);
    loadUsers(page, search);
  }

  const totalPages = Math.max(1, Math.ceil(total / 15));

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2 flex-wrap sm:flex-nowrap">
        <div className="relative flex-1 min-w-[240px]">
          <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hiển thị, email hoặc ID..."
            className="w-full bg-surface2 border border-line rounded-xl pl-8 pr-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5"
        >
          <i className="bi bi-search" /> Tìm kiếm
        </button>
      </form>

      <div className="block sm:hidden space-y-3">
        {loading || !rows ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Không tìm thấy người dùng nào phù hợp.
          </div>
        ) : (
          rows.map((u) => (
            <div key={u.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <AvatarFrame level={u.level} frame={u.avatar_frame}>
                    <div className="w-10 h-10 rounded-full bg-surface2 flex items-center justify-center overflow-hidden border border-line shrink-0">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <i className="bi bi-person text-muted" />
                      )}
                    </div>
                  </AvatarFrame>
                  <div className="min-w-0">
                    <UserName name={u.username} level={u.level} className="font-semibold text-xs truncate block" />
                    <span className="text-[10px] text-muted truncate block">{u.email || u.id}</span>
                  </div>
                </div>
                <LevelBadge level={u.level} size="xs" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-line">
                <div>
                  <span className="text-muted block text-[10px]">Số dư VNC:</span>
                  <span className="font-mono text-cyan font-bold">{u.balance_nova.toLocaleString('vi-VN')}</span>
                </div>
                <div>
                  <span className="text-muted block text-[10px]">Vai trò:</span>
                  <span className={`font-semibold ${u.role === 'admin' ? 'text-amber' : 'text-muted'}`}>
                    {u.role === 'admin' ? 'Quản trị viên' : 'Thành viên'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => openEditModal(u)}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-surface2 border border-line text-xs font-medium text-ink hover:border-indigo transition flex items-center justify-center gap-1.5"
                >
                  <i className="bi bi-sliders" /> Quản lý
                </button>
                <button
                  onClick={() => handleToggleLock(u)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                    u.locked ? 'bg-rose/15 border-rose/30 text-rose' : 'bg-surface2 border-line text-muted'
                  }`}
                >
                  {u.locked ? 'Mở khóa' : 'Khóa'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden sm:block border border-line rounded-2xl overflow-hidden bg-surface">
        <table className="w-full text-xs">
          <thead className="bg-surface2 text-muted uppercase text-[10px] border-b border-line">
            <tr>
              <th className="text-left px-3.5 py-3">Thành viên</th>
              <th className="text-left px-3.5 py-3">Cấp & XP</th>
              <th className="text-left px-3.5 py-3">Số dư VNC</th>
              <th className="text-left px-3.5 py-3">Vai trò</th>
              <th className="text-left px-3.5 py-3">Trạng thái</th>
              <th className="text-right px-3.5 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading || !rows ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-3.5 py-3">
                    <Skeleton className="h-6 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3.5 py-8 text-center text-muted">
                  Không tìm thấy người dùng nào.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="hover:bg-surface2/50 transition">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarFrame level={u.level} frame={u.avatar_frame}>
                        <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center overflow-hidden border border-line shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <i className="bi bi-person text-muted" />
                          )}
                        </div>
                      </AvatarFrame>
                      <div className="min-w-0 max-w-[180px]">
                        <UserName name={u.username} level={u.level} className="font-semibold block truncate" />
                        <span className="text-[10px] text-muted block truncate">{u.email || u.id}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <LevelBadge level={u.level} size="xs" />
                      <span className="font-mono text-muted text-[11px]">{u.xp} XP</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-cyan">
                    {u.balance_nova.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-3.5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        u.role === 'admin'
                          ? 'bg-amber/15 text-amber border-amber/30'
                          : 'bg-surface2 text-muted border-line'
                      }`}
                    >
                      {u.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    {u.banned_at ? (
                      <span className="text-rose font-medium text-[11px]">Đã BAN</span>
                    ) : u.locked ? (
                      <span className="text-amber font-medium text-[11px]">Tạm khóa</span>
                    ) : (
                      <span className="text-emerald-400 font-medium text-[11px]">Bình thường</span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => openEditModal(u)}
                      className="px-2.5 py-1 rounded-lg bg-surface2 hover:bg-line border border-line text-ink transition"
                    >
                      <i className="bi bi-sliders mr-1" /> Chỉnh sửa
                    </button>
                    <button
                      onClick={() => handleToggleLock(u)}
                      className={`px-2.5 py-1 rounded-lg border transition ${
                        u.locked
                          ? 'bg-rose/15 border-rose/30 text-rose hover:bg-rose/25'
                          : 'bg-surface2 border-line text-muted hover:text-ink'
                      }`}
                    >
                      {u.locked ? 'Mở' : 'Khóa'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs pt-1">
          <span className="text-muted">Tổng cộng {total} người dùng</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-line disabled:opacity-40"
            >
              <i className="bi bi-chevron-left" />
            </button>
            <span className="font-mono text-muted px-2">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-line disabled:opacity-40"
            >
              <i className="bi bi-chevron-right" />
            </button>
          </div>
        </div>
      )}

      {activeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <AvatarFrame level={activeUser.level} frame={activeUser.avatar_frame}>
                  <div className="w-11 h-11 rounded-full bg-surface2 flex items-center justify-center overflow-hidden border border-line shrink-0">
                    {activeUser.avatar_url ? (
                      <img src={activeUser.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <i className="bi bi-person text-lg text-muted" />
                    )}
                  </div>
                </AvatarFrame>
                <div>
                  <UserName name={activeUser.username} level={activeUser.level} className="text-sm font-bold block" />
                  <p className="text-[11px] text-muted">ID: {activeUser.id}</p>
                </div>
              </div>
              <button onClick={() => setActiveUser(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="flex gap-1 border-b border-line pb-2 overflow-x-auto">
              {(
                [
                  { id: 'balance', label: 'Số dư VNC', icon: 'bi-coin' },
                  { id: 'xp', label: 'Cấp bậc & XP', icon: 'bi-award' },
                  { id: 'profile', label: 'Hồ sơ & Khung', icon: 'bi-person-badge' },
                  { id: 'role', label: 'Vai trò', icon: 'bi-shield-check' },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setActionTab(t.id);
                    setModalMessage('');
                    setModalError('');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    actionTab === t.id ? 'bg-indigo text-white' : 'text-muted hover:text-ink'
                  }`}
                >
                  <i className={`bi ${t.icon}`} /> {t.label}
                </button>
              ))}
            </div>

            {modalMessage && (
              <div className="p-3 rounded-xl bg-cyan/15 border border-cyan/30 text-cyan text-xs flex items-center gap-2">
                <i className="bi bi-check-circle" /> {modalMessage}
              </div>
            )}
            {modalError && (
              <div className="p-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs flex items-center gap-2">
                <i className="bi bi-exclamation-circle" /> {modalError}
              </div>
            )}

            {actionTab === 'balance' && (
              <form onSubmit={handleAdjustBalance} className="space-y-3">
                <div className="p-3 bg-surface2 border border-line rounded-xl text-xs flex items-center justify-between">
                  <span className="text-muted">Số dư hiện tại:</span>
                  <span className="font-mono text-cyan font-bold text-sm">
                    {activeUser.balance_nova.toLocaleString('vi-VN')} VNC
                  </span>
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">
                    Số lượng (+ để cộng, - để trừ)
                  </label>
                  <input
                    type="number"
                    value={balanceForm.amount}
                    onChange={(e) => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                    placeholder="VD: 50 hoặc -20"
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">
                    Lý do điều chỉnh (bắt buộc ghi vào coin_ledger)
                  </label>
                  <input
                    type="text"
                    value={balanceForm.reason}
                    onChange={(e) => setBalanceForm({ ...balanceForm, reason: e.target.value })}
                    placeholder="VD: Thưởng sự kiện cộng đồng"
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading && <i className="bi bi-arrow-repeat animate-spin" />}
                  <span>Áp dụng điều chỉnh</span>
                </button>
              </form>
            )}

            {actionTab === 'xp' && (
              <form onSubmit={handleAdjustXp} className="space-y-3">
                <div className="p-3 bg-surface2 border border-line rounded-xl text-xs flex items-center justify-between">
                  <span className="text-muted">Cấp hiện tại:</span>
                  <div className="flex items-center gap-2">
                    <LevelBadge level={activeUser.level} size="xs" />
                    <span className="font-mono text-muted font-bold">{activeUser.xp} XP</span>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Cộng / trừ thêm XP</label>
                  <input
                    type="number"
                    value={xpForm.xpDelta}
                    onChange={(e) => setXpForm({ ...xpForm, xpDelta: e.target.value, xp: '' })}
                    placeholder="VD: 100 hoặc -50"
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Hoặc đặt mốc XP cố định</label>
                  <input
                    type="number"
                    min="0"
                    value={xpForm.xp}
                    onChange={(e) => setXpForm({ ...xpForm, xp: e.target.value, xpDelta: '' })}
                    placeholder="VD: 1500"
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none focus:border-indigo"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading && <i className="bi bi-arrow-repeat animate-spin" />}
                  <span>Cập nhật Cấp & XP</span>
                </button>
              </form>
            )}

            {actionTab === 'profile' && (
              <form onSubmit={handleUpdateProfile} className="space-y-3">
                <div>
                  <label className="text-[11px] text-muted block mb-1">Tên hiển thị</label>
                  <input
                    type="text"
                    value={profileForm.username}
                    onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">URL ảnh đại diện (Avatar)</label>
                  <input
                    type="text"
                    value={profileForm.avatar_url}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_url: e.target.value })}
                    placeholder="https://.../avatar.png"
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">Gán khung Avatar</label>
                  <select
                    value={profileForm.avatar_frame}
                    onChange={(e) => setProfileForm({ ...profileForm, avatar_frame: e.target.value })}
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
                  >
                    <option value="">Tự động theo cấp độ</option>
                    <option value="crystal_purple_gold">Khung pha lê tím vàng (Cấp tối đa)</option>
                    <option value="gold">Khung ánh vàng (Cấp cao)</option>
                    <option value="purple">Khung tím huyền bí</option>
                    <option value="cyan">Khung thanh lam</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-1">URL hình nền thẻ VNC</label>
                  <input
                    type="text"
                    value={profileForm.card_bg}
                    onChange={(e) => setProfileForm({ ...profileForm, card_bg: e.target.value })}
                    placeholder="https://.../card-bg.png (để trống để dùng mặc định)"
                    className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-indigo"
                  />
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setProfileForm({ ...profileForm, card_bg: '' })}
                      className="text-[10px] text-indigo hover:underline"
                    >
                      Reset nền mặc định
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full py-2.5 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {actionLoading && <i className="bi bi-arrow-repeat animate-spin" />}
                  <span>Lưu thay đổi</span>
                </button>
              </form>
            )}

            {actionTab === 'role' && (
              <div className="space-y-3">
                <div className="p-3 bg-surface2 border border-line rounded-xl text-xs flex items-center justify-between">
                  <span className="text-muted">Vai trò hiện tại:</span>
                  <span className="font-bold text-amber">
                    {activeUser.role === 'admin' ? 'Quản trị viên (Admin)' : 'Thành viên (User)'}
                  </span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Quản trị viên có toàn quyền truy cập trang quản trị và điều chỉnh tài nguyên hệ thống. Không thể hạ quyền nếu đây là admin duy nhất còn lại.
                </p>
                {activeUser.role === 'user' ? (
                  <button
                    onClick={() => handleRoleChangeDirect(activeUser, 'admin')}
                    className="w-full py-2.5 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <i className="bi bi-shield-plus" /> Nâng cấp thành Quản trị viên
                  </button>
                ) : (
                  <button
                    onClick={() => handleRoleChangeDirect(activeUser, 'user')}
                    className="w-full py-2.5 bg-rose hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <i className="bi bi-shield-minus" /> Hạ quyền xuống Thành viên thường
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {demoteModalUser && (
        <AdminDangerousModal
          title="Hạ quyền Quản trị viên"
          description={`Bạn sắp hạ quyền tài khoản "${demoteModalUser.username}" từ Quản trị viên xuống Thành viên thường. Thao tác này yêu cầu nhập lại mã TOTP.`}
          confirmLabel="Xác nhận hạ quyền"
          onCancel={() => setDemoteModalUser(null)}
          onConfirm={confirmDemoteWithTotp}
        />
      )}
    </div>
  );
}

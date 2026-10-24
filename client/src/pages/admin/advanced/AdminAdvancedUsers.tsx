import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../../components/Skeleton.js';
import AvatarFrame from '../../../components/AvatarFrame.js';
import UserName from '../../../components/UserName.js';
import AdminDangerousModal from '../AdminDangerousModal.js';

interface UserRow {
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
  banned_at: string | null;
  ban_reason: string | null;
  ban_expires_at: string | null;
}

export default function AdminAdvancedUsers() {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeUser, setActiveUser] = useState<UserRow | null>(null);

  const [pwdModalUser, setPwdModalUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const [usernameModalUser, setUsernameModalUser] = useState<UserRow | null>(null);
  const [newUsername, setNewUsername] = useState('');

  const [banModalUser, setBanModalUser] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState('Vi phạm quy định dịch vụ');
  const [banDuration, setBanDuration] = useState('24');

  const [unbanModalUser, setUnbanModalUser] = useState<UserRow | null>(null);

  const [deleteModalUser, setDeleteModalUser] = useState<UserRow | null>(null);
  const [hardDelete, setHardDelete] = useState(false);

  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function loadUsers(q = search) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=25`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) setRows(data.rows);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers('');
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    loadUsers(search);
  }

  async function handleVerifyEmail(user: UserRow) {
    if (!confirm(`Xác minh email thủ công cho tài khoản "${user.username}"?`)) return;
    setMsg('');
    setErr('');
    try {
      const res = await fetch(`/api/admin/advanced/users/${user.id}/verify-email`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi xác minh email');
      setMsg(`Đã xác minh email cho tài khoản ${user.username}`);
      loadUsers(search);
    } catch (e: any) {
      setErr(e.message || 'Lỗi hệ thống');
    }
  }

  async function confirmChangePassword(totpCode: string) {
    if (!pwdModalUser) return;
    const res = await fetch(`/api/admin/advanced/users/${pwdModalUser.id}/change-password`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, totpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi đổi mật khẩu');
    setMsg(`Đổi mật khẩu cho "${pwdModalUser.username}" thành công`);
    setPwdModalUser(null);
    setNewPassword('');
    loadUsers(search);
  }

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameModalUser || !newUsername.trim()) return;
    setMsg('');
    setErr('');
    try {
      const res = await fetch(`/api/admin/advanced/users/${usernameModalUser.id}/change-username`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi đổi tên');
      setMsg(`Đã đổi tên đăng nhập thành "${newUsername.trim()}"`);
      setUsernameModalUser(null);
      setNewUsername('');
      loadUsers(search);
    } catch (e: any) {
      setErr(e.message || 'Lỗi hệ thống');
    }
  }

  async function confirmBan(totpCode: string) {
    if (!banModalUser) return;
    const hours = Number(banDuration) || 0;
    const res = await fetch(`/api/admin/advanced/users/${banModalUser.id}/ban`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: banReason.trim(),
        durationHours: hours,
        totpCode,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi khóa tài khoản');
    setMsg(`Đã khóa tài khoản "${banModalUser.username}"`);
    setBanModalUser(null);
    loadUsers(search);
  }

  async function confirmUnban(totpCode: string) {
    if (!unbanModalUser) return;
    const res = await fetch(`/api/admin/advanced/users/${unbanModalUser.id}/unban`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi gỡ ban');
    setMsg(`Đã gỡ ban cho tài khoản "${unbanModalUser.username}"`);
    setUnbanModalUser(null);
    loadUsers(search);
  }

  async function confirmDeleteUser(totpCode: string) {
    if (!deleteModalUser) return;
    const res = await fetch(`/api/admin/advanced/users/${deleteModalUser.id}/delete`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hardDelete, totpCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Lỗi xóa tài khoản');
    setMsg(`Đã xóa tài khoản "${deleteModalUser.username}" thành công`);
    setDeleteModalUser(null);
    loadUsers(search);
  }

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-person-gear text-rose" /> Quản lý tài khoản người dùng nâng cao
        </h3>
        <p className="text-[11px] text-muted">
          Đổi mật khẩu bảo mật, đổi tên đăng nhập, xác minh email thủ công, cấm (BAN) và xóa tài khoản.
        </p>

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

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hiển thị, email hoặc ID..."
            className="flex-1 bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-rose"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-rose hover:brightness-110 text-white rounded-xl text-xs font-semibold transition shrink-0 flex items-center gap-1.5"
          >
            <i className="bi bi-search" /> Tìm kiếm
          </button>
        </form>
      </div>

      <div className="block sm:hidden space-y-3">
        {loading || !rows ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Không tìm thấy tài khoản nào.
          </div>
        ) : (
          rows.map((u) => (
            <div key={u.id} className="bg-surface border border-line rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
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
                {u.banned_at ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose/15 text-rose border border-rose/30">
                    Đã cấm
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Hoạt động
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-line">
                <button
                  onClick={() => {
                    setPwdModalUser(u);
                    setNewPassword('');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-[11px] text-ink hover:border-amber transition"
                >
                  <i className="bi bi-key mr-1" /> Đổi MK
                </button>
                <button
                  onClick={() => {
                    setUsernameModalUser(u);
                    setNewUsername(u.username);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-[11px] text-ink hover:border-cyan transition"
                >
                  <i className="bi bi-pencil mr-1" /> Đổi username
                </button>
                <button
                  onClick={() => handleVerifyEmail(u)}
                  className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-[11px] text-ink hover:border-indigo transition"
                >
                  <i className="bi bi-envelope-check mr-1" /> Xác minh email
                </button>
                {u.banned_at ? (
                  <button
                    onClick={() => setUnbanModalUser(u)}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-400 font-semibold"
                  >
                    Gỡ ban
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setBanModalUser(u);
                      setBanReason('Vi phạm quy định dịch vụ');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-[11px] text-rose font-semibold"
                  >
                    Cấm (BAN)
                  </button>
                )}
                <button
                  onClick={() => {
                    setDeleteModalUser(u);
                    setHardDelete(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-[11px] text-rose font-semibold"
                >
                  Xóa
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
              <th className="text-left px-3.5 py-3">Tài khoản</th>
              <th className="text-left px-3.5 py-3">Email</th>
              <th className="text-left px-3.5 py-3">Trạng thái Ban</th>
              <th className="text-right px-3.5 py-3">Thao tác nâng cao</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading || !rows ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={4} className="px-3.5 py-3">
                    <Skeleton className="h-6 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3.5 py-8 text-center text-muted">
                  Không tìm thấy tài khoản nào.
                </td>
              </tr>
            ) : (
              rows.map((u) => (
                <tr key={u.id} className="hover:bg-surface2/50 transition">
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <AvatarFrame level={u.level} frame={u.avatar_frame}>
                        <div className="w-8 h-8 rounded-full bg-surface2 flex items-center justify-center overflow-hidden border border-line shrink-0">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <i className="bi bi-person text-muted" />
                          )}
                        </div>
                      </AvatarFrame>
                      <UserName name={u.username} level={u.level} className="font-semibold" />
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-muted">{u.email || '-'}</td>
                  <td className="px-3.5 py-3">
                    {u.banned_at ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose/15 text-rose border border-rose/30">
                        Đang bị BAN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        Bình thường
                      </span>
                    )}
                  </td>
                  <td className="px-3.5 py-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      onClick={() => {
                        setPwdModalUser(u);
                        setNewPassword('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-[11px] text-ink hover:border-amber transition"
                    >
                      <i className="bi bi-key mr-1" /> Đổi MK
                    </button>
                    <button
                      onClick={() => {
                        setUsernameModalUser(u);
                        setNewUsername(u.username);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-[11px] text-ink hover:border-cyan transition"
                    >
                      <i className="bi bi-pencil mr-1" /> Đổi tên
                    </button>
                    <button
                      onClick={() => handleVerifyEmail(u)}
                      className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-[11px] text-ink hover:border-indigo transition"
                    >
                      <i className="bi bi-envelope-check mr-1" /> Email
                    </button>
                    {u.banned_at ? (
                      <button
                        onClick={() => setUnbanModalUser(u)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[11px] text-emerald-400 font-semibold hover:bg-emerald-500/25 transition"
                      >
                        Gỡ ban
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setBanModalUser(u);
                          setBanReason('Vi phạm quy định dịch vụ');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-[11px] text-rose font-semibold hover:bg-rose/25 transition"
                      >
                        Cấm (BAN)
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setDeleteModalUser(u);
                        setHardDelete(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-[11px] text-rose font-semibold hover:bg-rose/25 transition"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pwdModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-key text-amber" /> Đổi mật khẩu tài khoản
              </h3>
              <button onClick={() => setPwdModalUser(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <p className="text-xs text-muted">
              Đổi mật khẩu cho người dùng <span className="font-semibold text-ink">{pwdModalUser.username}</span>. Mật khẩu sẽ được băm bằng bcrypt và toàn bộ phiên đăng nhập hiện tại của người dùng sẽ bị vô hiệu hóa.
            </p>
            <div>
              <label className="text-[11px] text-muted block mb-1">Mật khẩu mới (ít nhất 6 ký tự)</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nhập mật khẩu mới"
                className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-amber"
                required
              />
            </div>
            <AdminDangerousModal
              title={`Xác nhận đổi mật khẩu cho ${pwdModalUser.username}`}
              description="Hành động này sẽ thay đổi mật khẩu và đăng xuất tài khoản này khỏi toàn bộ thiết bị. Yêu cầu nhập mã TOTP của bạn để hoàn tất."
              confirmLabel="Xác nhận đổi mật khẩu"
              onCancel={() => setPwdModalUser(null)}
              onConfirm={confirmChangePassword}
            />
          </div>
        </div>
      )}

      {usernameModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleChangeUsername} className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-pencil text-cyan" /> Đổi tên đăng nhập
              </h3>
              <button type="button" onClick={() => setUsernameModalUser(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div>
              <label className="text-[11px] text-muted block mb-1">Tên đăng nhập mới</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-cyan"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUsernameModalUser(null)}
                className="px-3.5 py-1.5 border border-line rounded-xl text-xs text-muted"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-cyan text-ink rounded-xl text-xs font-semibold hover:brightness-110 transition"
              >
                Lưu tên mới
              </button>
            </div>
          </form>
        </div>
      )}

      {banModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-rose">
                <i className="bi bi-slash-circle" /> Khóa tài khoản (BAN)
              </h3>
              <button onClick={() => setBanModalUser(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Lý do cấm (sẽ hiển thị khi người dùng đăng nhập)</label>
                <input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Nhập lý do cấm"
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] text-muted block mb-1">Thời hạn cấm</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose"
                >
                  <option value="1">1 giờ</option>
                  <option value="24">24 giờ (1 ngày)</option>
                  <option value="168">7 ngày</option>
                  <option value="720">30 ngày</option>
                  <option value="0">Vĩnh viễn</option>
                </select>
              </div>
            </div>

            <AdminDangerousModal
              title={`Xác nhận cấm tài khoản ${banModalUser.username}`}
              description="Khóa tài khoản sẽ lập tức thu hồi toàn bộ token đăng nhập. Khi đăng nhập người dùng sẽ thấy lý do cấm và thời hạn cấm."
              confirmLabel="Xác nhận BAN"
              onCancel={() => setBanModalUser(null)}
              onConfirm={confirmBan}
            />
          </div>
        </div>
      )}

      {unbanModalUser && (
        <AdminDangerousModal
          title={`Gỡ cấm cho ${unbanModalUser.username}`}
          description="Tài khoản sẽ được mở khóa và có thể đăng nhập bình thường trở lại."
          confirmLabel="Xác nhận gỡ ban"
          onCancel={() => setUnbanModalUser(null)}
          onConfirm={confirmUnban}
        />
      )}

      {deleteModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-rose flex items-center gap-2">
                <i className="bi bi-trash-fill" /> Xóa tài khoản
              </h3>
              <button onClick={() => setDeleteModalUser(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="p-3 bg-rose/10 border border-rose/30 rounded-xl space-y-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-rose">
                <input
                  type="checkbox"
                  checked={hardDelete}
                  onChange={(e) => setHardDelete(e.target.checked)}
                  className="rounded border-rose"
                />
                Xóa vĩnh viễn (Hard Delete - làm sạch khóa ngoại)
              </label>
              <p className="text-[11px] text-muted">
                {hardDelete
                  ? 'Toàn bộ dữ liệu của người dùng này trong hệ thống sẽ bị xóa vĩnh viễn.'
                  : 'Xóa mềm (Soft delete): Đánh dấu tài khoản đã xóa, vô hiệu token, giữ nguyên dữ liệu lịch sử.'}
              </p>
            </div>

            <AdminDangerousModal
              title={`Xóa tài khoản ${deleteModalUser.username}`}
              description={`Bạn sắp thực hiện ${hardDelete ? 'XÓA CỨNG' : 'XÓA MỀM'} tài khoản này. Hành động này không thể hoàn tác.`}
              confirmLabel="Xác nhận xóa tài khoản"
              onCancel={() => setDeleteModalUser(null)}
              onConfirm={confirmDeleteUser}
            />
          </div>
        </div>
      )}
    </div>
  );
}

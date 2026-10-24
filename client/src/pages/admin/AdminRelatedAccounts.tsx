import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.js';

interface LinkedUser {
  id: string;
  username: string;
  email: string | null;
  email_verified: number;
  balance_nova: number;
  locked: number;
  banned_at: string | null;
  created_at: string;
  last_seen: string;
  withdraw_count: number;
  withdraw_sum: number;
}

interface AccountCluster {
  group_key: string;
  user_count: number;
  note: string | null;
  last_seen: string;
  first_seen: string;
  users: LinkedUser[];
}

export default function AdminRelatedAccounts() {
  const [groupBy, setGroupBy] = useState<'fp' | 'ip'>('fp');
  const [search, setSearch] = useState('');
  const [clusters, setClusters] = useState<AccountCluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [noteModal, setNoteModal] = useState<{ open: boolean; groupKey: string; note: string } | null>(null);
  const [banModal, setBanModal] = useState<{ open: boolean; userIds: string[]; reason: string } | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  const { success, error: toastError } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      q.set('group_by', groupBy);
      if (search.trim()) q.set('search', search.trim());

      const res = await fetch(`/api/admin/related-accounts?${q.toString()}`, { credentials: 'include' });
      if (!res.ok) {
        throw new Error('Không thể tải danh sách tài khoản liên quan');
      }
      const data = await res.json();
      setClusters(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toastError(e.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    setSelectedUserIds([]);
  }, [groupBy]);

  function toggleSelectUser(userId: string) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function selectClusterUsers(users: LinkedUser[]) {
    const ids = users.map((u) => u.id);
    const allSelected = ids.every((id) => selectedUserIds.includes(id));
    if (allSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...ids])));
    }
  }

  async function handleSaveNote() {
    if (!noteModal) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/related-accounts/note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          groupKey: noteModal.groupKey,
          note: noteModal.note,
          type: groupBy,
        }),
      });
      if (!res.ok) throw new Error('Không thể lưu ghi chú');
      success('Đã cập nhật ghi chú nhóm thành công');
      setNoteModal(null);
      loadData();
    } catch (e: any) {
      toastError(e.message || 'Lỗi lưu ghi chú');
    } finally {
      setActionBusy(false);
    }
  }

  async function handleBatchBan() {
    if (!banModal || banModal.userIds.length === 0) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/admin/related-accounts/batch-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: banModal.userIds,
          reason: banModal.reason,
        }),
      });
      if (!res.ok) throw new Error('Không thể thực hiện khóa hàng loạt');
      const data = await res.json();
      success(`Đã khóa thành công ${data.bannedCount} tài khoản`);
      setBanModal(null);
      setSelectedUserIds([]);
      loadData();
    } catch (e: any) {
      toastError(e.message || 'Lỗi khóa tài khoản');
    } finally {
      setActionBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <i className="bi bi-diagram-3 text-cyan" />
            <span>Phát hiện & Quản lý Tài khoản Liên quan</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Phát hiện các cụm tài khoản dùng chung thiết bị hoặc cùng dải mạng IP
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-3 py-1.5 bg-surface2 border border-line hover:border-muted rounded-xl text-xs font-medium transition flex items-center gap-1.5"
        >
          <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="p-3.5 bg-cyan/10 border border-cyan/20 rounded-2xl flex items-start gap-2.5">
        <i className="bi bi-info-circle-fill text-cyan shrink-0 mt-0.5" />
        <div className="text-xs text-cyan-200 leading-relaxed">
          <strong>Lưu ý nghiệp vụ:</strong> Dấu vân tay thiết bị (Fingerprint) là tín hiệu yếu (weak signal), chỉ dùng để gom nhóm giám sát và hỗ trợ tính điểm rủi ro. Hệ thống không tự động khóa tài khoản để tránh phạt nhầm người dùng hợp lệ.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-surface2 border border-line rounded-xl">
          <button
            onClick={() => setGroupBy('fp')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              groupBy === 'fp' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            <i className="bi bi-phone" />
            <span>Theo Thiết bị (Fingerprint)</span>
          </button>
          <button
            onClick={() => setGroupBy('ip')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              groupBy === 'ip' ? 'bg-indigo text-white shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            <i className="bi bi-globe" />
            <span>Theo Mạng (IP)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
              placeholder="Tìm kiếm tài khoản, mã hash..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-line rounded-xl text-ink focus:border-indigo focus:outline-none"
            />
          </div>
          <button
            onClick={loadData}
            className="px-3 py-1.5 bg-indigo text-white rounded-xl text-xs font-semibold hover:brightness-110 transition shrink-0"
          >
            Tìm
          </button>
        </div>
      </div>

      {selectedUserIds.length > 0 && (
        <div className="p-3 bg-surface2 border border-line rounded-2xl flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-ink flex items-center gap-2">
            <i className="bi bi-check-circle-fill text-indigo" />
            <span>Đã chọn <strong>{selectedUserIds.length}</strong> tài khoản</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedUserIds([])}
              className="px-2.5 py-1 text-xs text-muted hover:text-ink transition"
            >
              Bỏ chọn
            </button>
            <button
              onClick={() =>
                setBanModal({
                  open: true,
                  userIds: selectedUserIds,
                  reason: 'Phát hiện liên kết nhiều tài khoản gian lận',
                })
              }
              className="px-3 py-1.5 bg-rose text-white rounded-xl text-xs font-semibold hover:brightness-110 transition flex items-center gap-1.5 shadow-sm"
            >
              <i className="bi bi-slash-circle" />
              <span>Khóa các tài khoản đã chọn</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted text-xs">
          <i className="bi bi-arrow-clockwise animate-spin text-2xl mb-2 inline-block text-indigo" />
          <div>Đang tải dữ liệu nhóm liên kết...</div>
        </div>
      ) : clusters.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center text-muted">
          <i className="bi bi-shield-check text-3xl mb-2 inline-block text-emerald-400" />
          <div className="text-sm font-semibold text-ink">Không phát hiện cụm đa tài khoản bất thường</div>
          <p className="text-xs text-muted mt-1">
            Chưa có thiết bị hay mạng nào liên kết từ 2 tài khoản trở lên hoặc không khớp điều kiện tìm kiếm.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clusters.map((cluster) => {
            const isAllSelected = cluster.users.every((u) => selectedUserIds.includes(u.id));
            return (
              <div key={cluster.group_key} className="glass-card rounded-2xl p-4 space-y-3 border border-line">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-line">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => selectClusterUsers(cluster.users)}
                      className={`text-xs px-2 py-0.5 rounded-lg border transition flex items-center gap-1 ${
                        isAllSelected
                          ? 'bg-indigo text-white border-indigo'
                          : 'bg-surface2 border-line text-muted hover:text-ink'
                      }`}
                    >
                      <i className={`bi ${isAllSelected ? 'bi-check-square-fill' : 'bi-square'}`} />
                      <span>Chọn cả nhóm</span>
                    </button>

                    <span className="text-xs font-mono font-bold text-ink bg-surface2 px-2 py-0.5 rounded-md border border-line">
                      {groupBy === 'fp' ? 'Device FP' : 'IP Hash'}: {cluster.group_key.slice(0, 16)}...
                    </span>

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose/10 text-rose border border-rose/20">
                      {cluster.user_count} tài khoản
                    </span>

                    {cluster.note && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber/10 text-amber border border-amber/20 flex items-center gap-1">
                        <i className="bi bi-sticky-fill text-[10px]" />
                        <span>{cluster.note}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setNoteModal({
                          open: true,
                          groupKey: cluster.group_key,
                          note: cluster.note || '',
                        })
                      }
                      className="px-2.5 py-1 bg-surface2 border border-line hover:border-muted rounded-xl text-xs text-muted hover:text-ink transition flex items-center gap-1"
                    >
                      <i className="bi bi-pencil-square" />
                      <span>Ghi chú</span>
                    </button>

                    <button
                      onClick={() =>
                        setBanModal({
                          open: true,
                          userIds: cluster.users.map((u) => u.id),
                          reason: `Khóa cụm ${groupBy === 'fp' ? 'thiết bị' : 'IP'} (${cluster.user_count} tài khoản)`,
                        })
                      }
                      className="px-2.5 py-1 bg-rose/10 hover:bg-rose/20 text-rose border border-rose/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                    >
                      <i className="bi bi-slash-circle" />
                      <span>Khóa cả nhóm</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto no-scrollbar">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-muted border-b border-line/60">
                        <th className="py-2 pr-3 w-8"></th>
                        <th className="py-2 pr-4 font-semibold">Tài khoản</th>
                        <th className="py-2 pr-4 font-semibold">Email</th>
                        <th className="py-2 pr-4 font-semibold">Số dư</th>
                        <th className="py-2 pr-4 font-semibold">Lệnh rút</th>
                        <th className="py-2 pr-4 font-semibold">Ngày tạo</th>
                        <th className="py-2 pr-4 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {cluster.users.map((u) => {
                        const isSelected = selectedUserIds.includes(u.id);
                        return (
                          <tr key={u.id} className="hover:bg-surface2/50 transition">
                            <td className="py-2.5 pr-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelectUser(u.id)}
                                className="rounded border-line text-indigo focus:ring-0 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 pr-4 font-medium text-ink">
                              <div>{u.username}</div>
                              <div className="text-[10px] text-muted font-mono">{u.id}</div>
                            </td>
                            <td className="py-2.5 pr-4 text-muted">
                              {u.email ? (
                                <div className="flex items-center gap-1">
                                  <span>{u.email}</span>
                                  {u.email_verified === 1 ? (
                                    <i className="bi bi-check-circle-fill text-emerald-400 text-[10px]" title="Đã xác minh" />
                                  ) : (
                                    <i className="bi bi-exclamation-circle text-amber text-[10px]" title="Chưa xác minh" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted/60">Chưa có</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 font-semibold text-ink">
                              {u.balance_nova.toLocaleString('vi-VN')} VNC
                            </td>
                            <td className="py-2.5 pr-4 text-muted">
                              {u.withdraw_count > 0 ? (
                                <span>
                                  <strong>{u.withdraw_count}</strong> lần ({u.withdraw_sum.toLocaleString('vi-VN')} VNC)
                                </span>
                              ) : (
                                <span className="text-muted/60">0 lần</span>
                              )}
                            </td>
                            <td className="py-2.5 pr-4 text-muted">
                              {new Date(u.created_at).toLocaleDateString('vi-VN')}
                            </td>
                            <td className="py-2.5 pr-4">
                              {u.locked === 1 || u.banned_at ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose/10 text-rose border border-rose/30">
                                  Đã khóa
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  Hoạt động
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {noteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-sm font-semibold text-ink flex items-center gap-2">
                <i className="bi bi-pencil-square text-indigo" />
                <span>Ghi chú cụm liên kết</span>
              </h3>
              <button
                onClick={() => setNoteModal(null)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted block">Nội dung ghi chú cho nhóm:</label>
              <textarea
                value={noteModal.note}
                onChange={(e) => setNoteModal({ ...noteModal, note: e.target.value })}
                rows={3}
                placeholder="Ví dụ: Nghi vấn cày thuê, chung quán nét, v.v."
                className="w-full p-2.5 text-xs bg-surface2 border border-line rounded-xl text-ink focus:border-indigo focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModal(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-muted hover:text-ink transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveNote}
                disabled={actionBusy}
                className="px-4 py-1.5 bg-indigo text-white rounded-xl text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {actionBusy ? 'Đang lưu...' : 'Lưu ghi chú'}
              </button>
            </div>
          </div>
        </div>
      )}

      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-sm font-semibold text-rose flex items-center gap-2">
                <i className="bi bi-exclamation-triangle-fill" />
                <span>Xác nhận khóa {banModal.userIds.length} tài khoản</span>
              </h3>
              <button
                onClick={() => setBanModal(null)}
                className="text-muted hover:text-ink text-sm p-1"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Hành động này sẽ khóa quyền truy cập, thu hồi toàn bộ phiên đăng nhập của {banModal.userIds.length} tài khoản được chọn và ghi vào chuỗi Audit Trail.
            </p>

            <div className="space-y-2">
              <label className="text-xs text-muted block">Lý do khóa tài khoản:</label>
              <input
                type="text"
                value={banModal.reason}
                onChange={(e) => setBanModal({ ...banModal, reason: e.target.value })}
                className="w-full p-2.5 text-xs bg-surface2 border border-line rounded-xl text-ink focus:border-rose focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setBanModal(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-muted hover:text-ink transition"
              >
                Hủy
              </button>
              <button
                onClick={handleBatchBan}
                disabled={actionBusy}
                className="px-4 py-1.5 bg-rose text-white rounded-xl text-xs font-semibold hover:brightness-110 transition disabled:opacity-50"
              >
                {actionBusy ? 'Đang xử lý...' : 'Xác nhận khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

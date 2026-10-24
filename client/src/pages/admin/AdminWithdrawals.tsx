import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface WithdrawalRow {
  id: string;
  username: string;
  amount_nova: number;
  amount_vnd: number;
  method: string;
  destination: string;
  status: string;
  created_at: string;
  risk_score?: number;
  risk_reasons?: string[];
  needs_review?: boolean;
}

export default function AdminWithdrawals() {
  const [rows, setRows] = useState<WithdrawalRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'risk_desc'>('date_desc');
  const [selectedRiskRow, setSelectedRiskRow] = useState<WithdrawalRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filterStatus === 'needs_review') {
        qs.set('needs_review', 'true');
      } else if (filterStatus !== 'all') {
        qs.set('status', filterStatus);
      }

      if (sortBy === 'risk_desc') {
        qs.set('sortBy', 'risk');
      }

      const res = await fetch(`/api/admin/withdrawals?${qs}`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        let sorted = data as WithdrawalRow[];
        if (sortBy === 'date_asc') {
          sorted = [...sorted].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
        setRows(sorted);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [filterStatus, sortBy]);

  async function act(id: string, action: 'approve' | 'reject') {
    const note = action === 'reject' ? prompt('Nhập lý do từ chối (sẽ hoàn lại VNC cho user):') : null;
    if (action === 'reject' && note === null) return;

    try {
      const res = await fetch(`/api/admin/withdrawals/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      if (res.ok) load();
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-cash-coin text-amber" /> Quản lý rút tiền
        </h2>
        <a
          href="/api/admin/withdrawals/export.csv"
          className="text-xs text-indigo hover:underline flex items-center gap-1 font-medium self-start sm:self-auto"
        >
          <i className="bi bi-download" /> Xuất CSV
        </a>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-surface border border-line text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted font-medium mr-1">Bộ lọc:</span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'needs_review', label: 'Cần xem kỹ', icon: 'bi-exclamation-triangle-fill', highlight: true },
            { id: 'paid', label: 'Đã duyệt' },
            { id: 'rejected', label: 'Từ chối' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? tab.highlight
                    ? 'bg-rose text-white shadow-sm'
                    : 'bg-cyan text-ink shadow-sm'
                  : tab.highlight
                  ? 'bg-rose/10 text-rose border border-rose/30 hover:bg-rose/20'
                  : 'bg-surface2 text-muted hover:text-ink border border-line'
              }`}
            >
              {tab.icon && <i className={`bi ${tab.icon}`} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-muted font-medium">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-surface2 border border-line rounded-xl px-2.5 py-1.5 text-xs text-ink focus:outline-none focus:border-indigo"
          >
            <option value="date_desc">Mới nhất trước</option>
            <option value="date_asc">Cũ nhất trước</option>
            <option value="risk_desc">Điểm rủi ro cao nhất</option>
          </select>
        </div>
      </div>

      <div className="block sm:hidden space-y-3">
        {loading || !rows ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Chưa có yêu cầu rút tiền nào phù hợp.
          </div>
        ) : (
          rows.map((w) => {
            const isNeedReview = Boolean(w.needs_review || (w.risk_score && w.risk_score >= 50));
            return (
              <div
                key={w.id}
                className={`bg-surface border rounded-2xl p-4 space-y-2.5 transition ${
                  isNeedReview ? 'border-rose/50 bg-rose/5' : 'border-line'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-xs text-ink truncate">{w.username}</span>
                    {isNeedReview && (
                      <button
                        type="button"
                        onClick={() => setSelectedRiskRow(w)}
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/15 text-rose border border-rose/30 shrink-0 flex items-center gap-1 shadow-sm"
                      >
                        <i className="bi bi-exclamation-triangle-fill" />
                        <span>Cần xem kỹ ({w.risk_score ?? 0}đ)</span>
                      </button>
                    )}
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                      w.status === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : w.status === 'pending'
                        ? 'bg-amber/15 text-amber border-amber/30'
                        : 'bg-rose/15 text-rose border-rose/30'
                    }`}
                  >
                    {w.status === 'paid' ? 'Đã duyệt' : w.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-muted block text-[10px]">VNC:</span>
                    <span className="font-mono text-cyan font-bold">{w.amount_nova}</span>
                  </div>
                  <div>
                    <span className="text-muted block text-[10px]">VNĐ:</span>
                    <span className="font-mono text-ink font-bold">{w.amount_vnd?.toLocaleString('vi-VN')}đ</span>
                  </div>
                </div>

                <div className="text-[11px] text-muted truncate">
                  {w.method} - {w.destination}
                </div>

                <div className="text-[10px] text-muted font-mono">
                  {new Date(w.created_at).toLocaleString('vi-VN')}
                </div>

                {w.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-line">
                    <button
                      onClick={() => act(w.id, 'approve')}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-cyan text-ink text-xs font-semibold hover:brightness-110 transition"
                    >
                      Duyệt thanh toán
                    </button>
                    <button
                      onClick={() => act(w.id, 'reject')}
                      className="py-1.5 px-3 rounded-xl bg-rose/15 border border-rose/30 text-rose text-xs font-medium hover:bg-rose/25 transition"
                    >
                      Từ chối
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="hidden sm:block border border-line rounded-2xl overflow-hidden bg-surface">
        <table className="w-full text-xs">
          <thead className="bg-surface2 text-muted uppercase text-[10px] border-b border-line">
            <tr>
              <th className="text-left px-3.5 py-3">Thành viên</th>
              <th className="text-left px-3.5 py-3">Rủi ro</th>
              <th className="text-left px-3.5 py-3">VNC</th>
              <th className="text-left px-3.5 py-3">VNĐ</th>
              <th className="text-left px-3.5 py-3">Phương thức</th>
              <th className="text-left px-3.5 py-3">Thông tin nhận</th>
              <th className="text-left px-3.5 py-3">Trạng thái</th>
              <th className="text-right px-3.5 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading || !rows ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={8} className="px-3.5 py-3">
                    <Skeleton className="h-6 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3.5 py-8 text-center text-muted">
                  Chưa có yêu cầu rút tiền nào phù hợp.
                </td>
              </tr>
            ) : (
              rows.map((w) => {
                const isNeedReview = Boolean(w.needs_review || (w.risk_score && w.risk_score >= 50));
                return (
                  <tr
                    key={w.id}
                    className={`transition hover:bg-surface2/50 ${
                      isNeedReview ? 'bg-rose/5' : ''
                    }`}
                  >
                    <td className="px-3.5 py-3 font-semibold">{w.username}</td>
                    <td className="px-3.5 py-3">
                      {isNeedReview ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRiskRow(w)}
                          title="Bấm để xem chi tiết lý do rủi ro"
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose/15 text-rose border border-rose/30 inline-flex items-center gap-1 hover:brightness-110 transition"
                        >
                          <i className="bi bi-exclamation-triangle-fill" />
                          <span>Cần xem kỹ ({w.risk_score ?? 0}đ)</span>
                        </button>
                      ) : (
                        <span className="font-mono text-muted text-[11px]">
                          {w.risk_score ?? 0}đ
                        </span>
                      )}
                    </td>
                    <td className="px-3.5 py-3 font-mono text-cyan font-bold">{w.amount_nova}</td>
                    <td className="px-3.5 py-3 font-mono">{w.amount_vnd?.toLocaleString('vi-VN')}đ</td>
                    <td className="px-3.5 py-3 text-muted">{w.method}</td>
                    <td className="px-3.5 py-3 font-mono text-[11px] truncate max-w-[160px]">{w.destination}</td>
                    <td className="px-3.5 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          w.status === 'paid'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : w.status === 'pending'
                            ? 'bg-amber/15 text-amber border-amber/30'
                            : 'bg-rose/15 text-rose border-rose/30'
                        }`}
                      >
                        {w.status === 'paid' ? 'Đã duyệt' : w.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right space-x-2 whitespace-nowrap">
                      {w.status === 'pending' && (
                        <>
                          <button
                            onClick={() => act(w.id, 'approve')}
                            className="px-2.5 py-1 rounded-lg bg-cyan text-ink text-xs font-semibold hover:brightness-110 transition"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => act(w.id, 'reject')}
                            className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-rose text-xs hover:bg-rose/25 transition"
                          >
                            Từ chối
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedRiskRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
          <div className="max-w-md w-full bg-surface border border-rose/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-display text-base font-bold text-rose flex items-center gap-2">
                <i className="bi bi-shield-exclamation text-rose" /> Chi tiết chấm điểm rủi ro
              </h3>
              <button
                type="button"
                onClick={() => setSelectedRiskRow(null)}
                className="w-7 h-7 rounded-lg text-muted hover:text-ink flex items-center justify-center"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface2 border border-line space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Tài khoản:</span>
                <span className="font-bold text-ink">{selectedRiskRow.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Số tiền:</span>
                <span className="font-mono font-bold text-cyan">
                  {selectedRiskRow.amount_nova} VNC ({selectedRiskRow.amount_vnd?.toLocaleString('vi-VN')} VNĐ)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tài khoản nhận:</span>
                <span className="font-mono text-ink text-[11px] truncate max-w-[200px]">{selectedRiskRow.destination}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-line/60">
                <span className="text-muted font-semibold">Tổng điểm rủi ro:</span>
                <span className="px-2.5 py-0.5 rounded-full font-bold text-rose bg-rose/15 border border-rose/30">
                  {selectedRiskRow.risk_score ?? 0} điểm
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-muted">Các yếu tố phát hiện nguy cơ:</div>
              {selectedRiskRow.risk_reasons && selectedRiskRow.risk_reasons.length > 0 ? (
                <ul className="space-y-1.5 text-xs">
                  {selectedRiskRow.risk_reasons.map((r, i) => (
                    <li key={i} className="p-2.5 rounded-xl bg-rose/10 border border-rose/20 text-rose flex items-start gap-2">
                      <i className="bi bi-dash-circle-fill shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{r}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-xs text-muted p-3 text-center bg-surface2/40 rounded-xl">
                  Không có yếu tố rủi ro nào được ghi nhận.
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-amber/10 border border-amber/30 text-amber text-[11px] leading-relaxed">
              <i className="bi bi-info-circle mr-1" />
              Quy tắc bảo vệ: Hệ thống không tự động từ chối hoặc tự duyệt đơn này. Quyết định duyệt hoặc từ chối hoàn toàn thuộc về Admin.
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRiskRow(null)}
                className="w-full py-2.5 rounded-xl bg-surface2 border border-line text-xs font-bold text-ink hover:bg-line transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

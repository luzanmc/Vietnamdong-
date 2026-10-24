import { useEffect, useState } from 'react';
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
}

export default function AdminWithdrawals() {
  const [rows, setRows] = useState<WithdrawalRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/withdrawals', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setRows(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
    } catch {
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-cash-coin text-amber" /> Quản lý rút tiền
        </h2>
        <a
          href="/api/admin/withdrawals/export.csv"
          className="text-xs text-indigo hover:underline flex items-center gap-1 font-medium"
        >
          <i className="bi bi-download" /> Xuất CSV
        </a>
      </div>

      <div className="block sm:hidden space-y-3">
        {loading || !rows ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
        ) : rows.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
            Chưa có yêu cầu rút tiền nào.
          </div>
        ) : (
          rows.map((w) => (
            <div key={w.id} className="bg-surface border border-line rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-ink">{w.username}</span>
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
          ))
        )}
      </div>

      <div className="hidden sm:block border border-line rounded-2xl overflow-hidden bg-surface">
        <table className="w-full text-xs">
          <thead className="bg-surface2 text-muted uppercase text-[10px] border-b border-line">
            <tr>
              <th className="text-left px-3.5 py-3">Thành viên</th>
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
                  <td colSpan={7} className="px-3.5 py-3">
                    <Skeleton className="h-6 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3.5 py-8 text-center text-muted">
                  Chưa có yêu cầu rút tiền nào.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="hover:bg-surface2/50 transition">
                  <td className="px-3.5 py-3 font-semibold">{w.username}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

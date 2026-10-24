import { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface RedeemOrderRow {
  id: string;
  username: string;
  label: string;
  price_nova: number;
  destination: string;
  status: string;
  created_at: string;
}

export default function AdminRedeem() {
  const [rows, setRows] = useState<RedeemOrderRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/redeem-orders', { credentials: 'include' });
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

  async function act(id: string, action: 'fulfill' | 'reject') {
    const note = prompt(action === 'fulfill' ? 'Nhập ghi chú / mã thẻ giao cho user (tùy chọn):' : 'Nhập lý do từ chối:');
    if (action === 'reject' && note === null) return;

    try {
      const res = await fetch(`/api/admin/redeem-orders/${id}/${action}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: note || '' }),
      });
      if (res.ok) load();
    } catch {
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-controller text-indigo" /> Quản lý đơn đổi thưởng
        </h2>
        <a
          href="/api/admin/redeem-orders/export.csv"
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
            Chưa có đơn đổi thưởng nào.
          </div>
        ) : (
          rows.map((o) => (
            <div key={o.id} className="bg-surface border border-line rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-ink">{o.username}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    o.status === 'fulfilled'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : o.status === 'pending'
                      ? 'bg-amber/15 text-amber border-amber/30'
                      : 'bg-rose/15 text-rose border-rose/30'
                  }`}
                >
                  {o.status === 'fulfilled' ? 'Đã giao' : o.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                </span>
              </div>
              <div className="text-xs font-medium text-ink">{o.label}</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
                <div>Giá: <span className="font-mono text-cyan font-bold">{o.price_nova} VNC</span></div>
                <div className="truncate font-mono">{o.destination}</div>
              </div>
              {o.status === 'pending' && (
                <div className="flex items-center gap-2 pt-1 border-t border-line">
                  <button
                    onClick={() => act(o.id, 'fulfill')}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-cyan text-ink text-xs font-semibold hover:brightness-110 transition"
                  >
                    Duyệt giao quà
                  </button>
                  <button
                    onClick={() => act(o.id, 'reject')}
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
              <th className="text-left px-3.5 py-3">Vật phẩm</th>
              <th className="text-left px-3.5 py-3">Giá VNC</th>
              <th className="text-left px-3.5 py-3">Thông tin nhận</th>
              <th className="text-left px-3.5 py-3">Trạng thái</th>
              <th className="text-right px-3.5 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading || !rows ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={6} className="px-3.5 py-3">
                    <Skeleton className="h-6 w-full rounded-lg" />
                  </td>
                </tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3.5 py-8 text-center text-muted">
                  Chưa có đơn đổi thưởng nào.
                </td>
              </tr>
            ) : (
              rows.map((o) => (
                <tr key={o.id} className="hover:bg-surface2/50 transition">
                  <td className="px-3.5 py-3 font-semibold">{o.username}</td>
                  <td className="px-3.5 py-3">{o.label}</td>
                  <td className="px-3.5 py-3 font-mono text-cyan font-bold">{o.price_nova}</td>
                  <td className="px-3.5 py-3 font-mono text-[11px] truncate max-w-[160px]">{o.destination}</td>
                  <td className="px-3.5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        o.status === 'fulfilled'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : o.status === 'pending'
                          ? 'bg-amber/15 text-amber border-amber/30'
                          : 'bg-rose/15 text-rose border-rose/30'
                      }`}
                    >
                      {o.status === 'fulfilled' ? 'Đã giao' : o.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right space-x-2 whitespace-nowrap">
                    {o.status === 'pending' && (
                      <>
                        <button
                          onClick={() => act(o.id, 'fulfill')}
                          className="px-2.5 py-1 rounded-lg bg-cyan text-ink text-xs font-semibold hover:brightness-110 transition"
                        >
                          Giao quà
                        </button>
                        <button
                          onClick={() => act(o.id, 'reject')}
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

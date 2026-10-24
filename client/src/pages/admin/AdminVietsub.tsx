import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

interface VietsubInfo {
  active: boolean;
  priceNova: number | null;
  priceVnd: number | null;
  description: string;
  bankInfo: string;
  apkUrl: string;
  logoUrl: string;
  availableCount: number;
}

interface VietsubOrderRow {
  id: string;
  username: string;
  email: string | null;
  payment_method: 'nova' | 'vnd';
  price_nova: number | null;
  price_vnd: number | null;
  status: string;
  transfer_note: string | null;
  created_at: string;
}

export default function AdminVietsub() {
  const [info, setInfo] = useState<VietsubInfo | null>(null);
  const [form, setForm] = useState({
    priceNova: 0,
    priceVnd: 0,
    description: '',
    bankInfo: '',
    apkUrl: '',
    logoUrl: '',
    active: false,
  });
  const [keys, setKeys] = useState('');
  const [orders, setOrders] = useState<VietsubOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [settingsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/vietsub/settings', { credentials: 'include' }),
        fetch('/api/admin/vietsub/orders', { credentials: 'include' }),
      ]);
      const settingsData: VietsubInfo = await settingsRes.json();
      const ordersData: VietsubOrderRow[] = await ordersRes.json();

      if (settingsRes.ok) {
        setInfo(settingsData);
        setForm({
          priceNova: settingsData.priceNova ?? 0,
          priceVnd: settingsData.priceVnd ?? 0,
          description: settingsData.description || '',
          bankInfo: settingsData.bankInfo || '',
          apkUrl: settingsData.apkUrl || '',
          logoUrl: settingsData.logoUrl || '',
          active: settingsData.active || false,
        });
      }
      if (ordersRes.ok) {
        setOrders(ordersData);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch('/api/admin/vietsub/settings', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setMsg('Đã lưu cấu hình Vietsub Studio');
        load();
      }
    } catch {
    }
  }

  async function uploadKeys(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch('/api/admin/vietsub/licenses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keys }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(`Đã thêm ${data.added} license key thành công`);
        setKeys('');
        load();
      }
    } catch {
    }
  }

  async function actOrder(id: string, action: 'approve' | 'reject') {
    const note = action === 'reject' ? prompt('Nhập lý do từ chối:') : null;
    if (action === 'reject' && note === null) return;

    try {
      const res = await fetch(`/api/admin/vietsub/orders/${id}/${action}`, {
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
    <div className="space-y-6">
      {msg && (
        <div className="p-3 bg-cyan/15 border border-cyan/30 text-cyan text-xs rounded-xl flex items-center gap-2">
          <i className="bi bi-check-circle" /> {msg}
        </div>
      )}

      <form onSubmit={saveSettings} className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-badge-cc text-purple-400" /> Cấu hình Vietsub Studio
        </h3>

        <div className="flex items-center gap-3">
          {form.logoUrl && (
            <img
              src={form.logoUrl}
              alt=""
              className="w-12 h-12 rounded-xl object-cover border border-line shrink-0"
            />
          )}
          <div className="flex-1">
            <label className="text-[11px] text-muted block mb-1">URL Logo ứng dụng</label>
            <input
              value={form.logoUrl}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              placeholder="https://.../logo.png"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted block mb-1">URL Tải file APK</label>
          <input
            value={form.apkUrl}
            onChange={(e) => setForm({ ...form, apkUrl: e.target.value })}
            placeholder="https://.../vietsub-studio.apk"
            className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Giá bán (VNC)</label>
            <input
              type="number"
              value={form.priceNova}
              onChange={(e) => setForm({ ...form, priceNova: Number(e.target.value) })}
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Giá bán (VNĐ)</label>
            <input
              type="number"
              value={form.priceVnd}
              onChange={(e) => setForm({ ...form, priceVnd: Number(e.target.value) })}
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] text-muted block mb-1">Mô tả sản phẩm</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
          />
        </div>

        <div>
          <label className="text-[11px] text-muted block mb-1">Thông tin chuyển khoản ngân hàng (hiện khi mua VNĐ)</label>
          <textarea
            rows={2}
            value={form.bankInfo}
            onChange={(e) => setForm({ ...form, bankInfo: e.target.value })}
            placeholder="Ngân hàng - Số tài khoản - Tên chủ tài khoản"
            className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
          />
        </div>

        <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="rounded border-line"
          />
          <span className="font-medium text-ink">Mở bán Vietsub Studio cho thành viên</span>
        </label>

        <button
          type="submit"
          className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition"
        >
          Lưu cài đặt
        </button>
      </form>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <i className="bi bi-key text-amber" /> Kho License Key
          </h3>
          <span className="text-xs font-mono text-cyan font-bold">
            {info?.availableCount ?? 0} key sẵn sàng
          </span>
        </div>

        <form onSubmit={uploadKeys} className="space-y-3">
          <textarea
            rows={4}
            value={keys}
            onChange={(e) => setKeys(e.target.value)}
            placeholder="Mỗi dòng một license key..."
            className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <i className="bi bi-plus-lg" /> Thêm key vào kho
          </button>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-muted uppercase">Đơn đặt mua Vietsub ({orders.length})</h3>

        <div className="block sm:hidden space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          ) : orders.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
              Chưa có đơn đặt mua nào.
            </div>
          ) : (
            orders.map((o) => (
              <div key={o.id} className="bg-surface border border-line rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-ink">{o.username}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      o.status === 'approved'
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : o.status === 'pending'
                        ? 'bg-amber/15 text-amber border-amber/30'
                        : 'bg-rose/15 text-rose border-rose/30'
                    }`}
                  >
                    {o.status === 'approved' ? 'Đã duyệt' : o.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
                  <div>Phương thức: {o.payment_method === 'nova' ? 'VNC' : 'Chuyển khoản'}</div>
                  <div className="font-mono text-cyan font-bold">
                    {o.payment_method === 'nova' ? `${o.price_nova} VNC` : `${o.price_vnd?.toLocaleString('vi-VN')}đ`}
                  </div>
                </div>
                {o.transfer_note && (
                  <div className="text-[11px] text-muted">Ghi chú: {o.transfer_note}</div>
                )}
                {o.status === 'pending' && (
                  <div className="flex items-center gap-2 pt-1 border-t border-line">
                    <button
                      onClick={() => actOrder(o.id, 'approve')}
                      className="flex-1 py-1.5 px-3 rounded-xl bg-cyan text-ink text-xs font-semibold hover:brightness-110 transition"
                    >
                      Duyệt & Giao Key
                    </button>
                    <button
                      onClick={() => actOrder(o.id, 'reject')}
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
                <th className="text-left px-3.5 py-3">Hình thức</th>
                <th className="text-left px-3.5 py-3">Giá</th>
                <th className="text-left px-3.5 py-3">Ghi chú chuyển khoản</th>
                <th className="text-left px-3.5 py-3">Trạng thái</th>
                <th className="text-right px-3.5 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface2/50 transition">
                  <td className="px-3.5 py-3 font-semibold">{o.username}</td>
                  <td className="px-3.5 py-3 text-muted">
                    {o.payment_method === 'nova' ? 'Số dư VNC' : 'Chuyển khoản VNĐ'}
                  </td>
                  <td className="px-3.5 py-3 font-mono font-bold text-cyan">
                    {o.payment_method === 'nova' ? `${o.price_nova} VNC` : `${o.price_vnd?.toLocaleString('vi-VN')}đ`}
                  </td>
                  <td className="px-3.5 py-3 text-muted">{o.transfer_note || '-'}</td>
                  <td className="px-3.5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        o.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : o.status === 'pending'
                          ? 'bg-amber/15 text-amber border-amber/30'
                          : 'bg-rose/15 text-rose border-rose/30'
                      }`}
                    >
                      {o.status === 'approved' ? 'Đã duyệt' : o.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                    </span>
                  </td>
                  <td className="px-3.5 py-3 text-right space-x-2 whitespace-nowrap">
                    {o.status === 'pending' && (
                      <>
                        <button
                          onClick={() => actOrder(o.id, 'approve')}
                          className="px-2.5 py-1 rounded-lg bg-cyan text-ink text-xs font-semibold hover:brightness-110 transition"
                        >
                          Duyệt giao key
                        </button>
                        <button
                          onClick={() => actOrder(o.id, 'reject')}
                          className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-rose text-xs hover:bg-rose/25 transition"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

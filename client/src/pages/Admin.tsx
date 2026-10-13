import { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.js';
import { Skeleton } from '../components/Skeleton.js';

async function adminApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
  return data as T;
}

type TabKey = 'overview' | 'withdrawals' | 'redeem' | 'creators' | 'tasks' | 'users' | 'vietsub' | 'giftcodes' | 'settings' | 'support';

const TABS: { key: TabKey; labelKey: string; icon: string }[] = [
  { key: 'overview', labelKey: 'admin.tab_overview', icon: 'bi-speedometer2' },
  { key: 'withdrawals', labelKey: 'admin.tab_withdrawals', icon: 'bi-cash-coin' },
  { key: 'redeem', labelKey: 'admin.tab_redeem', icon: 'bi-controller' },
  { key: 'creators', labelKey: 'admin.tab_creators', icon: 'bi-tag' },
  { key: 'tasks', labelKey: 'admin.tab_tasks', icon: 'bi-list-check' },
  { key: 'users', labelKey: 'admin.tab_users', icon: 'bi-people' },
  { key: 'vietsub', labelKey: 'admin.tab_vietsub', icon: 'bi-badge-cc' },
  { key: 'giftcodes', labelKey: 'admin.tab_giftcodes', icon: 'bi-gift' },
  { key: 'support', labelKey: 'admin.tab_support', icon: 'bi-headset' },
  { key: 'settings', labelKey: 'admin.tab_settings', icon: 'bi-sliders' },
];

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('overview');
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">{t('admin.page_title')}</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((tabDef) => (
          <button
            key={tabDef.key} onClick={() => setTab(tabDef.key)}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-line ${tab === tabDef.key ? 'bg-indigo text-white' : 'text-muted'}`}
          >
            <i className={`bi ${tabDef.icon}`} />{t(tabDef.labelKey)}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'withdrawals' && <Withdrawals />}
      {tab === 'redeem' && <RedeemOrders />}
      {tab === 'creators' && <CreatorCodes />}
      {tab === 'tasks' && <Tasks />}
      {tab === 'users' && <Users />}
      {tab === 'vietsub' && <VietsubAdmin />}
      {tab === 'giftcodes' && <GiftcodesAdmin />}
      {tab === 'settings' && <SiteSettings />}
      {tab === 'support' && <SupportAdmin />}
    </div>
  );
}

interface Stats {
  users: number;
  totalNovaOut: number;
  pendingWithdrawals: number;
}

function Overview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [payoutMsg, setPayoutMsg] = useState('');
  useEffect(() => { adminApi<Stats>('/stats').then(setStats); }, []);

  async function triggerMonthlyPayout() {
    if (!confirm('Phát thưởng top 3 bảng xếp hạng tháng ngay bây giờ?')) return;
    const result = await adminApi<{ paid: { username: string; amount: number }[] }>('/leaderboard/monthly-payout', { method: 'POST' });
    setPayoutMsg(result.paid.length > 0 ? result.paid.map((p) => `${p.username}: +${p.amount} VNC`).join(', ') : 'Chưa có ai đủ điều kiện.');
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] text-muted uppercase">Người dùng</div>
          {stats ? <div className="font-mono text-2xl">{stats.users}</div> : <Skeleton className="h-8 w-16 mt-1" />}
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] text-muted uppercase">Tổng VNC đã phát</div>
          {stats ? <div className="font-mono text-2xl">{stats.totalNovaOut}</div> : <Skeleton className="h-8 w-20 mt-1" />}
        </div>
        <div className="bg-surface border border-line rounded-xl p-4">
          <div className="text-[11px] text-muted uppercase">Yêu cầu chờ duyệt</div>
          {stats ? <div className="font-mono text-2xl text-amber">{stats.pendingWithdrawals}</div> : <Skeleton className="h-8 w-12 mt-1" />}
        </div>
      </div>
      <div className="bg-surface border border-line rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-2">Phát thưởng bảng xếp hạng tháng (top 3: 500 / 300 / 100 VNC)</h2>
        <button onClick={triggerMonthlyPayout} className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">Phát thưởng ngay</button>
        {payoutMsg && <p className="text-xs text-cyan mt-2">{payoutMsg}</p>}
      </div>
    </div>
  );
}

function TableSkeletonRows({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <tr key={i} className="border-t border-line">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-2"><Skeleton className="h-4 w-full max-w-[120px]" /></td>
          ))}
        </tr>
      ))}
    </>
  );
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="border border-line rounded-xl overflow-x-auto"><table className="w-full text-sm min-w-[560px]">{children}</table></div>;
}

interface WithdrawalRow {
  id: string;
  username: string;
  amount_nova: number;
  amount_vnd: number;
  status: string;
}

function Withdrawals() {
  const [rows, setRows] = useState<WithdrawalRow[] | null>(null);
  function load() { adminApi<WithdrawalRow[]>('/withdrawals').then(setRows); }
  useEffect(load, []);
  async function act(id: string, action: 'approve' | 'reject') { await adminApi(`/withdrawals/${id}/${action}`, { method: 'POST' }); load(); }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <a href="/api/admin/withdrawals/export.csv" className="text-xs text-indigo flex items-center gap-1">
          <i className="bi bi-download" /> Xuất CSV
        </a>
      </div>
      <TableWrap>
      <thead className="bg-surface2 text-muted text-xs">
        <tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">VNC</th><th className="text-left px-3 py-2">VNĐ</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2">Hành động</th></tr>
      </thead>
      <tbody>
        {!rows ? (
          <TableSkeletonRows cols={5} />
        ) : (
          <>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-line">
                <td className="px-3 py-2">{w.username}</td>
                <td className="px-3 py-2 font-mono">{w.amount_nova}</td>
                <td className="px-3 py-2 font-mono">{w.amount_vnd.toLocaleString('vi-VN')}</td>
                <td className="px-3 py-2">{w.status}</td>
                <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                  {w.status === 'pending' && (<>
                    <button onClick={() => act(w.id, 'approve')} className="text-cyan text-xs">Duyệt</button>
                    <button onClick={() => act(w.id, 'reject')} className="text-rose text-xs">Từ chối</button>
                  </>)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Chưa có yêu cầu nào.</td></tr>}
          </>
        )}
      </tbody>
    </TableWrap>
    </div>
  );
}

interface RedeemOrderRow {
  id: string;
  username: string;
  label: string;
  price_nova: number;
  status: string;
}

function RedeemOrders() {
  const [rows, setRows] = useState<RedeemOrderRow[] | null>(null);
  function load() { adminApi<RedeemOrderRow[]>('/redeem-orders').then(setRows); }
  useEffect(load, []);
  async function act(id: string, action: 'fulfill' | 'reject') { await adminApi(`/redeem-orders/${id}/${action}`, { method: 'POST' }); load(); }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <a href="/api/admin/redeem-orders/export.csv" className="text-xs text-indigo flex items-center gap-1">
          <i className="bi bi-download" /> Xuất CSV
        </a>
      </div>
      <TableWrap>
      <thead className="bg-surface2 text-muted text-xs">
        <tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Vật phẩm</th><th className="text-left px-3 py-2">VNC</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2">Hành động</th></tr>
      </thead>
      <tbody>
        {!rows ? (
          <TableSkeletonRows cols={5} />
        ) : (
          <>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-3 py-2">{o.username}</td>
                <td className="px-3 py-2">{o.label}</td>
                <td className="px-3 py-2 font-mono">{o.price_nova}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                  {o.status === 'pending' && (<>
                    <button onClick={() => act(o.id, 'fulfill')} className="text-cyan text-xs">Đã giao</button>
                    <button onClick={() => act(o.id, 'reject')} className="text-rose text-xs">Từ chối</button>
                  </>)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-muted">Chưa có đơn nào.</td></tr>}
          </>
        )}
      </tbody>
    </TableWrap>
    </div>
  );
}

interface CreatorCodeRow {
  id: string;
  code: string;
  owner_username: string;
  bonus_percent: number;
  used_by_count: number;
  active: number;
}

function CreatorCodes() {
  const [rows, setRows] = useState<CreatorCodeRow[]>([]);
  const [form, setForm] = useState({ code: '', owner_username: '', bonus_percent: 5 });
  function load() { adminApi<CreatorCodeRow[]>('/creator-codes').then(setRows); }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    await adminApi('/creator-codes', { method: 'POST', body: JSON.stringify(form) });
    setForm({ code: '', owner_username: '', bonus_percent: 5 });
    load();
  }
  async function toggle(id: string, active: number) { await adminApi(`/creator-codes/${id}`, { method: 'PATCH', body: JSON.stringify({ active: active ? 0 : 1 }) }); load(); }

  return (
    <div>
      <form onSubmit={create} className="bg-surface border border-line rounded-xl p-4 mb-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-[11px] text-muted block mb-1">Code</label>
          <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm w-32" required />
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">Username chủ code</label>
          <input value={form.owner_username} onChange={(e) => setForm({ ...form, owner_username: e.target.value })} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm w-40" required />
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">% hoa hồng</label>
          <input type="number" value={form.bonus_percent} onChange={(e) => setForm({ ...form, bonus_percent: Number(e.target.value) })} className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm w-20" />
        </div>
        <button className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">Tạo code</button>
      </form>

      <TableWrap>
        <thead className="bg-surface2 text-muted text-xs">
          <tr><th className="text-left px-3 py-2">Code</th><th className="text-left px-3 py-2">Chủ sở hữu</th><th className="text-left px-3 py-2">%</th><th className="text-left px-3 py-2">Đã dùng</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2"></th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="border-t border-line">
              <td className="px-3 py-2 font-mono">{c.code}</td>
              <td className="px-3 py-2">{c.owner_username}</td>
              <td className="px-3 py-2">{c.bonus_percent}%</td>
              <td className="px-3 py-2">{c.used_by_count}</td>
              <td className="px-3 py-2">{c.active ? 'Đang bật' : 'Đã tắt'}</td>
              <td className="px-3 py-2"><button onClick={() => toggle(c.id, c.active)} className="text-xs text-blue-400">{c.active ? 'Tắt' : 'Bật'}</button></td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Chưa có creator code nào.</td></tr>}
        </tbody>
      </TableWrap>
    </div>
  );
}

interface TaskRow {
  id: string;
  name: string;
  provider_key: string;
  reward_nova: number;
  daily_limit: number;
  active: number;
}

function Tasks() {
  const [rows, setRows] = useState<TaskRow[] | null>(null);
  function load() { adminApi<TaskRow[]>('/tasks').then(setRows); }
  useEffect(load, []);
  async function update(id: string, patch: Partial<Pick<TaskRow, 'reward_nova' | 'daily_limit' | 'active'>>) {
    await adminApi(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
    load();
  }

  return (
    <TableWrap>
      <thead className="bg-surface2 text-muted text-xs">
        <tr><th className="text-left px-3 py-2">Tên</th><th className="text-left px-3 py-2">Provider</th><th className="text-left px-3 py-2">Thưởng</th><th className="text-left px-3 py-2">Giới hạn/ngày</th><th className="text-left px-3 py-2">Trạng thái</th></tr>
      </thead>
      <tbody>
        {!rows ? (
          <TableSkeletonRows cols={5} />
        ) : (
          rows.map((t) => (
            <tr key={t.id} className="border-t border-line">
              <td className="px-3 py-2">{t.name}</td>
              <td className="px-3 py-2 text-muted">{t.provider_key}</td>
              <td className="px-3 py-2">
                <input type="number" defaultValue={t.reward_nova} onBlur={(e) => update(t.id, { reward_nova: Number(e.target.value) })} className="w-16 bg-surface2 border border-line rounded px-2 py-1 font-mono text-xs" />
              </td>
              <td className="px-3 py-2">
                <input type="number" defaultValue={t.daily_limit} onBlur={(e) => update(t.id, { daily_limit: Number(e.target.value) })} className="w-20 bg-surface2 border border-line rounded px-2 py-1 font-mono text-xs" />
              </td>
              <td className="px-3 py-2">
                <button onClick={() => update(t.id, { active: t.active ? 0 : 1 })} className={`text-xs ${t.active ? 'text-cyan' : 'text-muted'}`}>
                  {t.active ? 'Đang bật' : 'Đã tắt'}
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </TableWrap>
  );
}

interface UserRow {
  id: string;
  username: string;
  balance_nova: number;
  role: string;
}

function Users() {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [adjust, setAdjust] = useState<Record<string, string>>({});

  async function load() {
    setRows(await adminApi<UserRow[]>(`/users?search=${encodeURIComponent(search)}`));
  }
  useEffect(() => { load(); }, []);

  async function submitAdjust(id: string) {
    const amount = Number(adjust[id] || 0);
    if (!amount) return;
    await adminApi(`/users/${id}/adjust`, { method: 'POST', body: JSON.stringify({ amount }) });
    setAdjust((a) => ({ ...a, [id]: '' }));
    load();
  }

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo username" className="bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm flex-1" />
        <button onClick={load} className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">Tìm</button>
      </div>
      <TableWrap>
        <thead className="bg-surface2 text-muted text-xs">
          <tr><th className="text-left px-3 py-2">Username</th><th className="text-left px-3 py-2">Số dư</th><th className="text-left px-3 py-2">Vai trò</th><th className="text-left px-3 py-2">Điều chỉnh VNC</th></tr>
        </thead>
        <tbody>
          {!rows ? (
            <TableSkeletonRows cols={4} />
          ) : (
            rows.map((u) => (
              <tr key={u.id} className="border-t border-line">
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2 font-mono">{u.balance_nova}</td>
                <td className="px-3 py-2">{u.role}</td>
                <td className="px-3 py-2 flex gap-2">
                  <input
                    value={adjust[u.id] || ''} onChange={(e) => setAdjust((a) => ({ ...a, [u.id]: e.target.value }))}
                    placeholder="+/- VNC" className="w-24 bg-surface2 border border-line rounded px-2 py-1 text-xs"
                  />
                  <button onClick={() => submitAdjust(u.id)} className="text-xs text-cyan">Áp dụng</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </TableWrap>
    </div>
  );
}

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
}

function VietsubAdmin() {
  const [info, setInfo] = useState<VietsubInfo | null>(null);
  const [form, setForm] = useState({ priceNova: 0, priceVnd: 0, description: '', bankInfo: '', apkUrl: '', logoUrl: '', active: false });
  const [keys, setKeys] = useState('');
  const [orders, setOrders] = useState<VietsubOrderRow[]>([]);
  const [msg, setMsg] = useState('');

  async function load() {
    const data = await adminApi<VietsubInfo>('/vietsub/settings');
    setInfo(data);
    setForm({
      priceNova: data.priceNova ?? 0,
      priceVnd: data.priceVnd ?? 0,
      description: data.description,
      bankInfo: data.bankInfo,
      apkUrl: data.apkUrl,
      logoUrl: data.logoUrl,
      active: data.active,
    });
    setOrders(await adminApi<VietsubOrderRow[]>('/vietsub/orders'));
  }
  useEffect(() => { load(); }, []);

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    await adminApi('/vietsub/settings', { method: 'PATCH', body: JSON.stringify(form) });
    setMsg('Đã lưu cài đặt');
    load();
  }

  async function uploadKeys(e: React.FormEvent) {
    e.preventDefault();
    const result = await adminApi<{ added: number; skipped: number }>('/vietsub/licenses', {
      method: 'POST',
      body: JSON.stringify({ keys }),
    });
    setMsg(`Đã thêm ${result.added} key, bỏ qua ${result.skipped} key trùng`);
    setKeys('');
    load();
  }

  async function actOrder(id: string, action: 'approve' | 'reject') {
    await adminApi(`/vietsub/orders/${id}/${action}`, { method: 'POST' });
    load();
  }

  return (
    <div className="space-y-5">
      <form onSubmit={saveSettings} className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Cấu hình Vietsub Studio</h2>
        {msg && <p className="text-xs text-cyan">{msg}</p>}
        <div className="flex items-center gap-3">
          {form.logoUrl && <img src={form.logoUrl} alt="Logo Vietsub Studio" className="w-14 h-14 rounded-xl object-cover border border-line" />}
          <div className="flex-1">
            <label className="text-[11px] text-muted block mb-1">URL logo/icon app</label>
            <input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://.../logo.png" className="w-full bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">URL file APK</label>
          <input value={form.apkUrl} onChange={(e) => setForm({ ...form, apkUrl: e.target.value })} placeholder="https://.../vietsub-studio.apk" className="w-full bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Giá (VNC)</label>
            <input type="number" value={form.priceNova} onChange={(e) => setForm({ ...form, priceNova: Number(e.target.value) })} className="w-full bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Giá (VNĐ)</label>
            <input type="number" value={form.priceVnd} onChange={(e) => setForm({ ...form, priceVnd: Number(e.target.value) })} className="w-full bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">Mô tả sản phẩm</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="text-[11px] text-muted block mb-1">Thông tin chuyển khoản (hiện cho user khi mua bằng VNĐ)</label>
          <textarea value={form.bankInfo} onChange={(e) => setForm({ ...form, bankInfo: e.target.value })} rows={2} placeholder="Vietcombank - 0123456789 - NGUYEN VAN A" className="w-full bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
          Mở bán
        </label>
        <button className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">Lưu cài đặt</button>
      </form>

      <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Kho license key ({info?.availableCount ?? 0} key còn lại)</h2>
        <form onSubmit={uploadKeys} className="space-y-2">
          <textarea value={keys} onChange={(e) => setKeys(e.target.value)} rows={5} placeholder="Mỗi dòng 1 key" className="w-full bg-surface2 border border-line rounded-lg px-3 py-2 text-sm font-mono" />
          <button className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg">Thêm key</button>
        </form>
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-2">Đơn chờ duyệt (tất cả đều cần admin duyệt trước khi giao key)</h2>
        <TableWrap>
          <thead className="bg-surface2 text-muted text-xs">
            <tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Hình thức</th><th className="text-left px-3 py-2">Giá</th><th className="text-left px-3 py-2">Ghi chú CK</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2">Hành động</th></tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-3 py-2">{o.username}</td>
                <td className="px-3 py-2">{o.payment_method === 'nova' ? 'VNC' : 'Chuyển khoản'}</td>
                <td className="px-3 py-2 font-mono">{o.payment_method === 'nova' ? o.price_nova : o.price_vnd?.toLocaleString('vi-VN') + 'đ'}</td>
                <td className="px-3 py-2 text-xs">{o.transfer_note || '-'}</td>
                <td className="px-3 py-2">{o.status}</td>
                <td className="px-3 py-2 space-x-2 whitespace-nowrap">
                  {o.status === 'pending' && (<>
                    <button onClick={() => actOrder(o.id, 'approve')} className="text-cyan text-xs">
                      {o.payment_method === 'nova' ? 'Duyệt (trừ VNC + giao key)' : 'Duyệt (đã nhận tiền)'}
                    </button>
                    <button onClick={() => actOrder(o.id, 'reject')} className="text-rose text-xs">Từ chối</button>
                  </>)}
                </td>
              </tr>
            ))}
            {orders.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted">Chưa có đơn nào.</td></tr>}
          </tbody>
        </TableWrap>
      </div>
    </div>
  );
}

interface GiftcodeRow {
  id: string;
  code: string;
  reward_nova: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: number;
  created_at: string;
}

function GiftcodesAdmin() {
  const [list, setList] = useState<GiftcodeRow[]>([]);
  const [form, setForm] = useState({ code: '', reward_nova: 10, max_uses: 100, expires_at: '' });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  function load() {
    adminApi<GiftcodeRow[]>('/giftcodes').then(setList).catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) return;
    setLoading(true);
    setMsg('');
    try {
      await adminApi('/giftcodes', {
        method: 'POST',
        body: JSON.stringify({
          code: form.code.trim().toUpperCase(),
          reward_nova: Number(form.reward_nova),
          max_uses: Number(form.max_uses),
          expires_at: form.expires_at || null,
        }),
      });
      setForm({ code: '', reward_nova: 10, max_uses: 100, expires_at: '' });
      setMsg('Tạo mã Giftcode thành công!');
      load();
    } catch (err: any) {
      setMsg(err.message || 'Lỗi tạo giftcode');
    } finally {
      setLoading(false);
    }
  }

  async function toggle(id: string) {
    await adminApi(`/giftcodes/${id}/toggle`, { method: 'PATCH' });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Bạn có chắc muốn xóa Giftcode này?')) return;
    await adminApi(`/giftcodes/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      {/* Create form */}
      <form onSubmit={create} className="bg-surface border border-line rounded-2xl p-5 space-y-4 max-w-xl">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-gift-fill text-amber" /> Tạo mã Giftcode mới
        </h2>
        {msg && <p className="text-xs text-cyan">{msg}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Mã Giftcode</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="VD: TANTHU50"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm font-mono uppercase"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Phần thưởng (VNC)</label>
            <input
              type="number"
              min="1"
              value={form.reward_nova}
              onChange={(e) => setForm({ ...form, reward_nova: Number(e.target.value) })}
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm font-mono"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Số lượt dùng tối đa</label>
            <input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: Number(e.target.value) })}
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm font-mono"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Hạn sử dụng (Để trống = vĩnh viễn)</label>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs sm:text-sm"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo hover:brightness-110 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition btn-press flex items-center gap-1.5"
        >
          <i className="bi bi-plus-lg" />
          <span>Tạo mã ngay</span>
        </button>
      </form>

      {/* Giftcode Table */}
      <div>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <i className="bi bi-list-ul" /> Danh sách mã Giftcode ({list.length})
        </h2>
        <TableWrap>
          <table className="w-full text-left text-xs">
            <thead className="bg-surface2 text-muted border-b border-line text-[11px] uppercase">
              <tr>
                <th className="px-3 py-2">Mã Code</th>
                <th className="px-3 py-2">Thưởng VNC</th>
                <th className="px-3 py-2">Đã dùng / Tối đa</th>
                <th className="px-3 py-2">Hạn sử dụng</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.map((g) => {
                const expired = g.expires_at && new Date(g.expires_at) < new Date();
                const outOfUses = g.used_count >= g.max_uses;

                return (
                  <tr key={g.id} className="hover:bg-surface2/50 transition">
                    <td className="px-3 py-2.5 font-mono font-bold text-amber">{g.code}</td>
                    <td className="px-3 py-2.5 font-mono text-cyan">+{g.reward_nova} VNC</td>
                    <td className="px-3 py-2.5 font-mono">
                      {g.used_count} / {g.max_uses}
                    </td>
                    <td className="px-3 py-2.5 text-muted">
                      {g.expires_at ? new Date(g.expires_at).toLocaleDateString('vi-VN') : 'Không thời hạn'}
                    </td>
                    <td className="px-3 py-2.5">
                      {expired ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose/15 text-rose border border-rose/30">
                          Hết hạn
                        </span>
                      ) : outOfUses ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber/15 text-amber border border-amber/30">
                          Hết lượt
                        </span>
                      ) : g.active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          Hoạt động
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface2 text-muted border border-line">
                          Tạm khóa
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right space-x-1.5">
                      <button
                        onClick={() => toggle(g.id)}
                        className="px-2 py-1 rounded bg-surface2 hover:bg-line border border-line text-muted hover:text-ink transition"
                      >
                        {g.active ? 'Khóa' : 'Bật'}
                      </button>
                      <button
                        onClick={() => remove(g.id)}
                        className="px-2 py-1 rounded bg-rose/15 hover:bg-rose/25 text-rose border border-rose/30 transition"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted">
                    Chưa có mã Giftcode nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </div>
    </div>
  );
}

function SiteSettings() {
  const [announcements, setAnnouncements] = useState<{ id: string; message: string; active: number; created_at: string }[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState('');

  function loadAnnouncements() {
    adminApi<typeof announcements>('/announcements').then(setAnnouncements);
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    await adminApi('/announcements', { method: 'POST', body: JSON.stringify({ message: newAnnouncement }) });
    setNewAnnouncement('');
    loadAnnouncements();
  }

  async function deactivate(id: string) {
    await adminApi(`/announcements/${id}/deactivate`, { method: 'POST' });
    loadAnnouncements();
  }

  return (
    <div className="space-y-5 max-w-md">
      <div className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold">Thông báo chung (banner đầu trang)</h2>
        <form onSubmit={postAnnouncement} className="flex gap-2">
          <input value={newAnnouncement} onChange={(e) => setNewAnnouncement(e.target.value)} placeholder="Nội dung thông báo mới" className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-1.5 text-sm" />
          <button className="bg-indigo text-white text-xs font-medium px-3 py-2 rounded-lg shrink-0">Đăng</button>
        </form>
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="flex items-center justify-between bg-surface2 rounded-lg px-3 py-2 text-xs">
              <span className={a.active ? 'text-ink' : 'text-muted line-through'}>{a.message}</span>
              {a.active === 1 && <button onClick={() => deactivate(a.id)} className="text-rose shrink-0 ml-2">Tắt</button>}
            </div>
          ))}
          {announcements.length === 0 && <p className="text-xs text-muted">Chưa có thông báo nào.</p>}
        </div>
      </div>
    </div>
  );
}

interface AdminTicket {
  id: string;
  username: string;
  subject: string;
  status: 'open' | 'closed';
  updated_at: string;
}

interface AdminTicketMessage {
  id: string;
  sender_role: 'user' | 'admin';
  message: string;
  created_at: string;
}

function SupportAdmin() {
  const [tickets, setTickets] = useState<AdminTicket[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ ticket: AdminTicket; messages: AdminTicketMessage[] } | null>(null);
  const [reply, setReply] = useState('');

  function loadList() {
    adminApi<AdminTicket[]>('/support/tickets').then(setTickets);
  }
  useEffect(loadList, []);

  function loadDetail(id: string) {
    adminApi<{ ticket: AdminTicket; messages: AdminTicketMessage[] }>(`/support/tickets/${id}`).then(setDetail);
  }

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    await adminApi(`/support/tickets/${activeId}/messages`, { method: 'POST', body: JSON.stringify({ message: reply }) });
    setReply('');
    loadDetail(activeId);
  }

  async function toggleStatus() {
    if (!activeId || !detail) return;
    const action = detail.ticket.status === 'open' ? 'close' : 'reopen';
    await adminApi(`/support/tickets/${activeId}/${action}`, { method: 'POST' });
    loadDetail(activeId);
    loadList();
  }

  if (activeId && detail) {
    return (
      <div className="max-w-lg">
        <button onClick={() => { setActiveId(null); setDetail(null); }} className="text-xs text-muted mb-3">← Quay lại</button>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-sm">{detail.ticket.subject}</h2>
          <button onClick={toggleStatus} className="text-xs text-indigo">
            {detail.ticket.status === 'open' ? 'Đóng ticket' : 'Mở lại'}
          </button>
        </div>
        <p className="text-xs text-muted mb-4">User: {detail.ticket.username} — {detail.ticket.status}</p>
        <div className="space-y-2 mb-4">
          {detail.messages.map((m) => (
            <div key={m.id} className={`rounded-lg p-3 text-sm max-w-[85%] ${m.sender_role === 'admin' ? 'bg-indigo/10 border border-indigo/30 ml-auto' : 'bg-surface border border-line'}`}>
              <p>{m.message}</p>
              <p className="text-[10px] text-muted mt-1">{new Date(m.created_at).toLocaleString('vi-VN')}</p>
            </div>
          ))}
        </div>
        {detail.ticket.status === 'open' && (
          <form onSubmit={sendReply} className="flex gap-2">
            <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Trả lời user..." className="flex-1 bg-surface2 border border-line rounded-lg px-3 py-2 text-sm" />
            <button className="bg-indigo text-white text-sm font-medium px-4 py-2 rounded-lg shrink-0">Gửi</button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 max-w-lg">
      {!tickets ? (
        <Skeleton className="h-40 w-full rounded-xl" />
      ) : tickets.length === 0 ? (
        <p className="text-sm text-muted">Chưa có ticket nào.</p>
      ) : (
        tickets.map((tkt) => (
          <button key={tkt.id} onClick={() => { setActiveId(tkt.id); loadDetail(tkt.id); }} className="w-full text-left bg-surface border border-line rounded-xl p-3 flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">{tkt.subject}</div>
              <div className="text-[10px] text-muted">{tkt.username} — {new Date(tkt.updated_at).toLocaleString('vi-VN')}</div>
            </div>
            <span className={`text-xs ${tkt.status === 'open' ? 'text-cyan' : 'text-muted'}`}>{tkt.status}</span>
          </button>
        ))
      )}
    </div>
  );
}

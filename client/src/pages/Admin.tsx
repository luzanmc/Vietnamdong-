import { useEffect, useState } from 'react';

async function adminApi<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/admin${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Lỗi không xác định');
  return data as T;
}

type TabKey = 'overview' | 'withdrawals' | 'redeem' | 'creators' | 'tasks' | 'users';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'overview', label: 'Tổng quan', icon: 'bi-speedometer2' },
  { key: 'withdrawals', label: 'Rút tiền', icon: 'bi-cash-coin' },
  { key: 'redeem', label: 'Đổi thưởng', icon: 'bi-controller' },
  { key: 'creators', label: 'Creator Code', icon: 'bi-tag' },
  { key: 'tasks', label: 'Nhiệm vụ', icon: 'bi-list-check' },
  { key: 'users', label: 'Người dùng', icon: 'bi-people' },
];

export default function Admin() {
  const [tab, setTab] = useState<TabKey>('overview');

  return (
    <div>
      <h1 className="font-display text-xl font-semibold mb-4">Quản trị</h1>

      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key} onClick={() => setTab(t.key)}
            className={`shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-line ${tab === t.key ? 'bg-indigo text-white' : 'text-muted'}`}
          >
            <i className={`bi ${t.icon}`} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'withdrawals' && <Withdrawals />}
      {tab === 'redeem' && <RedeemOrders />}
      {tab === 'creators' && <CreatorCodes />}
      {tab === 'tasks' && <Tasks />}
      {tab === 'users' && <Users />}
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
  useEffect(() => { adminApi<Stats>('/stats').then(setStats); }, []);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="text-[11px] text-muted uppercase">Người dùng</div>
        <div className="font-mono text-2xl">{stats?.users ?? '...'}</div>
      </div>
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="text-[11px] text-muted uppercase">Tổng Nova đã phát</div>
        <div className="font-mono text-2xl">{stats?.totalNovaOut ?? '...'}</div>
      </div>
      <div className="bg-surface border border-line rounded-xl p-4">
        <div className="text-[11px] text-muted uppercase">Yêu cầu chờ duyệt</div>
        <div className="font-mono text-2xl text-amber">{stats?.pendingWithdrawals ?? '...'}</div>
      </div>
    </div>
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
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  function load() { adminApi<WithdrawalRow[]>('/withdrawals').then(setRows); }
  useEffect(load, []);
  async function act(id: string, action: 'approve' | 'reject') { await adminApi(`/withdrawals/${id}/${action}`, { method: 'POST' }); load(); }

  return (
    <TableWrap>
      <thead className="bg-surface2 text-muted text-xs">
        <tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Nova</th><th className="text-left px-3 py-2">VNĐ</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2">Hành động</th></tr>
      </thead>
      <tbody>
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
      </tbody>
    </TableWrap>
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
  const [rows, setRows] = useState<RedeemOrderRow[]>([]);
  function load() { adminApi<RedeemOrderRow[]>('/redeem-orders').then(setRows); }
  useEffect(load, []);
  async function act(id: string, action: 'fulfill' | 'reject') { await adminApi(`/redeem-orders/${id}/${action}`, { method: 'POST' }); load(); }

  return (
    <TableWrap>
      <thead className="bg-surface2 text-muted text-xs">
        <tr><th className="text-left px-3 py-2">User</th><th className="text-left px-3 py-2">Vật phẩm</th><th className="text-left px-3 py-2">Nova</th><th className="text-left px-3 py-2">Trạng thái</th><th className="text-left px-3 py-2">Hành động</th></tr>
      </thead>
      <tbody>
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
      </tbody>
    </TableWrap>
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
  const [rows, setRows] = useState<TaskRow[]>([]);
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
        {rows.map((t) => (
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
        ))}
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
  const [rows, setRows] = useState<UserRow[]>([]);
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
          <tr><th className="text-left px-3 py-2">Username</th><th className="text-left px-3 py-2">Số dư</th><th className="text-left px-3 py-2">Vai trò</th><th className="text-left px-3 py-2">Điều chỉnh Nova</th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-t border-line">
              <td className="px-3 py-2">{u.username}</td>
              <td className="px-3 py-2 font-mono">{u.balance_nova}</td>
              <td className="px-3 py-2">{u.role}</td>
              <td className="px-3 py-2 flex gap-2">
                <input
                  value={adjust[u.id] || ''} onChange={(e) => setAdjust((a) => ({ ...a, [u.id]: e.target.value }))}
                  placeholder="+/- Nova" className="w-24 bg-surface2 border border-line rounded px-2 py-1 text-xs"
                />
                <button onClick={() => submitAdjust(u.id)} className="text-xs text-cyan">Áp dụng</button>
              </td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </div>
  );
}

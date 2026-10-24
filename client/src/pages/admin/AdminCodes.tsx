import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';

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

interface CreatorCodeRow {
  id: string;
  code: string;
  owner_username: string;
  bonus_percent: number;
  used_by_count: number;
  active: number;
  created_at: string;
}

export default function AdminCodes() {
  const [subTab, setSubTab] = useState<'giftcodes' | 'creators'>('giftcodes');

  const [giftcodes, setGiftcodes] = useState<GiftcodeRow[]>([]);
  const [gfLoading, setGfLoading] = useState(true);
  const [gfForm, setGfForm] = useState({ code: '', reward_nova: 10, max_uses: 100, expires_at: '' });
  const [gfMsg, setGfMsg] = useState('');
  const [gfError, setGfError] = useState('');
  const [activeHistoryGf, setActiveHistoryGf] = useState<{ id: string; code: string } | null>(null);
  const [gfHistoryRows, setGfHistoryRows] = useState<any[] | null>(null);

  const [creators, setCreators] = useState<CreatorCodeRow[]>([]);
  const [crLoading, setCrLoading] = useState(true);
  const [crForm, setCrForm] = useState({ code: '', owner_username: '', bonus_percent: 5 });
  const [crMsg, setCrMsg] = useState('');
  const [crError, setCrError] = useState('');
  const [activeHistoryCr, setActiveHistoryCr] = useState<{ id: string; code: string } | null>(null);
  const [crHistoryRows, setCrHistoryRows] = useState<any[] | null>(null);

  async function loadGiftcodes() {
    setGfLoading(true);
    try {
      const res = await fetch('/api/admin/codes/giftcodes', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setGiftcodes(data);
    } catch {
    } finally {
      setGfLoading(false);
    }
  }

  async function loadCreators() {
    setCrLoading(true);
    try {
      const res = await fetch('/api/admin/codes/creators', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setCreators(data);
    } catch {
    } finally {
      setCrLoading(false);
    }
  }

  useEffect(() => {
    loadGiftcodes();
    loadCreators();
  }, []);

  async function handleCreateGiftcode(e: React.FormEvent) {
    e.preventDefault();
    if (!gfForm.code.trim()) return;
    setGfMsg('');
    setGfError('');
    try {
      const res = await fetch('/api/admin/codes/giftcodes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: gfForm.code.trim().toUpperCase(),
          reward_nova: Number(gfForm.reward_nova),
          max_uses: Number(gfForm.max_uses),
          expires_at: gfForm.expires_at || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo giftcode');
      setGfMsg('Tạo mã Giftcode thành công');
      setGfForm({ code: '', reward_nova: 10, max_uses: 100, expires_at: '' });
      loadGiftcodes();
    } catch (err: any) {
      setGfError(err.message || 'Lỗi hệ thống');
    }
  }

  async function handleToggleGiftcode(id: string) {
    try {
      await fetch(`/api/admin/codes/giftcodes/${id}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      });
      loadGiftcodes();
    } catch {
    }
  }

  async function handleDeleteGiftcode(id: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa Giftcode này?')) return;
    try {
      await fetch(`/api/admin/codes/giftcodes/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      loadGiftcodes();
    } catch {
    }
  }

  async function handleViewGiftcodeHistory(id: string, code: string) {
    setActiveHistoryGf({ id, code });
    setGfHistoryRows(null);
    try {
      const res = await fetch(`/api/admin/codes/giftcodes/${id}/history`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setGfHistoryRows(data);
    } catch {
    }
  }

  async function handleCreateCreator(e: React.FormEvent) {
    e.preventDefault();
    if (!crForm.code.trim() || !crForm.owner_username.trim()) return;
    setCrMsg('');
    setCrError('');
    try {
      const res = await fetch('/api/admin/codes/creators', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo Creator Code');
      setCrMsg('Tạo Creator Code thành công');
      setCrForm({ code: '', owner_username: '', bonus_percent: 5 });
      loadCreators();
    } catch (err: any) {
      setCrError(err.message || 'Lỗi hệ thống');
    }
  }

  async function handleToggleCreator(id: string, currentActive: number) {
    try {
      await fetch(`/api/admin/codes/creators/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: currentActive ? 0 : 1 }),
      });
      loadCreators();
    } catch {
    }
  }

  async function handleViewCreatorHistory(id: string, code: string) {
    setActiveHistoryCr({ id, code });
    setCrHistoryRows(null);
    try {
      const res = await fetch(`/api/admin/codes/creators/${id}/history`, { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setCrHistoryRows(data);
    } catch {
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          onClick={() => setSubTab('giftcodes')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            subTab === 'giftcodes' ? 'bg-indigo text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <i className="bi bi-gift-fill" /> Giftcodes ({giftcodes.length})
        </button>
        <button
          onClick={() => setSubTab('creators')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
            subTab === 'creators' ? 'bg-indigo text-white' : 'text-muted hover:text-ink'
          }`}
        >
          <i className="bi bi-tag-fill" /> Creator Codes ({creators.length})
        </button>
      </div>

      {subTab === 'giftcodes' && (
        <div className="space-y-5">
          <form onSubmit={handleCreateGiftcode} className="bg-surface border border-line rounded-2xl p-5 space-y-4 max-w-xl">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-plus-circle text-amber" /> Tạo mã Giftcode mới
            </h3>
            {gfMsg && <div className="p-2.5 bg-cyan/15 border border-cyan/30 text-cyan text-xs rounded-xl">{gfMsg}</div>}
            {gfError && <div className="p-2.5 bg-rose/15 border border-rose/30 text-rose text-xs rounded-xl">{gfError}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Mã Giftcode</label>
                <input
                  value={gfForm.code}
                  onChange={(e) => setGfForm({ ...gfForm, code: e.target.value.toUpperCase() })}
                  placeholder="VD: TANTHU50"
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Phần thưởng (VNC)</label>
                <input
                  type="number"
                  min="1"
                  value={gfForm.reward_nova}
                  onChange={(e) => setGfForm({ ...gfForm, reward_nova: Number(e.target.value) })}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Số lượt dùng tối đa</label>
                <input
                  type="number"
                  min="1"
                  value={gfForm.max_uses}
                  onChange={(e) => setGfForm({ ...gfForm, max_uses: Number(e.target.value) })}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Hạn sử dụng (Để trống = Vĩnh viễn)</label>
                <input
                  type="datetime-local"
                  value={gfForm.expires_at}
                  onChange={(e) => setGfForm({ ...gfForm, expires_at: e.target.value })}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <i className="bi bi-plus-lg" /> Tạo mã ngay
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase">Danh sách Giftcodes</h3>

            <div className="block sm:hidden space-y-3">
              {gfLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
              ) : giftcodes.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
                  Chưa có giftcode nào.
                </div>
              ) : (
                giftcodes.map((g) => (
                  <div key={g.id} className="bg-surface border border-line rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber text-sm">{g.code}</span>
                      <span className="font-mono text-cyan text-xs font-semibold">+{g.reward_nova} VNC</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
                      <div>Đã dùng: {g.used_count} / {g.max_uses}</div>
                      <div>{g.active ? 'Hoạt động' : 'Tạm tắt'}</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-line">
                      <button
                        onClick={() => handleViewGiftcodeHistory(g.id, g.code)}
                        className="flex-1 py-1 px-2.5 rounded-lg bg-surface2 border border-line text-[11px] text-ink"
                      >
                        <i className="bi bi-clock-history mr-1" /> Lịch sử
                      </button>
                      <button
                        onClick={() => handleToggleGiftcode(g.id)}
                        className="py-1 px-2.5 rounded-lg border border-line text-[11px] text-muted"
                      >
                        {g.active ? 'Tắt' : 'Bật'}
                      </button>
                      <button
                        onClick={() => handleDeleteGiftcode(g.id)}
                        className="py-1 px-2.5 rounded-lg border border-rose/30 bg-rose/15 text-[11px] text-rose"
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
                    <th className="text-left px-3.5 py-3">Mã Code</th>
                    <th className="text-left px-3.5 py-3">Thưởng VNC</th>
                    <th className="text-left px-3.5 py-3">Đã dùng / Tối đa</th>
                    <th className="text-left px-3.5 py-3">Hạn sử dụng</th>
                    <th className="text-left px-3.5 py-3">Trạng thái</th>
                    <th className="text-right px-3.5 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {giftcodes.map((g) => (
                    <tr key={g.id} className="hover:bg-surface2/50 transition">
                      <td className="px-3.5 py-3 font-mono font-bold text-amber">{g.code}</td>
                      <td className="px-3.5 py-3 font-mono text-cyan">+{g.reward_nova} VNC</td>
                      <td className="px-3.5 py-3 font-mono">{g.used_count} / {g.max_uses}</td>
                      <td className="px-3.5 py-3 text-muted">
                        {g.expires_at ? new Date(g.expires_at).toLocaleDateString('vi-VN') : 'Vĩnh viễn'}
                      </td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            g.active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-surface2 text-muted border-line'
                          }`}
                        >
                          {g.active ? 'Hoạt động' : 'Tạm tắt'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleViewGiftcodeHistory(g.id, g.code)}
                          className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-ink hover:border-indigo transition"
                        >
                          <i className="bi bi-clock-history mr-1" /> Lịch sử
                        </button>
                        <button
                          onClick={() => handleToggleGiftcode(g.id)}
                          className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-muted hover:text-ink transition"
                        >
                          {g.active ? 'Tắt' : 'Bật'}
                        </button>
                        <button
                          onClick={() => handleDeleteGiftcode(g.id)}
                          className="px-2.5 py-1 rounded-lg bg-rose/15 border border-rose/30 text-rose hover:bg-rose/25 transition"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'creators' && (
        <div className="space-y-5">
          <form onSubmit={handleCreateCreator} className="bg-surface border border-line rounded-2xl p-5 space-y-4 max-w-xl">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-plus-circle text-indigo" /> Tạo Creator Code mới
            </h3>
            {crMsg && <div className="p-2.5 bg-cyan/15 border border-cyan/30 text-cyan text-xs rounded-xl">{crMsg}</div>}
            {crError && <div className="p-2.5 bg-rose/15 border border-rose/30 text-rose text-xs rounded-xl">{crError}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-muted block mb-1">Mã Code</label>
                <input
                  value={crForm.code}
                  onChange={(e) => setCrForm({ ...crForm, code: e.target.value.toUpperCase() })}
                  placeholder="VD: CREATOR1"
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">Username chủ sở hữu</label>
                <input
                  value={crForm.owner_username}
                  onChange={(e) => setCrForm({ ...crForm, owner_username: e.target.value })}
                  placeholder="Username"
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] text-muted block mb-1">% Hoa hồng</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={crForm.bonus_percent}
                  onChange={(e) => setCrForm({ ...crForm, bonus_percent: Number(e.target.value) })}
                  className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
            >
              <i className="bi bi-plus-lg" /> Tạo Creator Code
            </button>
          </form>

          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-muted uppercase">Danh sách Creator Codes</h3>

            <div className="block sm:hidden space-y-3">
              {crLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
              ) : creators.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted bg-surface border border-line rounded-2xl">
                  Chưa có creator code nào.
                </div>
              ) : (
                creators.map((c) => (
                  <div key={c.id} className="bg-surface border border-line rounded-2xl p-4 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-indigo text-sm">{c.code}</span>
                      <span className="text-xs font-semibold text-ink">{c.owner_username}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted">
                      <div>Hoa hồng: {c.bonus_percent}%</div>
                      <div>Đã dùng: {c.used_by_count} người</div>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t border-line">
                      <button
                        onClick={() => handleViewCreatorHistory(c.id, c.code)}
                        className="flex-1 py-1 px-2.5 rounded-lg bg-surface2 border border-line text-[11px] text-ink"
                      >
                        <i className="bi bi-clock-history mr-1" /> Người đã dùng
                      </button>
                      <button
                        onClick={() => handleToggleCreator(c.id, c.active)}
                        className="py-1 px-2.5 rounded-lg border border-line text-[11px] text-muted"
                      >
                        {c.active ? 'Tắt' : 'Bật'}
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
                    <th className="text-left px-3.5 py-3">Code</th>
                    <th className="text-left px-3.5 py-3">Chủ sở hữu</th>
                    <th className="text-left px-3.5 py-3">% Thưởng</th>
                    <th className="text-left px-3.5 py-3">Lượt áp dụng</th>
                    <th className="text-left px-3.5 py-3">Trạng thái</th>
                    <th className="text-right px-3.5 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {creators.map((c) => (
                    <tr key={c.id} className="hover:bg-surface2/50 transition">
                      <td className="px-3.5 py-3 font-mono font-bold text-indigo">{c.code}</td>
                      <td className="px-3.5 py-3">{c.owner_username}</td>
                      <td className="px-3.5 py-3 font-mono">{c.bonus_percent}%</td>
                      <td className="px-3.5 py-3 font-mono">{c.used_by_count}</td>
                      <td className="px-3.5 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            c.active
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-surface2 text-muted border-line'
                          }`}
                        >
                          {c.active ? 'Bật' : 'Tắt'}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleViewCreatorHistory(c.id, c.code)}
                          className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-ink hover:border-indigo transition"
                        >
                          <i className="bi bi-clock-history mr-1" /> Lịch sử
                        </button>
                        <button
                          onClick={() => handleToggleCreator(c.id, c.active)}
                          className="px-2.5 py-1 rounded-lg bg-surface2 border border-line text-muted hover:text-ink transition"
                        >
                          {c.active ? 'Tắt' : 'Bật'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeHistoryGf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-clock-history text-amber" /> Lịch sử dùng mã {activeHistoryGf.code}
              </h3>
              <button onClick={() => setActiveHistoryGf(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            {!gfHistoryRows ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : gfHistoryRows.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">Chưa có ai sử dụng mã này.</p>
            ) : (
              <div className="space-y-2">
                {gfHistoryRows.map((r) => (
                  <div key={r.id} className="p-2.5 bg-surface2 border border-line rounded-xl text-xs flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">{r.username}</span>
                      <span className="text-[10px] text-muted">{new Date(r.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <span className="font-mono text-cyan font-bold">+{r.reward_nova} VNC</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeHistoryCr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-people text-indigo" /> Thành viên đã nhập mã {activeHistoryCr.code}
              </h3>
              <button onClick={() => setActiveHistoryCr(null)} className="text-muted hover:text-ink p-1">
                <i className="bi bi-x-lg" />
              </button>
            </div>
            {!crHistoryRows ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : crHistoryRows.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">Chưa có thành viên nào nhập mã này.</p>
            ) : (
              <div className="space-y-2">
                {crHistoryRows.map((r) => (
                  <div key={r.id} className="p-2.5 bg-surface2 border border-line rounded-xl text-xs flex items-center justify-between">
                    <span className="font-semibold">{r.username}</span>
                    <span className="text-[10px] text-muted">{new Date(r.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

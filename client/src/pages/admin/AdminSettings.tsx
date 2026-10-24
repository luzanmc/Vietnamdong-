import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';
import { useSettings } from '../../context/SettingsContext.js';

function isoToDateTimeLocal(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const local = new Date(d.getTime() + 7 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

function dateTimeLocalToIso(val: string): string | null {
  if (!val) return null;
  const d = new Date(`${val}:00+07:00`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export default function AdminSettings() {
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const [maintenanceEtaInput, setMaintenanceEtaInput] = useState('');
  const [savingMaintenance, setSavingMaintenance] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState<boolean | null>(null);

  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
        const isEnabled = data.maintenance_enabled === 'true' || data.maintenance_enabled === '1';
        setMaintenanceEnabled(isEnabled);
        setMaintenanceMsg(data.maintenance_message || '');
        setMaintenanceEtaInput(isoToDateTimeLocal(data.maintenance_eta));
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleToggleClick() {
    setPendingToggleValue(!maintenanceEnabled);
    setShowConfirmModal(true);
  }

  async function handleConfirmToggle() {
    if (pendingToggleValue === null) return;
    const nextVal = pendingToggleValue;
    setShowConfirmModal(false);
    setSavingMaintenance(true);
    setMsg('');

    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'maintenance_enabled', value: nextVal ? 'true' : 'false' }),
      });
      setMaintenanceEnabled(nextVal);
      setMsg(nextVal ? 'Đã bật chế độ bảo trì hệ thống' : 'Đã tắt chế độ bảo trì hệ thống');
      await refreshSettings();
      load();
    } catch {
      setMsg('Lỗi khi cập nhật trạng thái bảo trì');
    } finally {
      setSavingMaintenance(false);
      setPendingToggleValue(null);
    }
  }

  async function handleSaveMaintenanceDetails(e: React.FormEvent) {
    e.preventDefault();
    setSavingMaintenance(true);
    setMsg('');

    try {
      const etaIso = dateTimeLocalToIso(maintenanceEtaInput);
      await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'maintenance_message', value: maintenanceMsg.trim().slice(0, 300) }),
      });
      await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'maintenance_eta', value: etaIso || '' }),
      });
      setMsg('Đã lưu thông báo và giờ dự kiến bảo trì');
      await refreshSettings();
      load();
    } catch {
      setMsg('Lỗi lưu cấu hình bảo trì');
    } finally {
      setSavingMaintenance(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim()) return;
    setMsg('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: key.trim(), value }),
      });
      if (res.ok) {
        setMsg('Đã lưu cấu hình cài đặt');
        setKey('');
        setValue('');
        await refreshSettings();
        load();
      }
    } catch {
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {msg && (
        <div className="p-3 bg-cyan/15 border border-cyan/30 text-cyan text-xs rounded-xl flex items-center gap-2">
          <i className="bi bi-check-circle" /> {msg}
        </div>
      )}

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-line flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2 text-ink">
              <i className="bi bi-cone-striped text-amber text-base" /> Chế độ bảo trì hệ thống
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              Khi bật, người dùng thông thường sẽ nhận trang bảo trì. Tài khoản admin và webhook thẻ vẫn hoạt động bình thường.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`text-xs font-semibold ${maintenanceEnabled ? 'text-amber' : 'text-muted'}`}>
              {maintenanceEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
            </span>
            <button
              type="button"
              onClick={handleToggleClick}
              disabled={savingMaintenance}
              className={`w-12 h-6 rounded-full transition-colors relative focus:outline-none ${
                maintenanceEnabled ? 'bg-amber' : 'bg-surface2 border border-line'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  maintenanceEnabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveMaintenanceDetails} className="space-y-3.5">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] text-muted font-medium">Thông báo tùy chỉnh</label>
              <span className="text-[10px] text-muted font-mono">{maintenanceMsg.length} / 300</span>
            </div>
            <textarea
              rows={3}
              maxLength={300}
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              placeholder="VD: Hệ thống đang tạm dừng bảo trì nâng cấp máy chủ. Dự kiến hoàn tất lúc 14:00."
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
            />
          </div>

          <div>
            <label className="text-[11px] text-muted font-medium block mb-1">
              Giờ dự kiến mở lại (Asia/Ho_Chi_Minh)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={maintenanceEtaInput}
                onChange={(e) => setMaintenanceEtaInput(e.target.value)}
                className="flex-1 bg-surface2 border border-line rounded-xl px-3 py-2 text-xs text-ink focus:outline-none focus:border-indigo"
              />
              {maintenanceEtaInput && (
                <button
                  type="button"
                  onClick={() => setMaintenanceEtaInput('')}
                  className="px-3 py-2 rounded-xl bg-surface2 border border-line text-muted hover:text-rose text-xs font-medium transition"
                  title="Xóa giờ hẹn"
                >
                  <i className="bi bi-x-circle" /> Xóa
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingMaintenance}
              className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              <i className="bi bi-check2" /> Lưu thông báo & giờ hẹn
            </button>
          </div>
        </form>
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <i className="bi bi-sliders text-indigo" /> Cài đặt hệ thống khác (Key-Value)
        </h2>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="text-[11px] text-muted block mb-1">Khóa cấu hình (Key)</label>
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="VD: music_url hoặc min_withdraw_nova"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
              required
            />
          </div>
          <div>
            <label className="text-[11px] text-muted block mb-1">Giá trị (Value)</label>
            <textarea
              rows={2}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Giá trị cấu hình"
              className="w-full bg-surface2 border border-line rounded-xl px-3 py-2 text-xs font-mono focus:outline-none focus:border-indigo"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
          >
            <i className="bi bi-save" /> Lưu cấu hình
          </button>
        </form>

        <div className="space-y-2 pt-2 border-t border-line">
          <h3 className="text-xs font-semibold text-muted uppercase">Danh sách cấu hình hiện tại</h3>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-xl" />)
          ) : Object.keys(settings).length === 0 ? (
            <p className="text-xs text-muted py-2">Chưa có bản ghi cài đặt nào.</p>
          ) : (
            Object.entries(settings).map(([k, v]) => (
              <div
                key={k}
                onClick={() => {
                  setKey(k);
                  setValue(v || '');
                }}
                className="p-2.5 rounded-xl bg-surface2 border border-line text-xs font-mono flex items-center justify-between cursor-pointer hover:border-indigo transition"
              >
                <span className="font-semibold text-ink truncate mr-2">{k}</span>
                <span className="text-muted truncate max-w-[200px] sm:max-w-xs">{v}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-amber">
              <i className="bi bi-exclamation-triangle-fill text-xl" />
              <h3 className="font-semibold text-sm text-ink">Xác nhận chế độ bảo trì</h3>
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {pendingToggleValue
                ? 'Bạn có chắc chắn muốn BẬT chế độ bảo trì? Toàn bộ người dùng thông thường sẽ không thể thực hiện thao tác hay xem các trang ngoại trừ đăng nhập quản trị.'
                : 'Bạn có chắc chắn muốn TẮT chế độ bảo trì và mở lại toàn bộ hệ thống cho người dùng?'}
            </p>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingToggleValue(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-surface2 hover:bg-surface2/80 text-muted hover:text-ink text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                className={`px-4 py-2 rounded-xl text-white text-xs font-semibold transition shadow-md ${
                  pendingToggleValue ? 'bg-amber hover:brightness-110' : 'bg-indigo hover:brightness-110'
                }`}
              >
                Xác nhận {pendingToggleValue ? 'Bật bảo trì' : 'Mở lại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

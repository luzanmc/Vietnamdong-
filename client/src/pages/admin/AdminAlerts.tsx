import React, { useEffect, useState } from 'react';
import { Skeleton } from '../../components/Skeleton.js';
import type { AlertLog } from '../../types.js';

export default function AdminAlerts() {
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [withdrawThreshold, setWithdrawThreshold] = useState('500000');
  const [withdrawEnabled, setWithdrawEnabled] = useState(true);
  const [multiAccountThreshold, setMultiAccountThreshold] = useState('3');
  const [multiAccountEnabled, setMultiAccountEnabled] = useState(true);
  const [brokenTaskThreshold, setBrokenTaskThreshold] = useState('5');
  const [brokenTaskEnabled, setBrokenTaskEnabled] = useState(true);
  const [autoHideBrokenTasks, setAutoHideBrokenTasks] = useState(false);

  const [logs, setLogs] = useState<AlertLog[]>([]);

  async function loadSettings() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) {
        setWithdrawThreshold(data.alert_withdraw_threshold || '500000');
        setWithdrawEnabled(data.alert_withdraw_enabled !== 'false' && data.alert_withdraw_enabled !== '0');
        setMultiAccountThreshold(data.alert_multi_account_threshold || '3');
        setMultiAccountEnabled(data.alert_multi_account_enabled !== 'false' && data.alert_multi_account_enabled !== '0');
        setBrokenTaskThreshold(data.alert_broken_task_threshold || '5');
        setBrokenTaskEnabled(data.alert_broken_task_enabled !== 'false' && data.alert_broken_task_enabled !== '0');
        setAutoHideBrokenTasks(data.auto_hide_broken_tasks === 'true' || data.auto_hide_broken_tasks === '1');
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/admin/alerts/log', { credentials: 'include' });
      const data = await res.json();
      if (res.ok) setLogs(data);
    } catch {
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const updates = [
      { key: 'alert_withdraw_threshold', value: withdrawThreshold },
      { key: 'alert_withdraw_enabled', value: withdrawEnabled ? 'true' : 'false' },
      { key: 'alert_multi_account_threshold', value: multiAccountThreshold },
      { key: 'alert_multi_account_enabled', value: multiAccountEnabled ? 'true' : 'false' },
      { key: 'alert_broken_task_threshold', value: brokenTaskThreshold },
      { key: 'alert_broken_task_enabled', value: brokenTaskEnabled ? 'true' : 'false' },
      { key: 'auto_hide_broken_tasks', value: autoHideBrokenTasks ? 'true' : 'false' },
    ];

    try {
      for (const item of updates) {
        await fetch('/api/admin/settings', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      }
      setMessage({ type: 'success', text: 'Đã lưu cấu hình ngưỡng cảnh báo thành công' });
    } catch {
      setMessage({ type: 'error', text: 'Lỗi lưu cấu hình cảnh báo' });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestWebhook() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/alerts/test', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage({ type: 'success', text: data.message || 'Gửi thử webhook thành công' });
        loadLogs();
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'Gửi thử thất bại. Vui lòng kiểm tra DISCORD_ALERT_WEBHOOK_URL',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi gửi thử webhook' });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-cyan/15 border border-cyan/30 text-cyan'
              : 'bg-rose/15 border border-rose/30 text-rose'
          }`}
        >
          <i className={`bi ${message.type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'}`} />
          <span>{message.text}</span>
        </div>
      )}

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <i className="bi bi-bell-fill text-indigo" /> Cấu hình cảnh báo bất thường qua Discord Webhook
            </h2>
            <p className="text-[11px] text-muted mt-0.5">
              Cảnh báo được gửi tới webhook DISCORD_ALERT_WEBHOOK_URL với tần suất tối đa 1 lần / 10 phút mỗi khóa cảnh báo.
            </p>
          </div>

          <button
            type="button"
            onClick={handleTestWebhook}
            disabled={testing}
            className="px-3.5 py-1.5 rounded-xl bg-surface2 border border-line text-xs font-semibold hover:border-indigo text-ink flex items-center gap-1.5 transition disabled:opacity-50 shadow-sm"
          >
            {testing ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-send" />}
            <span>Gửi thử webhook</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-14 w-full rounded-xl" />
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-surface2/60 border border-line space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink flex items-center gap-2">
                  <i className="bi bi-cash-coin text-amber" /> Cảnh báo rút tiền lớn
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={withdrawEnabled}
                    onChange={(e) => setWithdrawEnabled(e.target.checked)}
                    className="accent-indigo w-4 h-4"
                  />
                  <span className="text-xs text-muted font-medium">Bật cảnh báo</span>
                </label>
              </div>
              <p className="text-[11px] text-muted">
                Tự động gửi cảnh báo khi có yêu cầu rút tiền vượt ngưỡng cấu hình (chỉ hiển thị 4 số cuối tài khoản).
              </p>
              <div>
                <label className="text-[11px] text-muted block mb-1">Ngưỡng số tiền rút (VND)</label>
                <input
                  type="number"
                  min="10000"
                  step="10000"
                  value={withdrawThreshold}
                  onChange={(e) => setWithdrawThreshold(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface2/60 border border-line space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink flex items-center gap-2">
                  <i className="bi bi-people-fill text-cyan" /> Cảnh báo nhiều tài khoản mới từ cùng IP
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={multiAccountEnabled}
                    onChange={(e) => setMultiAccountEnabled(e.target.checked)}
                    className="accent-indigo w-4 h-4"
                  />
                  <span className="text-xs text-muted font-medium">Bật cảnh báo</span>
                </label>
              </div>
              <p className="text-[11px] text-muted">
                Địa chỉ IP được băm SHA-256 kèm muối để bảo mật tuyệt đối. Gắn cờ tài khoản vào danh sách bảo mật khi vượt ngưỡng.
              </p>
              <div>
                <label className="text-[11px] text-muted block mb-1">
                  Số tài khoản tạo trong 24 giờ cùng địa chỉ (Ngưỡng kích hoạt)
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={multiAccountThreshold}
                  onChange={(e) => setMultiAccountThreshold(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-surface2/60 border border-line space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-ink flex items-center gap-2">
                  <i className="bi bi-flag-fill text-rose" /> Cảnh báo link bị báo lỗi hàng loạt
                </span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brokenTaskEnabled}
                    onChange={(e) => setBrokenTaskEnabled(e.target.checked)}
                    className="accent-indigo w-4 h-4"
                  />
                  <span className="text-xs text-muted font-medium">Bật cảnh báo</span>
                </label>
              </div>
              <p className="text-[11px] text-muted">
                Kích hoạt khi một link nhận báo cáo từ nhiều người dùng khác nhau trong vòng 1 giờ.
              </p>
              <div>
                <label className="text-[11px] text-muted block mb-1">
                  Số người báo lỗi link trong 1 giờ (Ngưỡng kích hoạt)
                </label>
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={brokenTaskThreshold}
                  onChange={(e) => setBrokenTaskThreshold(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-indigo"
                  required
                />
              </div>

              <div className="pt-1 border-t border-line/60">
                <label className="flex items-center gap-2 cursor-pointer py-1">
                  <input
                    type="checkbox"
                    checked={autoHideBrokenTasks}
                    onChange={(e) => setAutoHideBrokenTasks(e.target.checked)}
                    className="accent-indigo w-4 h-4"
                  />
                  <span className="text-xs font-medium text-ink">
                    Tự động tạm ẩn link khi bị báo lỗi vượt ngưỡng
                  </span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo hover:brightness-110 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              {saving ? <i className="bi bi-arrow-repeat animate-spin" /> : <i className="bi bi-check2" />}
              <span>Lưu cấu hình ngưỡng cảnh báo</span>
            </button>
          </form>
        )}
      </div>

      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <i className="bi bi-clock-history text-muted" /> Nhật ký 50 cảnh báo gần nhất
          </h2>
          <button
            type="button"
            onClick={loadLogs}
            className="text-xs text-muted hover:text-ink flex items-center gap-1 transition"
          >
            <i className="bi bi-arrow-clockwise" /> Làm mới
          </button>
        </div>

        {logsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-muted py-4 text-center">Chưa có bản ghi cảnh báo nào.</p>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => {
              const details = Array.isArray(log.details) ? log.details : [];
              return (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-surface2 border border-line space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                      {log.title}
                    </span>
                    <span className="text-[10px] text-muted">
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>

                  <div className="text-[11px] text-muted flex items-center gap-2 flex-wrap">
                    <span className="font-mono bg-surface px-1.5 py-0.5 rounded border border-line text-[10px]">
                      {log.type}
                    </span>
                  </div>

                  {details.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1.5 border-t border-line/50 text-[11px]">
                      {details.map((field, idx) => (
                        <div key={idx} className="bg-surface/60 rounded-lg p-2 border border-line/40">
                          <span className="text-muted block text-[10px]">{field.name}</span>
                          <span className="text-ink font-medium break-all">{field.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

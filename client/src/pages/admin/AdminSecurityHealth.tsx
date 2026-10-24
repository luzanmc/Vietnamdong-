import { useEffect, useState } from 'react';
import { useToast } from '../../context/ToastContext.js';

interface HourlyMetric {
  hour: string;
  count: number;
}

interface SecurityHealthData {
  failed_logins_24h: HourlyMetric[];
  locked_users_count: number;
  deletion_requested_count: number;
  flagged_withdrawals_count: number;
  multi_account_device_groups_count: number;
  abnormal_country_logins_count: number;
  locked_giftcodes_count: number;
  updated_at: string;
}

interface VerifyResult {
  valid: boolean;
  total: number;
  errors: string[];
}

export default function AdminSecurityHealth() {
  const [data, setData] = useState<SecurityHealthData | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [testingAlert, setTestingAlert] = useState(false);

  const { success, error: toastError } = useToast();

  async function loadHealth() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/security-health', { credentials: 'include' });
      if (!res.ok) throw new Error('Không thể tải dữ liệu sức khỏe bảo mật');
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      toastError(e.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHealth();
  }, []);

  async function handleVerifyAudit() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch('/api/admin/security-health/verify-audit', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Không thể kiểm tra chuỗi Audit');
      const result: VerifyResult = await res.json();
      setVerifyResult(result);
      if (result.valid) {
        success(`Chuỗi nhật ký toàn vẹn! Đã xác thực ${result.total} bản ghi liên tiếp.`);
      } else {
        toastError(`Phát hiện đứt gãy hoặc sai lệch tại ${result.errors.length} điểm trong chuỗi!`);
      }
    } catch (e: any) {
      toastError(e.message || 'Lỗi kiểm tra chuỗi nhật ký');
    } finally {
      setVerifying(false);
    }
  }

  async function handleTestAlert() {
    setTestingAlert(true);
    try {
      const res = await fetch('/api/admin/security-health/test-alert', {
        method: 'POST',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Gửi cảnh báo thử nghiệm thất bại');
      success(json.message || 'Đã gửi cảnh báo thử nghiệm tới Discord');
    } catch (e: any) {
      toastError(e.message || 'Lỗi gửi cảnh báo thử nghiệm');
    } finally {
      setTestingAlert(false);
    }
  }

  const maxFailedCount = Math.max(1, ...(data?.failed_logins_24h.map((h) => h.count) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <i className="bi bi-heart-pulse text-rose" />
            <span>Sức Khỏe Bảo Mật & Giám Sát Rủi Ro</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Tổng quan an ninh hệ thống, phát hiện gian lận và tính toàn vẹn dữ liệu
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleTestAlert}
            disabled={testingAlert}
            className="px-3 py-1.5 bg-surface2 border border-line hover:border-muted rounded-xl text-xs font-semibold text-muted hover:text-ink transition flex items-center gap-1.5"
          >
            <i className={`bi bi-discord ${testingAlert ? 'animate-spin' : ''}`} />
            <span>Gửi thử cảnh báo</span>
          </button>

          <button
            onClick={handleVerifyAudit}
            disabled={verifying}
            className="px-3.5 py-1.5 bg-indigo text-white rounded-xl text-xs font-semibold hover:brightness-110 transition flex items-center gap-1.5 shadow-sm"
          >
            <i className={`bi bi-shield-check ${verifying ? 'animate-spin' : ''}`} />
            <span>Kiểm tra chuỗi nhật ký</span>
          </button>

          <button
            onClick={loadHealth}
            disabled={loading}
            className="p-2 rounded-xl bg-surface2 border border-line text-muted hover:text-ink text-xs transition"
            title="Làm mới"
          >
            <i className={`bi bi-arrow-clockwise ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {verifyResult && (
        <div
          className={`p-4 rounded-2xl border transition animate-fade-in ${
            verifyResult.valid
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose/10 border-rose/30 text-rose'
          }`}
        >
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-current/20">
            <div className="font-semibold text-xs flex items-center gap-2">
              <i className={`bi ${verifyResult.valid ? 'bi-patch-check-fill' : 'bi-shield-slash-fill'}`} />
              <span>
                {verifyResult.valid
                  ? 'Chuỗi Audit Trail toàn vẹn & an toàn'
                  : 'Cảnh báo: Chuỗi nhật ký có dấu hiệu sai lệch!'}
              </span>
            </div>
            <button
              onClick={() => setVerifyResult(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              <i className="bi bi-x-lg" />
            </button>
          </div>
          <div className="text-xs mt-2 space-y-1">
            <div>
              Tổng số bản ghi kiểm tra liên kết hash mật mã: <strong>{verifyResult.total}</strong>
            </div>
            {verifyResult.errors.length > 0 && (
              <div className="mt-2 text-rose-200 bg-rose/20 p-2 rounded-xl font-mono text-[11px] space-y-0.5">
                {verifyResult.errors.map((err, i) => (
                  <div key={i}>{err}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5">
        <div className="glass-card rounded-2xl p-4 border border-line space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Tài khoản đang bị khóa</span>
            <i className="bi bi-lock-fill text-rose" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            {data ? data.locked_users_count.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="text-[11px] text-muted">Bị vô hiệu hóa đăng nhập</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Đang chờ xóa (7 ngày)</span>
            <i className="bi bi-person-x-fill text-amber" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            {data ? data.deletion_requested_count.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="text-[11px] text-muted">Có thể tự hủy khi đăng nhập</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Lệnh rút cần xem kỹ</span>
            <i className="bi bi-cash-stack text-amber" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            {data ? data.flagged_withdrawals_count.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="text-[11px] text-muted">Điểm rủi ro cao hoặc vượt ngưỡng</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Cụm thiết bị đa tài khoản</span>
            <i className="bi bi-diagram-3-fill text-cyan" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            {data ? data.multi_account_device_groups_count.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="text-[11px] text-muted">Từ 2 tài khoản chung thiết bị</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Đăng nhập quốc gia lạ</span>
            <i className="bi bi-globe2 text-indigo" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            {data ? data.abnormal_country_logins_count.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="text-[11px] text-muted">Ghi nhận trong 7 ngày qua</div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-line space-y-1">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Bị khóa dò Giftcode</span>
            <i className="bi bi-shield-slash-fill text-rose" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-ink">
            {data ? data.locked_giftcodes_count.toLocaleString('vi-VN') : '—'}
          </div>
          <div className="text-[11px] text-muted">Sai quá 5 lần liên tiếp (15p)</div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4 sm:p-5 border border-line space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-ink flex items-center gap-2">
              <i className="bi bi-bar-chart-line-fill text-indigo" />
              <span>Số Lần Đăng Nhập Thất Bại Theo Giờ (24 giờ gần nhất)</span>
            </h3>
            <p className="text-[11px] text-muted mt-0.5">
              Phát hiện đột biến tấn công dò mật khẩu hoặc brute-force tự động
            </p>
          </div>

          {data?.updated_at && (
            <span className="text-[10px] text-muted font-mono bg-surface2 px-2 py-0.5 rounded border border-line">
              Cập nhật: {new Date(data.updated_at).toLocaleTimeString('vi-VN')}
            </span>
          )}
        </div>

        {data?.failed_logins_24h && data.failed_logins_24h.length > 0 ? (
          <div className="space-y-3 pt-2">
            <div className="h-44 flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-line px-1">
              {data.failed_logins_24h.map((item, idx) => {
                const heightPercent = Math.max(8, Math.round((item.count / maxFailedCount) * 100));
                const isSpike = item.count >= 10;
                const hourDisplay = item.hour.split(' ')[1] || item.hour;
                return (
                  <div
                    key={idx}
                    className="flex-1 h-full flex flex-col justify-end items-center group relative cursor-default"
                  >
                    <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-surface border border-line text-[10px] font-mono px-1.5 py-0.5 rounded shadow-lg z-10 whitespace-nowrap text-ink">
                      {item.hour}: {item.count} lần
                    </div>
                    <div
                      style={{ height: `${heightPercent}%` }}
                      className={`w-full rounded-t-sm transition-all ${
                        isSpike
                          ? 'bg-rose hover:brightness-110'
                          : item.count > 0
                          ? 'bg-indigo hover:brightness-110'
                          : 'bg-surface2'
                      }`}
                    />
                    <div className="text-[9px] text-muted font-mono mt-1 hidden sm:block truncate w-full text-center">
                      {hourDisplay.slice(0, 2)}h
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted pt-1">
              <span>24 giờ trước</span>
              <span>Hiện tại</span>
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-muted text-xs">
            <i className="bi bi-shield-check text-2xl mb-1 inline-block text-emerald-400" />
            <div>Không có lượt đăng nhập thất bại nào trong 24 giờ qua.</div>
          </div>
        )}
      </div>
    </div>
  );
}

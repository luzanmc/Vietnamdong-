import { useState } from 'react';

export default function AdminReports() {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  async function handleDownload(type: 'tasks' | 'coins' | 'withdrawals') {
    setDownloadingType(type);
    try {
      const res = await fetch(`/api/admin/reports/${type}?month=${selectedMonth}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Lỗi khi xuất báo cáo');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-${type}-${selectedMonth}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Không thể tải file báo cáo lúc này');
    } finally {
      setDownloadingType(null);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold flex items-center gap-2">
            <i className="bi bi-file-earmark-spreadsheet-fill text-indigo" /> Xuất báo cáo dữ liệu định dạng CSV theo tháng
          </h2>
          <p className="text-[11px] text-muted mt-0.5">
            File được mã hóa UTF-8 kèm ký hiệu BOM để mở bằng Microsoft Excel tiếng Việt chính xác, tự động chống tấn công CSV injection và giới hạn tối đa 100.000 dòng.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-surface2/60 border border-line space-y-2 max-w-sm">
          <label className="text-[11px] text-muted font-medium block">
            Chọn tháng và năm xuất báo cáo
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-surface border border-line rounded-xl px-3 py-2 text-xs font-mono text-ink focus:outline-none focus:border-indigo"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-surface2 border border-line flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-indigo/15 text-indigo flex items-center justify-center">
                <i className="bi bi-graph-up text-lg" />
              </div>
              <h3 className="font-semibold text-xs text-ink">Báo cáo doanh thu link</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Thống kê số lượt hoàn thành, doanh thu quy đổi theo từng link và nhà cung cấp rút gọn theo từng ngày.
              </p>
            </div>
            <button
              type="button"
              disabled={downloadingType === 'tasks'}
              onClick={() => handleDownload('tasks')}
              className="w-full py-2 px-3 rounded-xl bg-indigo hover:brightness-110 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {downloadingType === 'tasks' ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" />
                  <span>Đang xuất CSV...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-download" />
                  <span>Tải CSV doanh thu</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-surface2 border border-line flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-amber/15 text-amber flex items-center justify-center">
                <i className="bi bi-coin text-lg" />
              </div>
              <h3 className="font-semibold text-xs text-ink">Báo cáo VNC phát ra</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Tổng hợp lượng VNC đã chi trả và số giao dịch phân loại theo từng lý do trong sổ cái coin_ledger theo từng ngày.
              </p>
            </div>
            <button
              type="button"
              disabled={downloadingType === 'coins'}
              onClick={() => handleDownload('coins')}
              className="w-full py-2 px-3 rounded-xl bg-amber hover:brightness-110 text-black text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {downloadingType === 'coins' ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" />
                  <span>Đang xuất CSV...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-download" />
                  <span>Tải CSV VNC phát ra</span>
                </>
              )}
            </button>
          </div>

          <div className="p-4 rounded-xl bg-surface2 border border-line flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="w-9 h-9 rounded-xl bg-cyan/15 text-cyan flex items-center justify-center">
                <i className="bi bi-cash-coin text-lg" />
              </div>
              <h3 className="font-semibold text-xs text-ink">Danh sách yêu cầu rút tiền</h3>
              <p className="text-[11px] text-muted leading-relaxed">
                Chi tiết các đơn rút: ID, người dùng, VNC, VND, phương thức, trạng thái, thời gian tạo, duyệt, và 4 số cuối tài khoản.
              </p>
            </div>
            <button
              type="button"
              disabled={downloadingType === 'withdrawals'}
              onClick={() => handleDownload('withdrawals')}
              className="w-full py-2 px-3 rounded-xl bg-cyan hover:brightness-110 text-black text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {downloadingType === 'withdrawals' ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" />
                  <span>Đang xuất CSV...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-download" />
                  <span>Tải CSV rút tiền</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

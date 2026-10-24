import { useState } from 'react';
import type { Task } from '../types.js';
import CurrencyIcon from './CurrencyIcon.js';
import { useSettings, formatVnd } from '../context/SettingsContext.js';
import { playClickSound } from '../utils/sound.js';
import { api } from '../api/client.js';

interface TaskCardProps {
  task: Task;
  onStart: (taskId: string) => void;
  busy: boolean;
}

const REPORT_REASONS = [
  'Link không mở được / Link die',
  'Không tìm thấy mã xác nhận',
  'Quá nhiều quảng cáo độc hại hoặc pop-up',
  'Trang đích yêu cầu tải phần mềm khả nghi',
  'Khác',
];

export default function TaskCard({ task, onStart, busy }: TaskCardProps) {
  const { novaToVndRate } = useSettings();
  const pct = Math.min(100, Math.round((task.done_today / task.daily_limit) * 100));
  const atLimit = task.done_today >= task.daily_limit;

  const [showReport, setShowReport] = useState(false);
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [customDetail, setCustomDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reportResult, setReportResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function handleClick() {
    playClickSound();
    onStart(task.id);
  }

  async function handleSendReport() {
    setSubmitting(true);
    setReportResult(null);
    try {
      const fullReason = reason === 'Khác' && customDetail.trim() ? customDetail.trim() : reason;
      await api.reportTask(task.id, fullReason);
      setReportResult({ ok: true, msg: 'Đã gửi báo cáo lỗi thành công' });
      setTimeout(() => {
        setShowReport(false);
        setReportResult(null);
      }, 1500);
    } catch (err: any) {
      setReportResult({ ok: false, msg: err.message || 'Không thể gửi báo cáo lúc này' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between group">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo/15 border border-indigo/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <i className="bi bi-link-45deg text-indigo text-lg" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <span className="truncate">{task.name}</span>
                  {!!task.is_hot && (
                    <span className="text-[9px] font-bold bg-gradient-to-r from-rose to-amber text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 animate-pulse-soft shadow-sm flex items-center gap-1">
                      <span>HOT</span>
                      <i className="bi bi-fire" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted truncate mt-0.5">
                  Vượt link rút gọn để nhận thưởng VNC ngay
                </div>
              </div>
            </div>

            <div className="font-mono text-amber font-bold text-right shrink-0">
              <div className="flex items-center gap-1.5 text-base sm:text-lg">
                <CurrencyIcon size={18} />
                <span>+{task.reward_nova}</span>
                <span className="text-xs text-amber/80 font-normal">VNC</span>
              </div>
              {novaToVndRate > 0 && (
                <div className="text-[10px] text-muted font-body font-normal">
                  ~{formatVnd(task.reward_nova, novaToVndRate)}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
              <span>Tiến độ hoàn thành hôm nay</span>
              <span className="font-mono font-medium text-ink">
                {task.done_today} / {task.daily_limit} lượt ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface2 border border-line/50 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-indigo via-cyan to-indigo transition-all duration-500 rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between gap-2.5">
          <span className="text-[11px] text-muted min-w-0 truncate">
            {atLimit ? (
              <span className="text-amber flex items-center gap-1">
                <i className="bi bi-check2-circle text-xs shrink-0" /> <span className="truncate">Đã hoàn thành hôm nay</span>
              </span>
            ) : (
              <span className="truncate">Còn {task.daily_limit - task.done_today} lượt khả dụng</span>
            )}
          </span>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowReport(true)}
              title="Báo link lỗi"
              className="w-8 h-8 rounded-xl bg-surface2/80 hover:bg-rose/15 text-muted hover:text-rose border border-line flex items-center justify-center transition"
            >
              <i className="bi bi-flag text-xs" />
            </button>

            <button
              onClick={handleClick}
              disabled={busy || atLimit}
              className={`flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-all btn-press shadow-md ${
                atLimit
                  ? 'bg-surface2 text-muted border border-line cursor-not-allowed opacity-60'
                  : 'bg-gradient-to-r from-indigo to-indigo/90 hover:from-indigo hover:to-cyan text-white hover:shadow-[0_0_20px_rgba(108,99,245,0.4)]'
              }`}
            >
              {busy ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin text-sm" />
                  <span>Đang mở...</span>
                </>
              ) : atLimit ? (
                <>
                  <i className="bi bi-lock-fill text-xs" />
                  <span>Hết lượt</span>
                </>
              ) : (
                <>
                  <i className="bi bi-play-fill text-base" />
                  <span>Làm ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-line rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <i className="bi bi-flag-fill text-rose" /> Báo cáo link lỗi
              </h3>
              <button
                onClick={() => setShowReport(false)}
                className="w-7 h-7 rounded-lg text-muted hover:text-ink hover:bg-surface2 flex items-center justify-center transition"
              >
                <i className="bi bi-x-lg text-xs" />
              </button>
            </div>

            <div>
              <p className="text-xs text-muted mb-2">
                Nhiệm vụ: <span className="font-semibold text-ink">{task.name}</span>
              </p>
              <label className="text-[11px] text-muted block mb-1.5">Chọn lý do báo cáo</label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2 text-xs p-2.5 rounded-xl border cursor-pointer transition ${
                      reason === r
                        ? 'bg-indigo/15 border-indigo text-ink font-medium'
                        : 'bg-surface2 border-line text-muted hover:text-ink'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-indigo"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              {reason === 'Khác' && (
                <textarea
                  rows={2}
                  value={customDetail}
                  onChange={(e) => setCustomDetail(e.target.value)}
                  placeholder="Mô tả chi tiết lỗi gặp phải..."
                  className="w-full mt-2 bg-surface2 border border-line rounded-xl p-2.5 text-xs text-ink focus:outline-none focus:border-indigo"
                  maxLength={200}
                />
              )}
            </div>

            {reportResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  reportResult.ok
                    ? 'bg-cyan/15 border border-cyan/30 text-cyan'
                    : 'bg-rose/15 border border-rose/30 text-rose'
                }`}
              >
                <i className={`bi ${reportResult.ok ? 'bi-check-circle' : 'bi-exclamation-circle'}`} />
                <span>{reportResult.msg}</span>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="flex-1 py-2 rounded-xl bg-surface2 hover:bg-surface2/80 text-muted hover:text-ink text-xs font-semibold transition"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSendReport}
                className="flex-1 py-2 rounded-xl bg-rose hover:brightness-110 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md"
              >
                {submitting ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-xs" />
                    <span>Đang gửi...</span>
                  </>
                ) : (
                  <>
                    <i className="bi bi-send" />
                    <span>Gửi báo cáo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import { useState } from 'react';
import type { Task } from '../types.js';
import CurrencyIcon from './CurrencyIcon.js';
import { useSettings, formatVnd } from '../context/SettingsContext.js';
import { playClickSound } from '../utils/sound.js';
import { api } from '../api/client.js';
import {
  IconLink,
  IconFlame,
  IconFlag,
  IconLock,
  IconPlayerPlay,
  IconLoader2,
  IconCircleCheck,
  IconX,
} from '@tabler/icons-react';

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
      <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between group border border-white/10 shadow-lg">
        <div>
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                <IconLink size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm sm:text-base flex items-center gap-2">
                  <span className="truncate text-white">{task.name}</span>
                  {!!task.is_hot && (
                    <span className="text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1">
                      <span>HOT</span>
                      <IconFlame size={12} />
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400 truncate mt-0.5">
                  Vượt link rút gọn để nhận thưởng VNC ngay
                </div>
              </div>
            </div>

            {/* Reward badge */}
            <div className="font-mono text-sky-400 font-bold text-right shrink-0">
              <div className="flex items-center gap-1.5 text-base sm:text-lg">
                <CurrencyIcon size={18} />
                <span>+{task.reward_nova}</span>
                <span className="text-xs text-sky-400/80 font-normal">VNC</span>
              </div>
              {novaToVndRate > 0 && (
                <div className="text-[10px] text-zinc-400 font-body font-normal">
                  ~{formatVnd(task.reward_nova, novaToVndRate)}
                </div>
              )}
            </div>
          </div>

          {/* Progress Tracker */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
              <span>Tiến độ hoàn thành</span>
              <span className="font-mono font-medium text-white">
                {task.done_today} / {task.daily_limit} lượt ({pct}%)
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] border border-white/10 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-400 transition-all duration-300 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.4)]"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action row */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2.5">
          <span className="text-xs text-zinc-400 min-w-0 truncate">
            {atLimit ? (
              <span className="text-sky-400 flex items-center gap-1 font-medium">
                <IconCircleCheck size={14} className="shrink-0" />
                <span className="truncate">Đã hoàn thành hôm nay</span>
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
              className="w-8 h-8 rounded-xl glass-pill hover:border-rose-500/50 text-zinc-400 hover:text-rose-400 flex items-center justify-center transition btn-press"
            >
              <IconFlag size={15} />
            </button>

            <button
              onClick={handleClick}
              disabled={busy || atLimit}
              className={`flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all btn-press shrink-0 ${
                atLimit
                  ? 'glass-pill text-zinc-500 cursor-not-allowed opacity-60'
                  : 'bg-sky-500 hover:bg-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)]'
              }`}
            >
              {busy ? (
                <>
                  <IconLoader2 size={15} className="animate-spin" />
                  <span>Đang mở...</span>
                </>
              ) : atLimit ? (
                <>
                  <IconLock size={14} />
                  <span>Hết lượt</span>
                </>
              ) : (
                <>
                  <IconPlayerPlay size={14} />
                  <span>Làm ngay</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-panel border border-white/10 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
                <IconFlag size={16} className="text-sky-400" /> Báo cáo link lỗi
              </h3>
              <button
                onClick={() => setShowReport(false)}
                className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] flex items-center justify-center transition"
              >
                <IconX size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs text-zinc-400 mb-2">
                Nhiệm vụ: <span className="font-semibold text-white">{task.name}</span>
              </p>
              <label className="text-[11px] text-zinc-400 block mb-1.5 font-medium">Chọn lý do báo cáo</label>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className={`flex items-center gap-2 text-xs p-2.5 rounded-xl border cursor-pointer transition ${
                      reason === r
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 font-medium'
                        : 'glass-pill border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-sky-500"
                    />
                    <span>{r}</span>
                  </label>
                ))}
              </div>

              {reason === 'Khác' && (
                <div className="mt-2.5">
                  <textarea
                    rows={2}
                    value={customDetail}
                    onChange={(e) => setCustomDetail(e.target.value)}
                    placeholder="Mô tả chi tiết lỗi gặp phải..."
                    className="w-full text-xs p-2.5 rounded-xl bg-surface2 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition"
                  />
                </div>
              )}
            </div>

            {reportResult && (
              <div
                className={`text-xs p-2.5 rounded-xl border ${
                  reportResult.ok
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {reportResult.msg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowReport(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSendReport}
                disabled={submitting}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-white transition disabled:opacity-50"
              >
                {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import type { Task } from '../types.js';
import CurrencyIcon from './CurrencyIcon.js';
import { useSettings, formatVnd } from '../context/SettingsContext.js';
import { playClickSound } from '../utils/sound.js';

interface TaskCardProps {
  task: Task;
  onStart: (taskId: string) => void;
  busy: boolean;
}

export default function TaskCard({ task, onStart, busy }: TaskCardProps) {
  const { novaToVndRate } = useSettings();
  const pct = Math.min(100, Math.round((task.done_today / task.daily_limit) * 100));
  const atLimit = task.done_today >= task.daily_limit;

  function handleClick() {
    playClickSound();
    onStart(task.id);
  }

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between group">
      <div>
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo/15 border border-indigo/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <i className="bi bi-link-45deg text-indigo text-lg" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm sm:text-base flex items-center gap-2">
                <span className="truncate">{task.name}</span>
                {!!task.is_hot && (
                  <span className="text-[9px] font-bold bg-gradient-to-r from-rose to-amber text-white px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 animate-pulse-soft shadow-sm">
                    HOT 🔥
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted truncate mt-0.5">
                Vượt link rút gọn để nhận thưởng VNC ngay
              </div>
            </div>
          </div>

          {/* Reward badge */}
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

        {/* Progress Tracker */}
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

      {/* Action button */}
      <div className="mt-4 pt-3 border-t border-line/40 flex items-center justify-between">
        <span className="text-[11px] text-muted">
          {atLimit ? (
            <span className="text-amber flex items-center gap-1">
              <i className="bi bi-check2-circle text-xs" /> Đã hoàn thành hôm nay
            </span>
          ) : (
            <span>Còn {task.daily_limit - task.done_today} lượt khả dụng</span>
          )}
        </span>

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
  );
}

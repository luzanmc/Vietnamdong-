import type { Task } from '../types.js';

const COLORS = { indigo: '#6C63F5', cyan: '#22D3EE', amber: '#F5A524', rose: '#FB6A8A' };

interface TaskCardProps {
  task: Task;
  onStart: (taskId: string) => void;
  busy: boolean;
}

export default function TaskCard({ task, onStart, busy }: TaskCardProps) {
  const pct = Math.min(100, (task.done_today / task.daily_limit) * 100);
  const atLimit = task.done_today >= task.daily_limit;

  return (
    <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${COLORS.indigo}22` }}>
            <i className="bi bi-link-45deg" style={{ color: COLORS.indigo }} />
          </div>
          <div>
            <div className="font-medium text-sm flex items-center gap-1.5">
              {task.name}
              {!!task.is_hot && <span className="text-[9px] bg-rose text-white px-1.5 py-0.5 rounded-full">HOT</span>}
            </div>
            <div className="text-[11px] text-muted">Vượt link để nhận thưởng ngay</div>
          </div>
        </div>
        <div className="font-mono text-sm text-amber">+{task.reward_nova}</div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 rounded-full bg-surface2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-indigo to-cyan" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] font-mono text-muted">{task.done_today}/{task.daily_limit} lượt</span>
          <button
            onClick={() => onStart(task.id)}
            disabled={busy || atLimit}
            className="bg-indigo hover:shadow-[0_0_24px_0_rgba(108,99,245,.45)] disabled:opacity-40 disabled:hover:shadow-none text-white text-xs font-medium px-3 py-1.5 rounded-lg transition"
          >
            <i className="bi bi-play-fill mr-1" />
            {atLimit ? 'Đã hết lượt' : 'Làm ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}

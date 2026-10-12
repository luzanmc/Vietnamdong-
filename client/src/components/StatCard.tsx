import CurrencyIcon from './CurrencyIcon.js';
import AnimatedNumber from './AnimatedNumber.js';

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: string;
  iconColor?: string;
  hint?: string;
  trend?: string;
}

export default function StatCard({
  label,
  value,
  suffix,
  icon,
  iconColor = 'text-amber',
  hint,
  trend,
}: StatCardProps) {
  return (
    <div className="glass-card rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group">
      {/* Ambient background glow circle */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo/5 group-hover:bg-indigo/15 blur-xl transition -z-10 pointer-events-none" />

      <div className="flex items-center justify-between text-xs text-muted mb-2 relative z-10 gap-2">
        <span className="font-semibold tracking-wide uppercase text-[10px] sm:text-[11px] truncate">
          {label}
        </span>
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center bg-surface2/80 border border-line/60 shadow-sm transition-transform group-hover:scale-110 shrink-0"
        >
          <i className={`bi ${icon} ${iconColor} text-xs sm:text-sm`} />
        </div>
      </div>

      <div className="font-mono font-mono-nums text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-baseline gap-1.5 relative z-10 min-w-0 flex-wrap">
        {suffix === 'VNC' && (
          <span className="self-center shrink-0">
            <CurrencyIcon size={20} />
          </span>
        )}
        <span className="text-ink truncate">
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </span>
        {suffix && suffix !== 'VNC' && (
          <span className="text-xs sm:text-sm text-muted font-body font-medium shrink-0">
            {suffix}
          </span>
        )}
      </div>

      {(hint || trend) && (
        <div className="flex items-center justify-between text-[11px] text-muted mt-2 pt-2 border-t border-line/40 relative z-10 gap-1.5">
          {hint && <span className="truncate text-[10px] sm:text-[11px]">{hint}</span>}
          {trend && (
            <span className="text-cyan font-mono font-semibold ml-auto shrink-0 bg-cyan/10 px-1.5 py-0.5 rounded text-[10px]">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

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
    <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between group">
      <div>
        <div className="flex items-center justify-between text-xs text-muted mb-2.5 gap-2">
          <span className="font-semibold tracking-wider uppercase text-[11px] text-muted/80 truncate">
            {label}
          </span>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-surface2/70 border border-line/60 shadow-sm transition-transform group-hover:scale-105 shrink-0">
            <i className={`bi ${icon} ${iconColor} text-sm`} />
          </div>
        </div>

        <div className="font-mono font-mono-nums text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-1.5 text-ink min-w-0">
          {suffix === 'VNC' && (
            <span className="shrink-0 flex items-center">
              <CurrencyIcon size={20} />
            </span>
          )}
          <span className="truncate min-w-0">
            {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
          </span>
          {suffix && suffix !== 'VNC' && (
            <span className="text-xs sm:text-sm text-muted font-body font-normal shrink-0">
              {suffix}
            </span>
          )}
        </div>
      </div>

      {(hint || trend) && (
        <div className="flex items-center justify-between text-xs text-muted mt-3 pt-2.5 border-t border-line/50 gap-2">
          {hint && <span className="truncate text-[11px]">{hint}</span>}
          {trend && (
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-surface2 text-muted border border-line/60 shrink-0 ml-auto">
              {trend}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

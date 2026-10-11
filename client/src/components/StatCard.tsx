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
    <div className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group">
      {/* Ambient background glow circle */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-indigo/5 group-hover:bg-indigo/10 blur-xl transition -z-0 pointer-events-none" />

      <div className="flex items-center justify-between text-xs text-muted mb-2 relative z-10">
        <span className="font-medium tracking-wide uppercase text-[11px]">{label}</span>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center bg-surface2/80 border border-line/60 shadow-sm transition-transform group-hover:scale-110`}
        >
          <i className={`bi ${icon} ${iconColor} text-sm`} />
        </div>
      </div>

      <div className="font-mono font-mono-nums text-2xl sm:text-3xl font-bold tracking-tight flex items-baseline gap-1.5 relative z-10">
        {suffix === 'VDX' && (
          <span className="self-center">
            <CurrencyIcon size={22} />
          </span>
        )}
        <span className="text-ink">
          {typeof value === 'number' ? <AnimatedNumber value={value} /> : value}
        </span>
        {suffix && suffix !== 'VDX' && (
          <span className="text-xs sm:text-sm text-muted font-body font-medium">{suffix}</span>
        )}
      </div>

      {(hint || trend) && (
        <div className="flex items-center justify-between text-[11px] text-muted mt-2 pt-2 border-t border-line/40 relative z-10">
          {hint && <span className="truncate">{hint}</span>}
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

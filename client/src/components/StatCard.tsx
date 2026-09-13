interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: string;
  iconColor?: string;
  hint?: string;
}

export default function StatCard({ label, value, suffix, icon, iconColor = 'text-amber', hint }: StatCardProps) {
  return (
    <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4">
      <div className="flex items-center justify-between text-[11px] text-muted uppercase tracking-wide">
        <span>{label}</span>
        <i className={`bi ${icon} ${iconColor}`} />
      </div>
      <div className="font-mono font-mono-nums text-2xl font-semibold mt-1.5">
        {value}
        {suffix && <span className="text-sm text-muted font-body"> {suffix}</span>}
      </div>
      {hint && <div className="text-[11px] text-muted mt-1">{hint}</div>}
    </div>
  );
}

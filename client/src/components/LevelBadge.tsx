import React from 'react';

export interface LevelBadgeProps {
  level?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function LevelBadge({
  level = 1,
  size = 'sm',
  showText = true,
  className = '',
}: LevelBadgeProps) {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level || 1)));

  let icon = 'bi-shield-fill';
  let badgeClasses = 'bg-zinc-800/90 text-zinc-300 border-zinc-700/80';
  let iconColor = 'text-zinc-400';

  if (safeLevel >= 20) {
    icon = 'bi-crown-fill';
    badgeClasses = 'bg-gradient-to-r from-red-950/90 via-orange-950/90 to-amber-950/90 text-orange-100 border-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.4)]';
    iconColor = 'text-amber-300';
  } else if (safeLevel >= 15) {
    icon = 'bi-trophy-fill';
    badgeClasses = 'bg-amber-950/80 text-amber-200 border-amber-500/80 shadow-[0_0_10px_rgba(245,158,11,0.25)]';
    iconColor = 'text-amber-400';
  } else if (safeLevel >= 10) {
    icon = 'bi-gem';
    badgeClasses = 'bg-purple-950/80 text-purple-200 border-purple-500/70 shadow-[0_0_8px_rgba(168,85,247,0.25)]';
    iconColor = 'text-purple-300';
  } else if (safeLevel >= 5) {
    icon = 'bi-shield-shaded';
    badgeClasses = 'bg-sky-950/80 text-sky-200 border-sky-500/70 shadow-[0_0_8px_rgba(14,165,233,0.25)]';
    iconColor = 'text-sky-300';
  }

  let sizeClasses = 'text-xs px-2 py-0.5 gap-1 border';
  let iconSize = 'text-[11px]';

  if (size === 'xs') {
    sizeClasses = 'text-[10px] px-1.5 py-0.2 gap-1 border';
    iconSize = 'text-[9px]';
  } else if (size === 'md') {
    sizeClasses = 'text-xs px-2.5 py-1 gap-1.5 border';
    iconSize = 'text-xs';
  } else if (size === 'lg') {
    sizeClasses = 'text-sm px-3 py-1.5 gap-2 border';
    iconSize = 'text-sm';
  }

  return (
    <span
      className={`inline-flex items-center font-mono font-bold rounded-md shrink-0 uppercase tracking-tight select-none ${sizeClasses} ${badgeClasses} ${className}`}
      title={`Cấp độ ${safeLevel}`}
    >
      <i className={`bi ${icon} ${iconColor} ${iconSize}`} />
      {showText && <span>Lv.{safeLevel}</span>}
    </span>
  );
}

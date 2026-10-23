import React from 'react';

export interface AvatarFrameProps {
  level?: number;
  children: React.ReactNode;
  className?: string;
  shape?: 'circle' | 'square';
}

export default function AvatarFrame({
  level = 1,
  children,
  className = '',
  shape = 'circle',
}: AvatarFrameProps) {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level || 1)));

  if (safeLevel < 5) {
    return <div className={`relative inline-flex shrink-0 ${className}`}>{children}</div>;
  }

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  let frameClasses = 'p-[2px] bg-gradient-to-tr from-sky-500 to-cyan-400';

  if (safeLevel >= 20) {
    frameClasses = 'p-[3px] bg-gradient-to-tr from-rose-500 via-amber-300 to-orange-600 level-frame-prime-pulse';
  } else if (safeLevel >= 15) {
    frameClasses = 'p-[2.5px] bg-gradient-to-tr from-amber-400 via-yellow-200 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.35)] level-frame-spin-slow';
  } else if (safeLevel >= 10) {
    frameClasses = 'p-[2px] bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-indigo-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
  }

  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center transition-all ${roundedClass} ${frameClasses} ${className}`}
    >
      <div className={`w-full h-full ${roundedClass} overflow-hidden flex items-center justify-center`}>
        {children}
      </div>
    </div>
  );
}

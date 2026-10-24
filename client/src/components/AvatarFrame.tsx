import React from 'react';

export interface AvatarFrameProps {
  level?: number;
  frame?: string | null;
  children: React.ReactNode;
  className?: string;
  shape?: 'circle' | 'square';
}

export default function AvatarFrame({
  level = 1,
  frame = null,
  children,
  className = '',
  shape = 'circle',
}: AvatarFrameProps) {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level || 1)));
  const isCrystal = frame === 'crystal_purple_gold' || (!frame && safeLevel >= 20);

  const roundedClass = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  if (isCrystal) {
    return (
      <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
        <div className={`w-full h-full ${roundedClass} overflow-hidden flex items-center justify-center`}>
          {children}
        </div>
        <img
          src="/frames/crystal-purple-gold.png"
          alt=""
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[128%] h-[128%] max-w-none pointer-events-none select-none z-10"
        />
      </div>
    );
  }

  let frameClasses = '';

  if (frame === 'gold' || (!frame && safeLevel >= 15)) {
    frameClasses = 'p-[2.5px] bg-gradient-to-tr from-amber-400 via-yellow-200 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]';
  } else if (frame === 'purple' || (!frame && safeLevel >= 10)) {
    frameClasses = 'p-[2px] bg-gradient-to-tr from-purple-500 via-fuchsia-500 to-indigo-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]';
  } else if (frame === 'cyan' || (!frame && safeLevel >= 5)) {
    frameClasses = 'p-[2px] bg-gradient-to-tr from-sky-500 to-cyan-400';
  }

  if (!frameClasses) {
    return <div className={`relative inline-flex shrink-0 ${className}`}>{children}</div>;
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

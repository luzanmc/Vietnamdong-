import React from 'react';

export interface UserNameProps {
  name: string;
  level?: number;
  className?: string;
  title?: string;
}

export default function UserName({
  name,
  level = 1,
  className = '',
  title,
}: UserNameProps) {
  const safeLevel = Math.max(1, Math.min(20, Math.floor(level || 1)));

  let tierClasses = 'text-ink';

  if (safeLevel >= 20) {
    tierClasses = 'level-name-prime level-text-glow font-extrabold';
  } else if (safeLevel >= 15) {
    tierClasses = 'level-name-shimmer font-bold';
  } else if (safeLevel >= 10) {
    tierClasses = 'bg-gradient-to-r from-purple-400 via-fuchsia-300 to-pink-400 bg-clip-text text-transparent font-bold';
  } else if (safeLevel >= 5) {
    tierClasses = 'text-sky-400 font-semibold';
  }

  return (
    <span
      className={`truncate inline-block transition-colors ${tierClasses} ${className}`}
      title={title || `${name} (Cấp ${safeLevel})`}
    >
      {name}
    </span>
  );
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return <div className={`skeleton bg-surface2 rounded-lg ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="h-7 w-24 mt-1.5" />
      <Skeleton className="h-3 w-20 mt-2" />
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="bg-surface border border-line rounded-xl p-4 flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <Skeleton className="h-4 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
      <Skeleton className="h-8 w-20 shrink-0" />
    </div>
  );
}

export function RedeemItemSkeleton() {
  return (
    <div className="bg-gradient-to-b from-surface to-surface2 border border-line rounded-xl p-4 flex items-center justify-between">
      <div>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-7 w-14" />
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
      <div className="flex items-center gap-3">
        <Skeleton className="h-3 w-5" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

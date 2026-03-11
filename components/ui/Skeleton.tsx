interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-radius-md bg-surface-overlay ${className}`}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`rounded-radius-lg border border-border-default bg-surface-raised p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-radius-sm" />
        <Skeleton className="h-4 w-32" />
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

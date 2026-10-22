import { cn } from './cn.js';

// Loading placeholder. Pulse only — no shimmer sweep, it is too loud here.
export function Skeleton({ className }) {
  return (
    <div
      className={cn('animate-pulse rounded-control bg-surface-2', className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

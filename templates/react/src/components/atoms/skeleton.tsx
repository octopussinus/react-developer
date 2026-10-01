import { cn } from '@/lib/cn';

/** Atom. A shimmering box; composing them into a loading view is a molecule. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-control bg-surface-muted', className)}
    />
  );
}

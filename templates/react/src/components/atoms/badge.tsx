import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}

const tones = {
  neutral: 'bg-surface-muted text-muted-foreground',
  success: 'bg-status-success/15 text-status-success',
  warning: 'bg-status-warning/15 text-status-warning',
  danger: 'bg-status-danger/15 text-status-danger',
} as const;

/** Atom. Tone is semantic, so a status colour is never a hex in a feature. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

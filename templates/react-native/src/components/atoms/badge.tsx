// react-dev:translated-from src/components/atoms/badge.tsx@8fda79504e2f
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { cn } from '@/lib/cn';

export interface BadgeProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  children: ReactNode;
  className?: string;
}

const tones = {
  neutral: 'bg-muted',
  success: 'bg-status-success/15',
  warning: 'bg-status-warning/15',
  danger: 'bg-destructive/15',
} as const;

const texts = {
  neutral: 'text-muted-foreground',
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-destructive',
} as const;

/** Atom. Tone is semantic, so a status colour is never a hex in a feature. */
export function Badge({ tone = 'neutral', children, className }: BadgeProps) {
  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-full px-2 py-0.5',
        tones[tone],
        className,
      )}
    >
      <Text className={cn('text-xs font-medium', texts[tone])}>{children}</Text>
    </View>
  );
}

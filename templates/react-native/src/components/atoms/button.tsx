// react-dev:translated-from src/components/atoms/button.tsx@b6b8b4c8b0a7
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  className?: string;
  children: ReactNode;
}

/*
 * Roles, never palette ramps -- same as the web Button. Two maps instead of
 * one because React Native text does not inherit: the container gets the fill,
 * the <Text> gets the colour. `hover:` has no touch equivalent; `active:` is
 * the pressed state.
 */
const containers = {
  primary: 'bg-primary active:bg-primary/90',
  secondary: 'border border-input bg-background active:bg-accent',
  ghost: 'active:bg-accent',
  danger: 'bg-destructive active:bg-destructive/90',
} as const;

const labels = {
  primary: 'text-primary-foreground',
  secondary: 'text-foreground',
  ghost: 'text-foreground',
  danger: 'text-white',
} as const;

const spinners = {
  primary: 'accent-primary-foreground',
  secondary: 'accent-foreground',
  ghost: 'accent-foreground',
  danger: 'accent-white',
} as const;

const sizes = {
  sm: 'min-h-9 px-3',
  md: 'min-h-11 px-4',
  lg: 'min-h-12 px-6',
} as const;

const textSizes = { sm: 'text-sm', md: 'text-sm', lg: 'text-base' } as const;

/**
 * Atom. Presentational only: no data fetching, no translation lookups, no
 * router. Everything it renders comes from props. `onPress`, not `onClick`.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const inactive = disabled === true || isLoading;
  return (
    <Pressable
      accessibilityRole="button"
      // busy, not just a spinner: screen readers need the state too.
      accessibilityState={{ disabled: inactive, busy: isLoading }}
      disabled={inactive}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-md',
        inactive && 'opacity-50',
        containers[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <ActivityIndicator size="small" colorClassName={spinners[variant]} /> : null}
      {typeof children === 'string' ? (
        <Text className={cn('font-medium', labels[variant], textSizes[size])}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}

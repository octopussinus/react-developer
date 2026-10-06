import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

/* Roles, never palette ramps -- so dark mode needs no `dark:` variant here. */
const variants = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary:
    'border-(length:--ui-border-width) border-input bg-background hover:bg-accent hover:text-accent-foreground',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  danger: 'bg-destructive text-white hover:bg-destructive/90',
} as const;

const sizes = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-12 px-6 text-base',
} as const;

/**
 * Atom. Presentational only: no data fetching, no translation lookups, no
 * router. Everything it renders comes from props.
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
  return (
    <button
      // aria-busy, not just a spinner: screen readers need the state too.
      aria-busy={isLoading}
      disabled={disabled === true || isLoading}
      className={cn(
        // Shape comes from tokens, so a theme changes how every button LOOKS,
        // not just its colour.
        'inline-flex items-center justify-center gap-2 rounded-md',
        'font-(--ui-font-weight) shadow-(--ui-shadow)',
        'transition-colors disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {isLoading ? <Spinner /> : null}
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden="true"
      className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

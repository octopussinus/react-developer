import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

/**
 * Atom. Deliberately has no label and no error message -- pairing those with an
 * input is a molecule's job (`FormField`). Keeping them apart is what stops
 * every form growing its own slightly different label markup.
 */
export function Input({ hasError = false, className, ...props }: InputProps) {
  return (
    <input
      aria-invalid={hasError}
      className={cn(
        'min-h-11 w-full rounded-md border bg-card px-3 text-sm',
        'placeholder:text-muted-foreground disabled:opacity-50',
        hasError ? 'border-destructive' : 'border-border',
        className,
      )}
      {...props}
    />
  );
}

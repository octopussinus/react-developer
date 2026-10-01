import { useId, type ReactNode } from 'react';
import { Input, type InputProps } from '@/components/atoms';

export interface FormFieldProps extends Omit<InputProps, 'id' | 'hasError'> {
  label: string;
  /** Message from the Zod resolver. Its presence is what marks the field invalid. */
  error?: string;
  hint?: ReactNode;
}

/**
 * Molecule: label + input + error, wired together.
 *
 * The textbook atomic example, and the reason it matters here is accessibility:
 * `htmlFor`/`id` and `aria-describedby` are generated once, so no feature can
 * ship an unlabelled input or an error a screen reader never announces.
 */
export function FormField({ label, error, hint, ...inputProps }: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ');

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <Input
        id={id}
        hasError={error !== undefined}
        {...(describedBy ? { 'aria-describedby': describedBy } : {})}
        {...inputProps}
      />
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

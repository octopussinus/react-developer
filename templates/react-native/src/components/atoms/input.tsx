// react-dev:translated-from src/components/atoms/input.tsx@02f4efa4cf5c
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';

export interface InputProps extends TextInputProps {
  hasError?: boolean;
  className?: string;
}

/**
 * Atom. Deliberately has no label and no error message -- pairing those with an
 * input is a molecule's job (`FormField`), exactly as on the web.
 *
 * Controlled with `value` + `onChangeText` (the new value, not an event). With
 * react-hook-form that means `<Controller>` rather than `register()`, which
 * spreads DOM props a TextInput does not take.
 */
export function Input({ hasError = false, className, editable, ...props }: InputProps) {
  return (
    <TextInput
      aria-invalid={hasError}
      editable={editable}
      placeholderTextColorClassName="accent-muted-foreground"
      className={cn(
        'min-h-11 w-full rounded-md border bg-card px-3 text-sm text-foreground',
        editable === false && 'opacity-50',
        hasError ? 'border-destructive' : 'border-border',
        className,
      )}
      {...props}
    />
  );
}

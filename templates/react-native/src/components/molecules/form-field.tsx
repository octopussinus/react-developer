// react-dev:translated-from src/components/molecules/form-field.tsx@6ef4d511284b
import { useId, type ReactNode } from 'react';
import { Text, View } from 'react-native';
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
 * The web version links them with htmlFor/id and aria-describedby. Native has
 * no `for`: the label is announced through accessibilityLabel and nativeID +
 * aria-labelledby, and the error through an alert role -- so, as on the web,
 * no feature can ship an unlabelled input or an error nobody hears.
 */
export function FormField({ label, error, hint, ...inputProps }: FormFieldProps) {
  const id = useId();
  const labelId = `${id}-label`;

  return (
    <View className="gap-1.5">
      <Text nativeID={labelId} className="text-sm font-medium text-foreground">
        {label}
      </Text>
      <Input
        aria-labelledby={labelId}
        accessibilityLabel={label}
        accessibilityHint={error ?? (typeof hint === 'string' ? hint : undefined)}
        hasError={error !== undefined}
        {...inputProps}
      />
      {hint ? <Text className="text-xs text-muted-foreground">{hint}</Text> : null}
      {error ? (
        <Text accessibilityRole="alert" className="text-xs text-destructive">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

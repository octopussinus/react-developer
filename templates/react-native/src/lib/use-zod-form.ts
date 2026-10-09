import { useForm, type UseFormProps, type UseFormReturn, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { z } from 'zod';

/**
 * One schema produces the TS type, the runtime validation and the resolver, so
 * validation can never drift between the form and the API payload.
 *
 *   const schema = z.object({ email: z.string().email() });
 *   const form = useZodForm(schema);
 *   <FormField label="Email" {...form.register('email')}
 *              error={form.formState.errors.email?.message} />
 */
export function useZodForm<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.input<TSchema>>, 'resolver'>,
): UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>> {
  return useForm({
    resolver: zodResolver(schema),
    ...options,
  }) as UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>>;
}

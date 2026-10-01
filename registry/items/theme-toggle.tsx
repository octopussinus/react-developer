import { useTheme, type ThemePreference } from '@/lib/theme';
import { cn } from '@/lib/cn';

/**
 * ThemeToggle — a molecule. Drives the `.dark` class that every shadcn
 * component's `dark:` variants depend on.
 *
 * A three-way control, not a switch: 'system' must stay reachable, because a
 * two-state toggle silently opts the user out of following their OS.
 */

const OPTIONS: readonly { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'system', label: 'System' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const preference = useTheme((state) => state.preference);
  const setPreference = useTheme((state) => state.setPreference);

  return (
    // radiogroup, not a row of buttons: exactly one is selected, and screen
    // readers should announce it that way.
    <div
      role="radiogroup"
      aria-label="Colour scheme"
      className={cn('inline-flex rounded-md border border-input bg-background p-0.5', className)}
    >
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setPreference(option.value)}
            className={cn(
              'min-h-8 rounded-sm px-3 text-xs font-medium transition-colors',
              selected
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

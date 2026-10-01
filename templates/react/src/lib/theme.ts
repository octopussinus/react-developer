import { create } from 'zustand';

/**
 * Dark mode via the `.dark` class on <html> -- shadcn's convention, which is
 * why it is not a `prefers-color-scheme` media query. Registry components
 * declare their dark variants as `dark:` utilities, and those only resolve
 * under that class.
 *
 * 'system' follows the OS and keeps following it when the OS changes.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system'; // private mode / blocked storage
  }
}

function apply(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

interface ThemeStore {
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
}

export const useTheme = create<ThemeStore>((set) => ({
  preference: 'system',
  setPreference: (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not fatal: the choice simply will not persist.
    }
    apply(next);
    set({ preference: next });
  },
}));

/** Call once before render so there is no light-mode flash. */
export function initTheme(): void {
  const preference = readStored();
  apply(preference);
  useTheme.setState({ preference });

  // Keep following the OS while the preference is 'system'.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useTheme.getState().preference === 'system') apply('system');
  });
}

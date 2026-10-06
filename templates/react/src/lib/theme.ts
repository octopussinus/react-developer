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

/**
 * Named themes, declared once so a switcher never has to hardcode the list.
 * `default` is the `:root` block; the rest live in styles/themes.css and apply
 * through `data-theme` on <html>.
 *
 * Every project ships with three even when the design names one: a second theme
 * is the cheapest proof that nothing hardcodes a colour, and adding the third
 * later means revisiting every component instead of one file.
 */
export const THEMES = ['default', 'ocean', 'sunset'] as const;
export type ThemeName = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';
const NAME_KEY = 'theme-name';

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

function readStoredName(): ThemeName {
  try {
    const value = localStorage.getItem(NAME_KEY);
    return THEMES.includes(value as ThemeName) ? (value as ThemeName) : 'default';
  } catch {
    return 'default';
  }
}

function apply(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

function applyName(name: ThemeName): void {
  // `default` is the :root block, so it carries no attribute at all -- an
  // attribute that matches nothing would still look like a theme in devtools.
  if (name === 'default') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', name);
}

interface ThemeStore {
  preference: ThemePreference;
  name: ThemeName;
  setPreference: (next: ThemePreference) => void;
  setName: (next: ThemeName) => void;
}

export const useTheme = create<ThemeStore>((set) => ({
  preference: 'system',
  name: 'default',
  setPreference: (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not fatal: the choice simply will not persist.
    }
    apply(next);
    set({ preference: next });
  },
  setName: (next) => {
    try {
      localStorage.setItem(NAME_KEY, next);
    } catch {
      // Not fatal: the choice simply will not persist.
    }
    applyName(next);
    set({ name: next });
  },
}));

/** Call once before render so there is no light-mode flash. */
export function initTheme(): void {
  const preference = readStored();
  const name = readStoredName();
  apply(preference);
  applyName(name);
  useTheme.setState({ preference, name });

  // Keep following the OS while the preference is 'system'.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useTheme.getState().preference === 'system') apply('system');
  });
}

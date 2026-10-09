// react-dev:translated-from src/lib/theme.ts@c0dc1bc30c21
import { Appearance } from 'react-native';
import { Uniwind } from 'uniwind';
import { create } from 'zustand';
import generated from '@/styles/themes.json';

/**
 * Native translation of the web app's src/lib/theme.ts: same store, same
 * exports, so every component that reads `useTheme()` is untouched.
 *
 *   web                                    native
 *   `.dark` class on <html>                Uniwind.setTheme('<theme>[-dark]')
 *   `data-theme` attribute                 the same call: themes are one flat list
 *   matchMedia('(prefers-color-scheme)')   Appearance from react-native
 *
 * The flat list (light, dark, ocean, ocean-dark, ...) is what `npm run port`
 * generated from the web stylesheets into src/styles/themes.json.
 */
export type ThemePreference = 'light' | 'dark' | 'system';

export const THEMES = ['default', 'ocean', 'sunset'] as const;
export type ThemeName = (typeof THEMES)[number];

const STORAGE_KEY = 'theme';
const NAME_KEY = 'theme-name';
const available = new Set<string>(['light', 'dark', ...generated.extraThemes]);

function prefersDark(): boolean {
  return Appearance.getColorScheme() === 'dark';
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' || value === 'system' ? value : 'system';
  } catch {
    return 'system';
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

/** Every theme Uniwind was told about (generated into src/uniwind-types.d.ts). */
type UniwindTheme = Parameters<typeof Uniwind.setTheme>[0];

/** The Uniwind theme for a name and a scheme, falling back to what exists. */
export function variantFor(name: ThemeName, dark: boolean): UniwindTheme {
  const scheme = dark ? 'dark' : 'light';
  if (name === 'default') return scheme;
  const wanted = dark ? `${name}-dark` : name;
  // themes.json is the same list Uniwind was configured with, so a name found
  // in it IS one of Uniwind's themes; the cast only tells the compiler so.
  return (available.has(wanted) ? wanted : scheme) as UniwindTheme;
}

function apply(preference: ThemePreference, name: ThemeName): void {
  const dark = preference === 'dark' || (preference === 'system' && prefersDark());
  Uniwind.setTheme(variantFor(name, dark));
}

interface ThemeStore {
  preference: ThemePreference;
  name: ThemeName;
  setPreference: (next: ThemePreference) => void;
  setName: (next: ThemeName) => void;
}

export const useTheme = create<ThemeStore>((set, get) => ({
  preference: 'system',
  name: 'default',
  setPreference: (next) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not fatal: the choice simply will not persist.
    }
    apply(next, get().name);
    set({ preference: next });
  },
  setName: (next) => {
    try {
      localStorage.setItem(NAME_KEY, next);
    } catch {
      // Not fatal: the choice simply will not persist.
    }
    apply(get().preference, next);
    set({ name: next });
  },
}));

let following = false;

/** Call once before render so there is no light-mode flash. */
export function initTheme(): void {
  const preference = readStored();
  const name = readStoredName();
  apply(preference, name);
  useTheme.setState({ preference, name });

  // Keep following the OS while the preference is 'system'.
  if (following) return;
  following = true;
  Appearance.addChangeListener(() => {
    const state = useTheme.getState();
    if (state.preference === 'system') apply('system', state.name);
  });
}

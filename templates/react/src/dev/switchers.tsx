/**
 * Dev-only theme and language switchers.
 *
 * They exist in the toolbar rather than the product because every project ships
 * three themes and two locales whether or not the design asked for a switcher.
 * Without a way to flip between them you find out a screen breaks in Polish, or
 * under the second theme, from a user — which is the whole failure the extra
 * themes and locales were generated to prevent.
 *
 * Deliberately NOT a product component: shipping a switcher nobody designed is
 * how a dev affordance ends up in production. Build a real one when the design
 * has one; these two keep working either way.
 */

import i18n, { locales } from '@/config/i18n';
import { THEMES, useTheme, type ThemeName } from '@/lib/theme';

import type { Dock } from './dock';

/** Readable names for the generated themes; a slug is not a label. */
const THEME_LABELS: Record<ThemeName, string> = {
  default: 'Default',
  ocean: 'Ocean',
  sunset: 'Sunset',
};

export function mountSwitchers(bar: HTMLElement, dock: Dock): void {
  // --- theme ------------------------------------------------------------
  const themeButton = document.createElement('button');
  themeButton.type = 'button';
  themeButton.id = 'theme';
  bar.insertBefore(themeButton, bar.firstChild);

  const menu = document.createElement('div');
  menu.className = 'switch-menu';
  dock.add(menu);

  function renderThemeButton(): void {
    const { name, preference } = useTheme.getState();
    themeButton.textContent = `${THEME_LABELS[name]} · ${preference}`;
  }

  function buildMenu(): void {
    menu.replaceChildren();

    const themesTitle = document.createElement('h3');
    themesTitle.textContent = 'Theme';
    menu.appendChild(themesTitle);

    for (const name of THEMES) {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = THEME_LABELS[name];
      option.dataset['on'] = String(useTheme.getState().name === name);
      option.addEventListener('click', () => {
        useTheme.getState().setName(name);
        renderThemeButton();
        buildMenu();
      });
      menu.appendChild(option);
    }

    const schemeTitle = document.createElement('h3');
    schemeTitle.textContent = 'Light / dark';
    menu.appendChild(schemeTitle);

    for (const preference of ['light', 'dark', 'system'] as const) {
      const option = document.createElement('button');
      option.type = 'button';
      option.textContent = preference;
      option.dataset['on'] = String(useTheme.getState().preference === preference);
      option.addEventListener('click', () => {
        useTheme.getState().setPreference(preference);
        renderThemeButton();
        buildMenu();
      });
      menu.appendChild(option);
    }
  }

  themeButton.addEventListener('click', () => {
    const next = dock.toggle(menu);
    themeButton.dataset['active'] = String(next);
    if (next) buildMenu();
  });

  renderThemeButton();

  // --- language ---------------------------------------------------------
  const langButton = document.createElement('button');
  langButton.type = 'button';
  langButton.id = 'lang';
  bar.insertBefore(langButton, bar.firstChild);

  function renderLangButton(): void {
    langButton.textContent = i18n.resolvedLanguage?.toUpperCase() ?? 'EN';
    langButton.title = `Language: ${i18n.resolvedLanguage ?? 'en'} — click to switch`;
  }

  langButton.addEventListener('click', () => {
    // Read from the project's own list, not i18next's runtime options, where
    // `supportedLngs` is `false` unless set and carries i18next's own `cimode`.
    const codes = Object.keys(locales);
    const current = i18n.resolvedLanguage ?? codes[0] ?? 'en';
    const next = codes[(codes.indexOf(current) + 1) % codes.length] ?? current;
    void i18n.changeLanguage(next).then(renderLangButton);
  });

  renderLangButton();
  i18n.on('languageChanged', renderLangButton);
}

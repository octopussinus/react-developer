// react-dev:translated-from src/config/i18n.ts@eadf903be7bb
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { getLocales } from 'expo-localization';

/**
 * Native translation of the web app's src/config/i18n.ts: same exports, same
 * locale files, different plumbing.
 *
 *   web                                   native
 *   navigator.language                    expo-localization getLocales()
 *   import(`../locales/${l}/${ns}.json`)  require.context -- Metro cannot follow a
 *                                         template-literal import, but it bundles a
 *                                         context and loads from it
 *   <html lang>                           nothing: there is no document; screen
 *                                         readers take the language from the OS
 */
export const locales = {
  en: 'English',
  pl: 'Polski',
} as const;

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = 'en';
export const namespaces = ['common', 'nav'] as const;

const files = require.context('../locales', true, /\.json$/);

function detectLocale(): Locale {
  // localStorage is real here: expo-sqlite installs it (src/platform/install.ts).
  const stored = (() => {
    try {
      return localStorage.getItem('locale');
    } catch {
      return null;
    }
  })();
  if (stored && stored in locales) return stored as Locale;

  const device = getLocales()[0]?.languageCode ?? '';
  return device in locales ? (device as Locale) : defaultLocale;
}

void i18n
  .use(
    resourcesToBackend((language: string, namespace: string) =>
      Promise.resolve(files(`./${language}/${namespace}.json`) as Record<string, unknown>),
    ),
  )
  .use(initReactI18next)
  .init({
    lng: detectLocale(),
    fallbackLng: defaultLocale,
    ns: namespaces,
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

export default i18n;

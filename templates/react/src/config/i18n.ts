import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import resourcesToBackend from 'i18next-resources-to-backend';

/**
 * Locales load lazily, one namespace at a time. An eager glob would ship every
 * language to every user -- fine at two locales, a real payload problem at ten.
 */
export const locales = {
  en: 'English',
  pl: 'Polski',
} as const;

export type Locale = keyof typeof locales;

export const defaultLocale: Locale = 'en';
export const namespaces = ['common', 'nav'] as const;

function detectLocale(): Locale {
  const stored = (() => {
    try {
      return localStorage.getItem('locale');
    } catch {
      return null; // private mode / blocked storage
    }
  })();
  if (stored && stored in locales) return stored as Locale;

  const browser = navigator.language.split('-')[0];
  return browser && browser in locales ? (browser as Locale) : defaultLocale;
}

/*
 * Deliberately NOT awaited at the top level: top-level await forces
 * build.target to esnext and drops older browsers. i18next is built for async
 * init -- react-i18next suspends until resources land, and <Providers /> has
 * the Suspense boundary that handles it.
 */
void i18n
  .use(
    resourcesToBackend(
      (language: string, namespace: string) => import(`../locales/${language}/${namespace}.json`),
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

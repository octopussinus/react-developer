import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import translation files
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import plCommon from './locales/pl/common.json';
import plDashboard from './locales/pl/dashboard.json';

const resources = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
  },
  pl: {
    common: plCommon,
    dashboard: plDashboard,
  },
};

export const availableLanguages = Object.keys(resources);

// Get device locale
const getDeviceLanguage = (): string => {
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const languageCode = locales[0].languageCode;
    if (languageCode && availableLanguages.includes(languageCode)) {
      return languageCode;
    }
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    ns: ['common', 'dashboard'],
    defaultNS: 'common',
  });

export default i18n;

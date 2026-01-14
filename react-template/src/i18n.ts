import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Eagerly load all translation files from locales directory
// This allows adding new languages/namespaces just by adding files
const modules = import.meta.glob('./locales/*/*.json', { eager: true });

const resources: Record<string, any> = {};

for (const path in modules) {
    // path example: "./locales/en/common.json"
    const parts = path.split('/');
    const lang = parts[2];
    const ns = parts[3].replace('.json', '');

    if (!resources[lang]) {
        resources[lang] = {};
    }

    // @ts-ignore
    resources[lang][ns] = modules[path].default || modules[path];
}

export const availableLanguages = Object.keys(resources);

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false, // React already safes from xss
        },
        ns: ['common'],
        defaultNS: 'common',
    });

export default i18n;

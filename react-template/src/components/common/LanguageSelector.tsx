import React from 'react';
import { useTranslation } from 'react-i18next';
import { availableLanguages } from '../../i18n';

export const LanguageSelector: React.FC = () => {
    const { i18n } = useTranslation();

    const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
        i18n.changeLanguage(e.target.value);
    };

    // Ensure current language is one of the available ones, or fallback
    const currentLang = availableLanguages.includes(i18n.language)
        ? i18n.language
        : availableLanguages.find(l => i18n.language.startsWith(l)) || 'en';

    return (
        <div className="relative inline-block">
            <select
                onChange={changeLanguage}
                value={currentLang}
                className="appearance-none bg-transparent border border-gray-200 dark:border-gray-800 rounded-lg pl-3 pr-8 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white focus:outline-none cursor-pointer"
            >
                {availableLanguages.map((lang) => (
                    <option key={lang} value={lang} className="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                        {lang.toUpperCase()}
                    </option>
                ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-600 dark:text-gray-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
            </div>
        </div>
    );
};

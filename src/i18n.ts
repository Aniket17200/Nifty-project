import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import translationEN from './locales/en.json';
import translationAR from './locales/ar.json';

const resources = {
    en: { translation: translationEN },
    ar: { translation: translationAR }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },
    });

// Setup RTL document direction based on language
i18n.on('languageChanged', (lng) => {
    const dir = i18n.dir(lng);
    document.documentElement.dir = dir;
    document.documentElement.lang = lng;
});

export default i18n;

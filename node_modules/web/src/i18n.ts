import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import HttpApi from 'i18next-http-backend';

// Import translation files
import enCommon from './locales/en/common.json';
import hiCommon from './locales/hi/common.json';
import knCommon from "./locales/kn/common.json";
import taCommon from "./locales/ta/common.json";
import teCommon from "./locales/te/common.json";

// Get saved language preference from localStorage
const savedLanguage = localStorage.getItem('swasthya_lang') || 'en';

i18n
  .use(HttpApi)
  .use(initReactI18next)
  .init({
    lng: savedLanguage,
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    resources: {
      en: {
        common: enCommon,
      },
      hi: {
        common: hiCommon,
      },
        kn: 
        { common: knCommon 

        },
        ta: { common: taCommon },
        te: { common: teCommon }
    },
    
    ns: ['common'],
    defaultNS: 'common',
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('swasthya_lang', lng);
});

export default i18n;
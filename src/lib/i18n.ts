import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import zh from '../locales/zh.json';
import { getLanguage, saveLanguage } from './storage';

export const LANGUAGES = {
  en: 'English',
  zh: '中文',
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

const initI18n = async () => {
  const savedLang = await getLanguage();

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        zh: { translation: zh },
      },
      lng: savedLang ?? 'en',
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: 'v4',
    });
  }

  return i18n;
};

export const changeLanguage = async (lang: LanguageCode) => {
  await i18n.changeLanguage(lang);
  await saveLanguage(lang);
};

export { initI18n };
export default i18n;

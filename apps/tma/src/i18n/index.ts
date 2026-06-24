import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en, ru } from "./dictionary";

void i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: "ru",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function applyLanguage(code?: string) {
  const next = code?.toLowerCase().startsWith("ru") ? "ru" : code ? "en" : undefined;
  if (next) void i18n.changeLanguage(next);
}

export default i18n;

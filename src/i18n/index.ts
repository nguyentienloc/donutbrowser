import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import vi from "./locales/vi.json";

export const SUPPORTED_LANGUAGES = [
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANGUAGE_FALLBACKS: Record<string, string[]> = {
  uk: ["vi", "en"],
  be: ["vi", "en"],
  "zh-TW": ["vi", "en"],
  "zh-CN": ["vi", "en"],
  "zh-HK": ["vi", "en"],
  "pt-BR": ["vi", "en"],
  "pt-PT": ["vi", "en"],
  "es-MX": ["vi", "en"],
  "es-AR": ["vi", "en"],
  "es-ES": ["vi", "en"],
  "fr-CA": ["vi", "en"],
  "fr-FR": ["vi", "en"],
};

export function getLanguageWithFallback(_systemLocale: string): string {
  return "vi";
}

const resources = {
  vi: { translation: vi },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "vi",
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;

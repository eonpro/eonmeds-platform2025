import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

// Initialize i18next
i18n
  .use(HttpApi) // Load translations using http
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    fallbackLng: "en",
    supportedLngs: ["en", "es"],
    defaultNS: "common",
    ns: ["common", "medical", "dashboard", "forms", "auth"],

    interpolation: {
      escapeValue: false, // React already escapes values
      format: (value: any, format?: string, lng?: string) => {
        if (format === "date" && value instanceof Date) {
          return new Intl.DateTimeFormat(lng).format(value);
        }
        if (format === "currency" && typeof value === "number") {
          return new Intl.NumberFormat(lng, {
            style: "currency",
            currency: "USD",
          }).format(value);
        }
        return value;
      },
    },

    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
      addPath: "/locales/add/{{lng}}/{{ns}}",
    },

    detection: {
      order: ["localStorage", "cookie", "navigator", "htmlTag"],
      caches: ["localStorage", "cookie"],
      lookupLocalStorage: "eonmeds_language",
      lookupCookie: "eonmeds_language",
      cookieMinutes: 60 * 24 * 365, // 1 year
    },

    react: {
      useSuspense: false, // Set to true if you want to use Suspense
    },
  });

export default i18n;

export const locales = ["en", "vi"] as const;
export const defaultLocale = "vi" as const; // Vietnam-first

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};

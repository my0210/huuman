export const LANGUAGES = [
  { code: "en", native: "English", region: "United States" },
  { code: "en-GB", native: "English", region: "UK" },
  { code: "es", native: "Español", region: "España" },
  { code: "fr", native: "Français", region: "France" },
  { code: "de", native: "Deutsch", region: "Deutschland" },
  { code: "it", native: "Italiano", region: "Italia" },
  { code: "pt-BR", native: "Português", region: "Brasil" },
  { code: "pt", native: "Português", region: "Portugal" },
  { code: "nl", native: "Nederlands", region: "Nederland" },
  { code: "sv", native: "Svenska", region: "Sverige" },
  { code: "da", native: "Dansk", region: "Danmark" },
  { code: "nb", native: "Norsk Bokmål", region: "Norge" },
  { code: "fi", native: "Suomi", region: "Suomi" },
  { code: "pl", native: "Polski", region: "Polska" },
  { code: "tr", native: "Türkçe", region: "Türkiye" },
  { code: "ru", native: "Русский", region: "Россия" },
  { code: "uk", native: "Українська", region: "Україна" },
  { code: "ja", native: "日本語", region: "日本" },
  { code: "ko", native: "한국어", region: "대한민국" },
  { code: "zh-Hans", native: "简体中文", region: "中国大陆" },
  { code: "zh-Hant", native: "繁體中文", region: "台灣" },
  { code: "ar", native: "العربية", region: "المملكة العربية السعودية" },
  { code: "hi", native: "हिन्दी", region: "भारत" },
  { code: "th", native: "ภาษาไทย", region: "ประเทศไทย" },
  { code: "vi", native: "Tiếng Việt", region: "Việt Nam" },
  { code: "id", native: "Bahasa Indonesia", region: "Indonesia" },
  { code: "ms", native: "Bahasa Melayu", region: "Malaysia" },
  { code: "el", native: "Ελληνικά", region: "Ελλάδα" },
  { code: "cs", native: "Čeština", region: "Česko" },
  { code: "ro", native: "Română", region: "România" },
  { code: "hu", native: "Magyar", region: "Magyarország" },
  { code: "he", native: "עברית", region: "ישראל" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

export function getLanguageByCode(code: string) {
  return LANGUAGES.find((l) => l.code === code);
}

export function getSavedLanguage(): LanguageCode {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("preferred_language") as LanguageCode) || "en";
}

export function saveLanguage(code: LanguageCode) {
  localStorage.setItem("preferred_language", code);
}

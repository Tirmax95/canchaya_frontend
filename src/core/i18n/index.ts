export {
  DEFAULT_LOCALE,
  LOCALES,
  LOCALE_COOKIE_NAME,
  detectLocaleFromAcceptLanguage,
  intlLocaleFor,
  parseLocale,
  type Locale,
} from "@/core/i18n/config";
export { createTranslator, interpolate, type TranslateFn, type Translator } from "@/core/i18n/translate";
export type { MessageKey } from "@/core/i18n/messages";

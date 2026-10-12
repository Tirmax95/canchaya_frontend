import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, parseLocale, type Locale } from "@/core/i18n/config";

/**
 * Propósito: Lee el idioma de la cookie en el navegador (global-error no tiene provider).
 */
export function readBrowserLocale(): Locale {
  if (typeof document === "undefined") {
    /**
     * Output:
     * @returns Locale — Español en SSR de emergencia
     */
    return DEFAULT_LOCALE;
  }
  const cookie = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE_NAME}=`));
  /**
   * Output:
   * @returns Locale — Idioma persistido o español
   */
  return parseLocale(cookie?.slice(LOCALE_COOKIE_NAME.length + 1));
}

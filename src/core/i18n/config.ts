export const LOCALES = ["es", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "es";

export const LOCALE_COOKIE_NAME = "canchaya.locale";

export const LOCALE_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const INTL_LOCALE_BY_UI: Record<Locale, string> = {
  es: "es-CO",
  en: "en-US",
};

/**
 * Propósito: Acepta solo es/en; cualquier otro valor cae al idioma por defecto.
 */
export function parseLocale(value: string | null | undefined): Locale {
  if (value === "en" || value === "es") {
    /**
     * Output:
     * @returns Locale — Idioma persistido y soportado
     */
    return value;
  }
  /**
   * Output:
   * @returns Locale — Español si el valor no es válido
   */
  return DEFAULT_LOCALE;
}

/**
 * Propósito: Elige es/en según Accept-Language del navegador (primer tag).
 */
export function detectLocaleFromAcceptLanguage(
  acceptLanguage: string | null | undefined,
): Locale {
  const firstTag = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  if (firstTag.startsWith("en")) {
    /**
     * Output:
     * @returns "en" — El cliente prefiere inglés
     */
    return "en";
  }
  /**
   * Output:
   * @returns "es" — Fallback del producto
   */
  return DEFAULT_LOCALE;
}

/**
 * Propósito: Locale BCP 47 para Intl (fechas y dinero) a partir del idioma de UI.
 */
export function intlLocaleFor(locale: Locale): string {
  /**
   * Output:
   * @returns string — es-CO o en-US
   */
  return INTL_LOCALE_BY_UI[locale];
}

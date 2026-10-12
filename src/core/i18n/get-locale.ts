import "server-only";

import {
  DEFAULT_LOCALE,
  detectLocaleFromAcceptLanguage,
  parseLocale,
  type Locale,
  LOCALE_COOKIE_NAME,
} from "@/core/i18n/config";
import { createTranslator, type Translator } from "@/core/i18n/translate";
import { cookies, headers } from "next/headers";

/**
 * Propósito: Resuelve el idioma de la request: cookie persistida o Accept-Language.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (stored === "es" || stored === "en") {
    /**
     * Output:
     * @returns Locale — Idioma elegido por la persona
     */
    return parseLocale(stored);
  }

  const acceptLanguage = (await headers()).get("accept-language");
  /**
   * Output:
   * @returns Locale — Idioma detectado del navegador o español
   */
  return detectLocaleFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

/**
 * Propósito: Traductor de servidor para RSC (páginas, layouts, metadata).
 */
export async function getTranslator(): Promise<Translator> {
  const locale = await getLocale();
  /**
   * Output:
   * @returns Translator — t() ligado al idioma de la request
   */
  return createTranslator(locale);
}

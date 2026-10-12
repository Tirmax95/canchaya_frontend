import type { Locale } from "@/core/i18n/config";
import { intlLocaleFor } from "@/core/i18n/config";
import { enMessages, esMessages, type MessageKey, type Messages } from "@/core/i18n/messages";

const MESSAGES_BY_LOCALE: Record<Locale, Messages> = {
  es: esMessages,
  en: enMessages,
};

const PLACEHOLDER_PATTERN = /\{(\w+)\}/g;

export type TranslateValues = Record<string, string | number>;

export type TranslateFn = (key: MessageKey, values?: TranslateValues) => string;

export interface Translator {
  locale: Locale;
  intlLocale: string;
  t: TranslateFn;
}

/**
 * Propósito: Recorre un diccionario anidado con claves tipo "nav.matches".
 * Si falta un tramo, devuelve la clave para que el hueco se note en desarrollo.
 */
function readMessage(messages: Messages, key: MessageKey): string {
  const segments = key.split(".");
  let current: unknown = messages;
  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      /**
       * Output:
       * @returns string — Clave cruda cuando el diccionario no tiene el texto
       */
      return key;
    }
    current = (current as Record<string, unknown>)[segment];
  }
  if (typeof current !== "string") {
    /**
     * Output:
     * @returns string — Clave cruda si el nodo no es una hoja
     */
    return key;
  }
  /**
   * Output:
   * @returns string — Plantilla del diccionario
   */
  return current;
}

/**
 * Propósito: Sustituye {nombre} por valores interpolados sin interpretar HTML.
 */
export function interpolate(template: string, values?: TranslateValues): string {
  if (!values) {
    /**
     * Output:
     * @returns string — Plantilla intacta
     */
    return template;
  }
  /**
   * Output:
   * @returns string — Texto con placeholders resueltos
   */
  return template.replace(PLACEHOLDER_PATTERN, (matched, name: string) => {
    const value = values[name];
    return value === undefined ? matched : String(value);
  });
}

/**
 * Propósito: Crea el traductor de un idioma: lookup O(profundidad de clave) + interpolación.
 */
export function createTranslator(locale: Locale): Translator {
  const messages = MESSAGES_BY_LOCALE[locale];
  /**
   * Propósito: Resuelve una clave del diccionario activo.
   */
  function t(key: MessageKey, values?: TranslateValues): string {
    /**
     * Output:
     * @returns string — Texto localizado listo para pintar
     */
    return interpolate(readMessage(messages, key), values);
  }
  /**
   * Output:
   * @returns Translator — locale, intlLocale y t()
   */
  return { locale, intlLocale: intlLocaleFor(locale), t };
}

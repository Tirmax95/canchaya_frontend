"use client";

import {
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/core/i18n/config";
import { createTranslator, type TranslateFn } from "@/core/i18n/translate";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface I18nContextValue {
  locale: Locale;
  intlLocale: string;
  t: TranslateFn;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * Propósito: Persiste el idioma en cookie (no httpOnly) para que el servidor lo lea al refrescar.
 */
function persistLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
  /**
   * Output:
   * Side effects — Cookie de idioma lista para el próximo RSC
   */
}

/**
 * Propósito: Comparte traducciones con toda la UI cliente sin recargar el diccionario por componente.
 */
export function I18nProvider({
  locale: initialLocale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  useEffect(() => {
    setLocaleState(initialLocale);
  }, [initialLocale]);
  const translator = useMemo(() => createTranslator(locale), [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    persistLocaleCookie(nextLocale);
    document.documentElement.lang = nextLocale;
    setLocaleState(nextLocale);
    /**
     * Output:
     * Side effects — Cambia idioma en cliente y cookie; el switcher pide refresh RSC
     */
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale: translator.locale,
      intlLocale: translator.intlLocale,
      t: translator.t,
      setLocale,
    }),
    [setLocale, translator],
  );

  /**
   * Output:
   * @returns JSX.Element — Contexto i18n
   */
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Propósito: Lee traductor y locale en componentes cliente. Debe usarse bajo I18nProvider.
 */
export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) {
    /**
     * Output:
     * @throws Error — El árbol no está envuelto por el provider
     */
    throw new Error("useI18n debe usarse dentro de I18nProvider");
  }
  /**
   * Output:
   * @returns I18nContextValue — locale, intlLocale, t, setLocale
   */
  return value;
}

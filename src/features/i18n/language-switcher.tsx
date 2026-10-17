"use client";

import { LOCALES, type Locale } from "@/core/i18n/config";
import { useI18n } from "@/core/i18n/provider";

const LOCALE_SHORT_LABEL: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

/**
 * Propósito: Alterna español/inglés, persiste cookie y recarga para metadata y páginas RSC.
 */
export function LanguageSwitcher() {
  const { locale, t, setLocale } = useI18n();

  /**
   * Propósito: Cambia el idioma, persiste cookie y recarga para metadata y páginas RSC.
   */
  function handleSelect(nextLocale: Locale) {
    if (nextLocale === locale) {
      /**
       * Output:
       * Side effects — Nada: ya está activo
       */
      return;
    }
    setLocale(nextLocale);
    window.location.reload();
    /**
     * Output:
     * Side effects — Cookie + recarga completa en el idioma elegido
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Toggle ES/EN del header
   */
  return (
    <div
      role="group"
      aria-label={t("language.switcherLabel")}
      className="flex rounded-full border border-white/[0.08] bg-white/[0.03] p-0.5"
    >
      {LOCALES.map((option) => {
        const isActive = option === locale;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={isActive}
            aria-label={t(option === "es" ? "language.es" : "language.en")}
            onClick={() => handleSelect(option)}
            className={
              isActive
                ? "rounded-full bg-white/[0.1] px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-bone"
                : "rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-mist/60 transition-colors hover:text-bone"
            }
          >
            {LOCALE_SHORT_LABEL[option]}
          </button>
        );
      })}
    </div>
  );
}

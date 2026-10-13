import { APP_CURRENCY, APP_LOCALE } from "@/core/config/app";

/**
 * Propósito: Formatea montos COP para toda la UI sin duplicar Intl.
 * `unavailableLabel` traduce el placeholder; el locale cambia el formato (es-CO / en-US).
 */
export function formatMoney(
  amount: number | null | undefined,
  locale: string = APP_LOCALE,
  unavailableLabel = "Consultar",
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    /**
     * Output:
     * @returns string — Placeholder cuando no hay precio
     */
    return unavailableLabel;
  }

  /**
   * Output:
   * @returns string — Precio localizado, sin decimales
   */
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: APP_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

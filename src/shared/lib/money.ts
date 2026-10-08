import { APP_CURRENCY, APP_LOCALE } from "@/core/config/env";

/**
 * Propósito: Formatea montos COP para toda la UI sin duplicar Intl.
 */
export function formatMoney(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    /**
     * Output:
     * @returns string — Placeholder cuando no hay precio
     */
    return "Consultar";
  }

  /**
   * Output:
   * @returns string — Precio localizado, sin decimales
   */
  return new Intl.NumberFormat(APP_LOCALE, {
    style: "currency",
    currency: APP_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount);
}

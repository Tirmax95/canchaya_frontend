import type { EventSummary } from "@/domain/events";
import { formatMoney } from "@/shared/lib/money";

/**
 * Propósito: Fecha civil `YYYY-MM-DD` legible sin correrla de zona horaria.
 */
export function formatCivilDate(civilDate: string, intlLocale: string): string {
  const date = new Date(`${civilDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) {
    /**
     * Output:
     * @returns string — Valor original si no es una fecha
     */
    return civilDate;
  }
  /**
   * Output:
   * @returns string — "12 oct 2026"
   */
  return new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

/**
 * Propósito: Rango de fechas del evento ("12 oct – 30 nov 2026" o solo inicio).
 */
export function formatEventDates(
  event: Pick<EventSummary, "startsOn" | "endsOn">,
  intlLocale: string,
): string {
  const start = formatCivilDate(event.startsOn, intlLocale);
  /**
   * Output:
   * @returns string — Fecha o rango
   */
  return event.endsOn && event.endsOn !== event.startsOn
    ? `${start} – ${formatCivilDate(event.endsOn, intlLocale)}`
    : start;
}

/**
 * Propósito: Valor de inscripción en pesos (o null si es gratis).
 */
export function formatEntryFee(
  event: Pick<EventSummary, "entryFeeCents">,
  intlLocale: string,
): string | null {
  /**
   * Output:
   * @returns string | null — Monto formateado
   */
  return event.entryFeeCents > 0
    ? formatMoney(Math.round(event.entryFeeCents / 100), intlLocale)
    : null;
}

/**
 * Propósito: Fecha y hora local de un ISO (partidos y cierres de inscripción).
 */
export function formatEventDateTime(iso: string, intlLocale: string): string {
  /**
   * Output:
   * @returns string — "sáb 18 oct, 8:00 p. m."
   */
  return new Intl.DateTimeFormat(intlLocale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Bogota",
  }).format(new Date(iso));
}

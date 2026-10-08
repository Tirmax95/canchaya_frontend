import { APP_LOCALE, APP_TIMEZONE } from "@/core/config/env";

/**
 * Propósito: Formatea un instante ISO en fecha/hora local de Bogotá.
 */
export function formatDateTime(iso: string): string {
  /**
   * Output:
   * @returns string — Fecha y hora localizadas
   */
  return new Intl.DateTimeFormat(APP_LOCALE, {
    timeZone: APP_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/**
 * Propósito: Devuelve YYYY-MM-DD en la zona de la app para inputs date.
 */
export function toDateInputValue(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  /**
   * Output:
   * @returns string — Fecha civil YYYY-MM-DD
   */
  return `${values.year}-${values.month}-${values.day}`;
}

/**
 * Propósito: Calcula duración en horas entre dos ISO.
 */
export function hoursBetween(startIso: string, endIso: string): number {
  /**
   * Output:
   * @returns number — Horas (puede ser fraccionaria)
   */
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
}

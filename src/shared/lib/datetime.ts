import { APP_LOCALE, APP_TIMEZONE } from "@/core/config/env";

/**
 * Propósito: Encabezado de día para agendas agrupadas (lunes 13 oct / Monday, Oct 13).
 */
export function formatDayHeading(civilDate: string, locale: string = APP_LOCALE): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(civilDate)) {
    /**
     * Output:
     * @returns string — El valor original si no es YYYY-MM-DD
     */
    return civilDate;
  }
  const formatted = new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIMEZONE,
    weekday: "long",
    day: "numeric",
    month: "short",
  }).format(new Date(`${civilDate}T12:00:00-05:00`));
  /**
   * Output:
   * @returns string — Día capitalizado en el idioma activo
   */
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Propósito: Formatea un instante ISO en fecha/hora local de Bogotá.
 */
export function formatDateTime(iso: string, locale: string = APP_LOCALE): string {
  /**
   * Output:
   * @returns string — Fecha y hora localizadas
   */
  return new Intl.DateTimeFormat(locale, {
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

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Propósito: Día de la semana y minutos desde medianoche en la zona horaria de la app, para
 * evaluar horarios de sedes sin depender de la zona del servidor ni del navegador.
 */
export function getZonedWeekdayAndMinutes(
  date = new Date(),
  timeZone: string = APP_TIMEZONE,
): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  /**
   * Output:
   * @returns object — day 0..6 (0 = domingo) y minutes 0..1439
   */
  return {
    day: WEEKDAY_INDEX[read("weekday")] ?? date.getDay(),
    minutes: Number(read("hour")) * 60 + Number(read("minute")),
  };
}

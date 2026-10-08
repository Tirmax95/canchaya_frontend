import {
  APP_UTC_OFFSET,
  BOOKING_CLOSE_HOUR,
  BOOKING_OPEN_HOUR,
  estimateReservationPrice,
} from "@/domain/booking";
import type { Reservation } from "@/domain/reservation";

export const STARTING_SOON_WINDOW_MINUTES = 60;
export const OPERATING_HOURS_PER_DAY = BOOKING_CLOSE_HOUR - BOOKING_OPEN_HOUR;

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const APP_UTC_OFFSET_HOURS = Number(APP_UTC_OFFSET.slice(0, 3));

export type CourtLiveStatus =
  | "in_play"
  | "awaiting_confirmation"
  | "starting_soon"
  | "free";

/** Subconjunto mínimo de la reserva que viaja al cliente: sin userId ni notas. */
export type OccupancyReservation = Pick<
  Reservation,
  "reservationId" | "fieldId" | "startTime" | "endTime" | "status"
>;

export interface CourtSnapshot {
  fieldId: number;
  status: CourtLiveStatus;
  currentReservation: OccupancyReservation | null;
  nextReservation: OccupancyReservation | null;
  /** Fracción 0..1 transcurrida del partido en curso. */
  matchProgress: number;
  minutesUntilNext: number | null;
  bookedHours: number;
  reservationCount: number;
}

export interface VenueOccupancySummary {
  courtCount: number;
  occupiedCourtCount: number;
  reservationCount: number;
  pendingReservationCount: number;
  bookedHours: number;
  /** Fracción 0..1 de horas reservadas sobre horas operables del día. */
  occupancyRatio: number;
}

/**
 * Propósito: Valida que un string sea una fecha civil YYYY-MM-DD real (rechaza 2026-02-31).
 */
export function isIsoCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    /**
     * Output:
     * @returns boolean — False si el formato no es YYYY-MM-DD
     */
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  /**
   * Output:
   * @returns boolean — True si la fecha existe en el calendario
   */
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

/**
 * Propósito: Devuelve el rango [inicio, fin) de un día civil en la zona de la app.
 */
export function getLocalDayBounds(dayIsoDate: string): { start: Date; end: Date } {
  if (!isIsoCalendarDate(dayIsoDate)) {
    /**
     * Output:
     * @throws Error — Fecha inválida, fail-fast antes de calcular rangos
     */
    throw new Error("La fecha debe usar formato YYYY-MM-DD");
  }
  const start = new Date(`${dayIsoDate}T00:00:00${APP_UTC_OFFSET}`);
  /**
   * Output:
   * @returns object — Límites del día
   *   - start: Date — 00:00 local
   *   - end: Date — 00:00 local del día siguiente
   */
  return { start, end: new Date(start.getTime() + 24 * MS_PER_HOUR) };
}

/**
 * Propósito: Suma o resta días a una fecha civil sin depender de la zona horaria del host.
 */
export function shiftIsoCalendarDate(dayIsoDate: string, dayOffset: number): string {
  if (!isIsoCalendarDate(dayIsoDate) || !Number.isInteger(dayOffset)) {
    /**
     * Output:
     * @throws Error — Fecha u offset inválidos
     */
    throw new Error("Fecha u offset de días inválido");
  }
  const shifted = new Date(`${dayIsoDate}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + dayOffset);
  /**
   * Output:
   * @returns string — Nueva fecha YYYY-MM-DD
   */
  return shifted.toISOString().slice(0, 10);
}

/**
 * Propósito: Construye el instante de una hora civil (admite fracciones, p. ej. 18.5 = 18:30).
 */
export function localHourToDate(dayIsoDate: string, hourOfDay: number): Date {
  const { start } = getLocalDayBounds(dayIsoDate);
  /**
   * Output:
   * @returns Date — Instante UTC de esa hora local
   */
  return new Date(start.getTime() + hourOfDay * MS_PER_HOUR);
}

/**
 * Propósito: Convierte un instante en horas transcurridas desde la medianoche local.
 */
export function toLocalHourOfDay(instant: Date | string): number {
  const date = typeof instant === "string" ? new Date(instant) : instant;
  const utcHours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  /**
   * Output:
   * @returns number — Hora local fraccionaria en [0, 24)
   */
  return (utcHours + APP_UTC_OFFSET_HOURS + 24) % 24;
}

/**
 * Propósito: Formatea una hora fraccionaria como HH:MM para labels de UI.
 */
export function formatHourOfDay(hourOfDay: number): string {
  const totalMinutes = Math.round(hourOfDay * 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  /**
   * Output:
   * @returns string — Hora local, p. ej. "18:30"
   */
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Propósito: Agrupa reservas activas por cancha en una pasada, ordenadas por inicio.
 * Usa Map para lookup O(1) al pintar cada cancha.
 */
export function groupActiveReservationsByField(
  reservations: OccupancyReservation[],
): Map<number, OccupancyReservation[]> {
  const reservationsByField = new Map<number, OccupancyReservation[]>();
  for (const reservation of reservations) {
    if (reservation.status === "cancelled") {
      continue;
    }
    const fieldReservations = reservationsByField.get(reservation.fieldId) ?? [];
    fieldReservations.push(reservation);
    reservationsByField.set(reservation.fieldId, fieldReservations);
  }
  for (const fieldReservations of reservationsByField.values()) {
    fieldReservations.sort((left, right) =>
      left.startTime.localeCompare(right.startTime),
    );
  }
  /**
   * Output:
   * @returns Map<number, OccupancyReservation[]> — fieldId → reservas no canceladas por hora de inicio
   */
  return reservationsByField;
}

/**
 * Propósito: Calcula el estado de una cancha en un instante dado (en juego, por confirmar,
 * arranca pronto o libre) y sus horas reservadas dentro del horario operable del día.
 * Espera reservas ya filtradas por cancha y ordenadas (ver groupActiveReservationsByField).
 */
export function buildCourtSnapshot(
  fieldId: number,
  sortedFieldReservations: OccupancyReservation[],
  referenceInstant: Date,
  dayIsoDate: string,
): CourtSnapshot {
  const referenceMs = referenceInstant.getTime();
  const operatingStartMs = localHourToDate(dayIsoDate, BOOKING_OPEN_HOUR).getTime();
  const operatingEndMs = localHourToDate(dayIsoDate, BOOKING_CLOSE_HOUR).getTime();

  let currentReservation: OccupancyReservation | null = null;
  let nextReservation: OccupancyReservation | null = null;
  let bookedMs = 0;

  for (const reservation of sortedFieldReservations) {
    const startMs = new Date(reservation.startTime).getTime();
    const endMs = new Date(reservation.endTime).getTime();
    bookedMs += Math.max(
      0,
      Math.min(endMs, operatingEndMs) - Math.max(startMs, operatingStartMs),
    );
    if (startMs <= referenceMs && referenceMs < endMs) {
      currentReservation = reservation;
    } else if (startMs > referenceMs && !nextReservation) {
      nextReservation = reservation;
    }
  }

  const minutesUntilNext = nextReservation
    ? Math.ceil(
        (new Date(nextReservation.startTime).getTime() - referenceMs) / MS_PER_MINUTE,
      )
    : null;

  let matchProgress = 0;
  if (currentReservation) {
    const startMs = new Date(currentReservation.startTime).getTime();
    const endMs = new Date(currentReservation.endTime).getTime();
    matchProgress = Math.min(1, Math.max(0, (referenceMs - startMs) / (endMs - startMs)));
  }

  /**
   * Output:
   * @returns CourtSnapshot — Estado de la cancha en el instante de referencia
   *   - status: CourtLiveStatus — in_play | awaiting_confirmation | starting_soon | free
   *   - currentReservation / nextReservation: reservas en curso y siguiente
   *   - matchProgress: number — 0..1 del partido actual
   *   - bookedHours: number — Horas reservadas en horario operable
   */
  return {
    fieldId,
    status: resolveCourtStatus(currentReservation, minutesUntilNext),
    currentReservation,
    nextReservation,
    matchProgress,
    minutesUntilNext,
    bookedHours: bookedMs / MS_PER_HOUR,
    reservationCount: sortedFieldReservations.length,
  };
}

/**
 * Propósito: Traduce reserva en curso y minutos a la siguiente en un estado visual único.
 */
function resolveCourtStatus(
  currentReservation: OccupancyReservation | null,
  minutesUntilNext: number | null,
): CourtLiveStatus {
  if (currentReservation) {
    /**
     * Output:
     * @returns CourtLiveStatus — Pendiente en curso = por confirmar; resto = en juego
     */
    return currentReservation.status === "pending" ? "awaiting_confirmation" : "in_play";
  }
  /**
   * Output:
   * @returns CourtLiveStatus — starting_soon si arranca dentro de la ventana, si no free
   */
  return minutesUntilNext !== null && minutesUntilNext <= STARTING_SOON_WINDOW_MINUTES
    ? "starting_soon"
    : "free";
}

/**
 * Propósito: True si la cancha tiene un partido ocupándola en el instante de referencia.
 */
export function isCourtOccupied(snapshot: Pick<CourtSnapshot, "status">): boolean {
  /**
   * Output:
   * @returns boolean — True para en juego o por confirmar
   */
  return snapshot.status === "in_play" || snapshot.status === "awaiting_confirmation";
}

/**
 * Propósito: Agrega los snapshots de una sede en KPIs de ocupación en una sola pasada.
 */
export function summarizeVenueOccupancy(
  snapshots: CourtSnapshot[],
  pendingReservationCount: number,
): VenueOccupancySummary {
  let occupiedCourtCount = 0;
  let reservationCount = 0;
  let bookedHours = 0;
  for (const snapshot of snapshots) {
    if (isCourtOccupied(snapshot)) {
      occupiedCourtCount += 1;
    }
    reservationCount += snapshot.reservationCount;
    bookedHours += snapshot.bookedHours;
  }
  const operableHours = snapshots.length * OPERATING_HOURS_PER_DAY;

  /**
   * Output:
   * @returns VenueOccupancySummary — KPIs de la sede
   *   - occupiedCourtCount: number — Canchas ocupadas en el instante
   *   - occupancyRatio: number — 0..1, 0 si la sede no tiene canchas
   */
  return {
    courtCount: snapshots.length,
    occupiedCourtCount,
    reservationCount,
    pendingReservationCount,
    bookedHours,
    occupancyRatio: operableHours > 0 ? Math.min(1, bookedHours / operableHours) : 0,
  };
}

/**
 * Propósito: Cuenta canchas ocupadas por cada hora operable para el mapa de calor del día.
 */
export function buildHourlyOccupancy(
  reservations: OccupancyReservation[],
  dayIsoDate: string,
): number[] {
  const busyFieldsPerHour = Array.from(
    { length: OPERATING_HOURS_PER_DAY },
    () => new Set<number>(),
  );
  for (const reservation of reservations) {
    if (reservation.status === "cancelled") {
      continue;
    }
    const startMs = new Date(reservation.startTime).getTime();
    const endMs = new Date(reservation.endTime).getTime();
    for (let slotIndex = 0; slotIndex < OPERATING_HOURS_PER_DAY; slotIndex += 1) {
      const slotStartMs = localHourToDate(
        dayIsoDate,
        BOOKING_OPEN_HOUR + slotIndex,
      ).getTime();
      if (startMs < slotStartMs + MS_PER_HOUR && slotStartMs < endMs) {
        busyFieldsPerHour[slotIndex].add(reservation.fieldId);
      }
    }
  }
  /**
   * Output:
   * @returns number[] — Canchas distintas ocupadas por franja (índice 0 = BOOKING_OPEN_HOUR)
   */
  return busyFieldsPerHour.map((busyFields) => busyFields.size);
}

/**
 * Propósito: Devuelve la hora operable con más canchas ocupadas; útil al abrir días pasados o futuros.
 */
export function findPeakHour(hourlyOccupancy: number[]): number {
  let peakIndex = 0;
  for (let slotIndex = 1; slotIndex < hourlyOccupancy.length; slotIndex += 1) {
    if (hourlyOccupancy[slotIndex] > hourlyOccupancy[peakIndex]) {
      peakIndex = slotIndex;
    }
  }
  /**
   * Output:
   * @returns number — Hora local entera de mayor ocupación (BOOKING_OPEN_HOUR si no hay reservas)
   */
  return BOOKING_OPEN_HOUR + peakIndex;
}

/**
 * Propósito: Estima ingresos del día sumando precio por hora de cada reserva activa.
 * Usa Map de precios para evitar búsquedas O(n) por reserva.
 */
export function estimateDayRevenue(
  reservations: OccupancyReservation[],
  pricePerHourByFieldId: Map<number, number>,
): number {
  let revenue = 0;
  for (const reservation of reservations) {
    const pricePerHour = pricePerHourByFieldId.get(reservation.fieldId);
    if (reservation.status === "cancelled" || pricePerHour === undefined) {
      continue;
    }
    revenue += estimateReservationPrice(
      reservation.startTime,
      reservation.endTime,
      pricePerHour,
    );
  }
  /**
   * Output:
   * @returns number — Ingreso estimado COP, nunca negativo
   */
  return revenue;
}

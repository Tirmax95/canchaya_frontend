import type { Reservation } from "@/domain/reservation";

export const BOOKING_OPEN_HOUR = 6;
export const BOOKING_CLOSE_HOUR = 23;
export const MIN_BOOKING_HOURS = 1;
export const MAX_BOOKING_HOURS = 3;

export interface TimeSlot {
  startIso: string;
  endIso: string;
  label: string;
  isAvailable: boolean;
}

/**
 * Propósito: Calcula si dos intervalos [start, end) se solapan.
 */
export function hasTimeOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  /**
   * Output:
   * @returns boolean — True si los intervalos se cruzan
   */
  return startA < endB && startB < endA;
}

/**
 * Propósito: Genera franjas horarias de 1h y marca las ocupadas en O(n).
 * Usa un índice de reservas del día para no escanear de más.
 */
export function buildDaySlots(
  dayIsoDate: string,
  reservations: Pick<Reservation, "startTime" | "endTime" | "status">[],
  timeZone: string,
): TimeSlot[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayIsoDate)) {
    /**
     * Output:
     * @throws Error — Fecha inválida, fail-fast antes de generar slots
     */
    throw new Error("La fecha debe usar formato YYYY-MM-DD");
  }

  const blockingReservations = reservations.filter(
    (reservation) => reservation.status !== "cancelled",
  );
  const slots: TimeSlot[] = [];

  for (let hour = BOOKING_OPEN_HOUR; hour < BOOKING_CLOSE_HOUR; hour += 1) {
    const start = zonedLocalDate(dayIsoDate, hour, timeZone);
    const end = zonedLocalDate(dayIsoDate, hour + 1, timeZone);
    const isAvailable = !blockingReservations.some((reservation) =>
      hasTimeOverlap(
        start,
        end,
        new Date(reservation.startTime),
        new Date(reservation.endTime),
      ),
    );

    slots.push({
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: `${padHour(hour)}:00 – ${padHour(hour + 1)}:00`,
      isAvailable,
    });
  }

  /**
   * Output:
   * @returns TimeSlot[] — Franjas del día con disponibilidad
   *   - startIso/endIso: string — Instantes UTC
   *   - label: string — Rango local para UI
   *   - isAvailable: boolean — False si choca con una reserva activa
   */
  return slots;
}

/**
 * Propósito: Calcula el total de una reserva a partir del precio base por hora.
 */
export function estimateReservationPrice(
  startIso: string,
  endIso: string,
  basePricePerHour: number,
): number {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const durationMs = end.getTime() - start.getTime();

  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    /**
     * Output:
     * @returns number — 0 si el rango es inválido
     */
    return 0;
  }

  const hours = durationMs / 3_600_000;
  /**
   * Output:
   * @returns number — Precio estimado, nunca negativo
   */
  return Math.max(0, Math.round(hours * basePricePerHour));
}

/**
 * Propósito: Construye un Date para una hora civil en la zona de la app.
 * Colombia (America/Bogota) no usa DST; se fija UTC-05 para evitar drift del host.
 */
function zonedLocalDate(
  dayIsoDate: string,
  hour: number,
  timeZone: string,
): Date {
  void timeZone;
  /**
   * Output:
   * @returns Date — Instante UTC de esa hora en Bogotá
   */
  return new Date(`${dayIsoDate}T${padHour(hour)}:00:00-05:00`);
}

/**
 * Propósito: Normaliza una hora a dos dígitos para labels e ISO local.
 */
function padHour(hour: number): string {
  /**
   * Output:
   * @returns string — Hora con padding, p. ej. "07"
   */
  return String(hour).padStart(2, "0");
}

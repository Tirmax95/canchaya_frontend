export const RESERVATION_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

export interface Reservation {
  reservationId: number;
  userId: number;
  fieldId: number;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  /** Hasta cuándo la reserva pendiente aparta el horario; null = no vence. */
  expiresAt?: string | null;
  /** Cuándo se canceló por vencida; null si no venció. */
  expiredAt?: string | null;
}

/**
 * Propósito: True si la reserva se canceló sola porque venció su plazo.
 */
export function isExpiredReservation(reservation: Pick<Reservation, "status" | "expiredAt">): boolean {
  /**
   * Output:
   * @returns boolean — Cancelada por vencimiento
   */
  return reservation.status === "cancelled" && Boolean(reservation.expiredAt);
}

export interface ReservationView extends Reservation {
  fieldName: string;
  establishmentName: string;
  establishmentId: number | null;
  organizationId: number | null;
  organizationName: string | null;
  priceEstimate: number;
}

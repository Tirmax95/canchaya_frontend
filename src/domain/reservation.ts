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
}

export interface ReservationView extends Reservation {
  fieldName: string;
  establishmentName: string;
  establishmentId: number | null;
  organizationId: number | null;
  organizationName: string | null;
  priceEstimate: number;
}

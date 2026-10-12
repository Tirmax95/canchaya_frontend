import { getEstablishmentById } from "@/data/establishment.repository";
import { getFieldById, listFields } from "@/data/field.repository";
import {
  listReservations,
  listReservationsByUser,
} from "@/data/reservation.repository";
import { estimateReservationPrice } from "@/domain/booking";
import type { Field } from "@/domain/field";
import type { Reservation, ReservationView } from "@/domain/reservation";
import { listEstablishments } from "@/data/establishment.repository";

/**
 * Propósito: Enriquece reservas con sede, cancha y precio en O(n) con Maps.
 * Precarga catálogos en paralelo para evitar N+1.
 */
export async function toReservationViews(
  reservations: Reservation[],
): Promise<ReservationView[]> {
  if (reservations.length === 0) {
    /**
     * Output:
     * @returns ReservationView[] — Lista vacía
     */
    return [];
  }

  const [fields, establishments] = await Promise.all([
    listFields(),
    listEstablishments(),
  ]);
  const fieldsById = new Map(fields.map((field) => [field.id, field]));
  const establishmentsById = new Map(
    establishments.map((establishment) => [
      establishment.establishmentId,
      establishment,
    ]),
  );

  /**
   * Output:
   * @returns ReservationView[] — Reservas listas para UI
   */
  return reservations.map((reservation) => {
    const field = fieldsById.get(reservation.fieldId);
    const establishment = field
      ? establishmentsById.get(field.establishmentId)
      : undefined;
    const organizationId = establishment?.organizationId ?? null;
    return {
      ...reservation,
      fieldName: field ? `Cancha ${field.numberField}` : `Cancha #${reservation.fieldId}`,
      establishmentName: establishment?.name ?? "Sede",
      establishmentId: field?.establishmentId ?? establishment?.establishmentId ?? null,
      organizationId: organizationId && organizationId > 0 ? organizationId : null,
      organizationName: establishment?.organizationName ?? null,
      priceEstimate: field
        ? estimateReservationPrice(
            reservation.startTime,
            reservation.endTime,
            field.basePricePerHour,
          )
        : 0,
    };
  });
}

/**
 * Propósito: Carga las reservas del usuario autenticado ya enriquecidas.
 */
export async function getMyReservationViews(
  userId: number,
): Promise<ReservationView[]> {
  const reservations = await listReservationsByUser(userId);
  /**
   * Output:
   * @returns ReservationView[] — Agenda del usuario
   */
  return toReservationViews(reservations);
}

/**
 * Propósito: Carga el inventario de reservas para staff.
 */
export async function getStaffReservationViews(): Promise<ReservationView[]> {
  const reservations = await listReservations();
  /**
   * Output:
   * @returns ReservationView[] — Todas las reservas enriquecidas
   */
  return toReservationViews(reservations);
}

/**
 * Propósito: Carga cancha + sede para el flujo de reserva. Falla si falta la sede.
 */
export async function getFieldBookingContext(fieldId: number): Promise<{
  field: Field;
  establishmentName: string;
}> {
  const field = await getFieldById(fieldId);
  const establishment = await getEstablishmentById(field.establishmentId);

  /**
   * Output:
   * @returns object — Contexto de reserva
   *   - field: Field
   *   - establishmentName: string
   */
  return {
    field,
    establishmentName: establishment.name,
  };
}

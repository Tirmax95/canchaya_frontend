import { listManagedEstablishments } from "@/data/establishment.repository";
import { listManagedFields } from "@/data/field.repository";
import { listReservations } from "@/data/reservation.repository";
import { hasTimeOverlap } from "@/domain/booking";
import type { Establishment } from "@/domain/establishment";
import type { Field } from "@/domain/field";
import {
  getLocalDayBounds,
  isIsoCalendarDate,
  type OccupancyReservation,
} from "@/domain/venue-occupancy";
import { toDateInputValue } from "@/shared/lib/datetime";

export type VenueMapEstablishment = Pick<
  Establishment,
  "establishmentId" | "name" | "address"
>;

export type VenueMapField = Pick<
  Field,
  "id" | "establishmentId" | "numberField" | "description" | "basePricePerHour"
>;

export interface VenueMapData {
  dayIsoDate: string;
  isToday: boolean;
  /** Instante del render en servidor; el cliente arranca su reloj desde aquí sin hydration mismatch. */
  renderedAtIso: string;
  establishments: VenueMapEstablishment[];
  fields: VenueMapField[];
  reservations: OccupancyReservation[];
}

/**
 * Propósito: Carga sedes, canchas y reservas del día que el staff puede administrar para el mapa 3D.
 * Tres fetches en paralelo (sin N+1); las reservas se acotan a canchas del tenant para evitar
 * filtrar ocupación de otros dueños, y se recortan a campos no sensibles (sin userId ni notas).
 */
export async function getVenueMapData(requestedDay?: string): Promise<VenueMapData> {
  const todayIsoDate = toDateInputValue();
  const dayIsoDate = isIsoCalendarDate(requestedDay) ? requestedDay : todayIsoDate;
  const { start: dayStart, end: dayEnd } = getLocalDayBounds(dayIsoDate);

  const [establishments, fields, reservations] = await Promise.all([
    listManagedEstablishments(),
    listManagedFields(),
    listReservations(),
  ]);

  const managedFieldIds = new Set(fields.map((field) => field.id));
  const dayReservations: OccupancyReservation[] = [];
  for (const reservation of reservations) {
    if (
      reservation.status === "cancelled" ||
      !managedFieldIds.has(reservation.fieldId) ||
      !hasTimeOverlap(
        dayStart,
        dayEnd,
        new Date(reservation.startTime),
        new Date(reservation.endTime),
      )
    ) {
      continue;
    }
    dayReservations.push({
      reservationId: reservation.reservationId,
      fieldId: reservation.fieldId,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      status: reservation.status,
    });
  }

  /**
   * Output:
   * @returns VenueMapData — Datos mínimos para pintar el complejo
   *   - dayIsoDate: string — Día consultado (hoy si el parámetro es inválido)
   *   - isToday: boolean — Habilita el modo "en vivo"
   *   - establishments / fields: catálogo del tenant sin datos de contacto
   *   - reservations: OccupancyReservation[] — Reservas no canceladas que tocan ese día
   */
  return {
    dayIsoDate,
    isToday: dayIsoDate === todayIsoDate,
    renderedAtIso: new Date().toISOString(),
    establishments: establishments.map((establishment) => ({
      establishmentId: establishment.establishmentId,
      name: establishment.name,
      address: establishment.address,
    })),
    fields: fields.map((field) => ({
      id: field.id,
      establishmentId: field.establishmentId,
      numberField: field.numberField,
      description: field.description,
      basePricePerHour: field.basePricePerHour,
    })),
    reservations: dayReservations,
  };
}

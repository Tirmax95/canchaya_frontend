import { requestBackend } from "@/core/http/backend-client";
import { toReservation } from "@/data/mappers";
import type { CreateReservationInput } from "@/domain/schemas";
import type { Reservation } from "@/domain/reservation";

/**
 * Propósito: Normaliza una lista cruda de reservas.
 */
function mapReservations(payload: unknown): Reservation[] {
  const items = Array.isArray(payload) ? payload : [];
  /**
   * Output:
   * @returns Reservation[] — Reservas normalizadas
   */
  return items.map((item) => toReservation(item as object));
}

/**
 * Propósito: Lista todas las reservas. Pensado para staff, no para clientes.
 */
export async function listReservations(): Promise<Reservation[]> {
  const payload = await requestBackend<unknown>({ path: "/reservations" });
  /**
   * Output:
   * @returns Reservation[] — Inventario completo
   */
  return mapReservations(payload);
}

/**
 * Propósito: Lista reservas de un usuario en una sola query del backend.
 */
export async function listReservationsByUser(
  userId: number,
): Promise<Reservation[]> {
  const payload = await requestBackend<unknown>({
    path: `/reservations/user/${userId}`,
  });
  /**
   * Output:
   * @returns Reservation[] — Reservas del usuario
   */
  return mapReservations(payload);
}

/**
 * Propósito: Lista reservas de una cancha para armar disponibilidad sin N+1.
 */
export async function listReservationsByField(
  fieldId: number,
): Promise<Reservation[]> {
  const payload = await requestBackend<unknown>({
    path: `/reservations/field/${fieldId}`,
  });
  /**
   * Output:
   * @returns Reservation[] — Reservas de la cancha
   */
  return mapReservations(payload);
}

/**
 * Propósito: Crea una reserva. El userId lo inyecta el BFF, nunca el cliente.
 */
export async function createReservation(
  userId: number,
  input: CreateReservationInput,
): Promise<Reservation> {
  const payload = await requestBackend<unknown>({
    path: "/reservations",
    method: "POST",
    body: {
      userId,
      fieldId: input.fieldId,
      startTime: input.startTime,
      endTime: input.endTime,
      notes: input.notes || undefined,
    },
  });

  /**
   * Output:
   * @returns Reservation — Reserva pending creada
   */
  return toReservation(payload as object);
}

/**
 * Propósito: Cancela una reserva existente.
 */
export async function cancelReservation(
  reservationId: number,
): Promise<Reservation> {
  const payload = await requestBackend<unknown>({
    path: `/reservations/${reservationId}/cancel`,
    method: "PUT",
  });
  /**
   * Output:
   * @returns Reservation — Reserva cancelada
   */
  return toReservation(payload as object);
}

/**
 * Propósito: Confirma una reserva pending. Solo staff debería invocarlo.
 */
export async function confirmReservation(
  reservationId: number,
): Promise<Reservation> {
  const payload = await requestBackend<unknown>({
    path: `/reservations/${reservationId}/confirm`,
    method: "PUT",
  });
  /**
   * Output:
   * @returns Reservation — Reserva confirmada
   */
  return toReservation(payload as object);
}

/**
 * Propósito: Obtiene una reserva por id.
 */
export async function getReservationById(
  reservationId: number,
): Promise<Reservation> {
  const payload = await requestBackend<unknown>({
    path: `/reservations/${reservationId}`,
  });
  /**
   * Output:
   * @returns Reservation — Reserva encontrada
   */
  return toReservation(payload as object);
}

import { isStaff } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  createReservation,
  listReservations,
  listReservationsByUser,
} from "@/data/reservation.repository";
import { createReservationSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Lista reservas propias o, si es staff, el inventario completo.
 */
export async function GET() {
  return handleRoute(async () => {
    const session = await requireSession();
    const reservations = isStaff(session)
      ? await listReservations()
      : await listReservationsByUser(session.id);
    return { reservations };
  }, "No se pudieron cargar las reservas");
}

/**
 * Propósito: Crea reserva forzando userId de la sesión para evitar IDOR.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await requireSession();
    const input = parseSchema(
      createReservationSchema,
      await readJsonBody(request),
    );
    const reservation = await createReservation(session.id, input);
    return { reservation };
  }, "No se pudo crear la reserva");
}

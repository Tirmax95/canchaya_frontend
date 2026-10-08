import { canManageReservation } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { handleRoute } from "@/core/http/route";
import {
  cancelReservation,
  getReservationById,
} from "@/data/reservation.repository";

/**
 * Propósito: Cancela una reserva solo si el usuario es dueño o staff.
 */
export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const session = await requireSession();
    const reservationId = Number((await context.params).id);
    const reservation = await getReservationById(reservationId);
    if (!canManageReservation(session, reservation.userId)) {
      throw new AppError("FORBIDDEN", "No puedes cancelar esta reserva", 403);
    }
    return { reservation: await cancelReservation(reservationId) };
  }, "No se pudo cancelar la reserva");
}

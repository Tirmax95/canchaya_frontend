import { requireStaff } from "@/core/auth/guards";
import { handleRoute } from "@/core/http/route";
import { confirmReservation } from "@/data/reservation.repository";

/**
 * Propósito: Confirma una reserva pending. Solo staff.
 */
export async function PUT(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireStaff();
    const reservationId = Number((await context.params).id);
    return { reservation: await confirmReservation(reservationId) };
  }, "No se pudo confirmar la reserva");
}

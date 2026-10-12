import { requireSession } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
import { confirmReservationPaymentLocally } from "@/data/payment.repository";

/**
 * Propósito: Confirma un cobro sandbox o llave en modo prueba.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSession();
    const reservationId = parsePositiveIntParam((await context.params).id, "reserva");
    /**
     * Output:
     * @returns PublicPaymentIntent — Intent aprobado
     */
    return confirmReservationPaymentLocally(reservationId);
  }, "No se pudo confirmar el pago");
}

import { requireSession } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { createReservationCheckout } from "@/data/payment.repository";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const checkoutSchema = z.object({
  methodId: z.number().int().positive(),
});

/**
 * Propósito: Abre el checkout de la reserva del jugador autenticado.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSession();
    const reservationId = parsePositiveIntParam((await context.params).id, "reserva");
    const body = parseSchema(checkoutSchema, await readJsonBody(request));
    /**
     * Output:
     * @returns PublicPaymentIntent — Checkout
     */
    return createReservationCheckout(reservationId, body.methodId);
  }, "No se pudo iniciar el pago");
}

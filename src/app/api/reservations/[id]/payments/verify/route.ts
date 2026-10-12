import { requireSession } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { verifyReservationPayment } from "@/data/payment.repository";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const verifySchema = z.object({
  transactionId: z.string().regex(/^[A-Za-z0-9-]{4,64}$/, "Transacción inválida"),
});

/**
 * Propósito: Verifica el retorno de Wompi para una reserva propia.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSession();
    const reservationId = parsePositiveIntParam((await context.params).id, "reserva");
    const body = parseSchema(verifySchema, await readJsonBody(request));
    /**
     * Output:
     * @returns PublicPaymentIntent — Estado del cobro
     */
    return verifyReservationPayment(reservationId, body.transactionId);
  }, "No se pudo verificar el pago");
}

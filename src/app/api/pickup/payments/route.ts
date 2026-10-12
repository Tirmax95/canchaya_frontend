import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  approveSandboxPayment,
  checkoutPickup,
  listMyPayments,
} from "@/data/pickup.repository";
import { parseSchema, pickupApproveSchema, pickupCheckoutSchema } from "@/domain/schemas";

/**
 * Propósito: Historial de pagos del actor autenticado.
 */
export async function GET() {
  return handleRoute(async () => {
    await requireSession();
    /**
     * Output:
     * @returns { payments } — Últimos 50 propios
     */
    return { payments: await listMyPayments() };
  }, "No se pudieron cargar tus pagos");
}

/**
 * Propósito: Checkout o aprobación sandbox del pago propio.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const body = await readJsonBody(request);
    if (body && typeof body === "object" && "action" in body) {
      const { paymentId } = parseSchema(pickupApproveSchema, body);
      return { payment: await approveSandboxPayment(paymentId) };
    }
    const { matchId } = parseSchema(pickupCheckoutSchema, body);
    return { payment: await checkoutPickup(matchId) };
  }, "No se pudo procesar el pago");
}

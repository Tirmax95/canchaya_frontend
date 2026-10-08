import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import {
  approveSandboxPayment,
  checkoutPickup,
  listMyPayments,
} from "@/data/pickup.repository";
import { AppError } from "@/core/errors/app-error";

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
    const body = (await readJsonBody(request)) as {
      matchId?: number;
      paymentId?: number;
      action?: string;
    };
    if (body.action === "approve" && body.paymentId) {
      return { payment: await approveSandboxPayment(Number(body.paymentId)) };
    }
    if (!body.matchId) {
      throw new AppError("VALIDATION", "Falta el partido a pagar", 400);
    }
    return { payment: await checkoutPickup(Number(body.matchId)) };
  }, "No se pudo procesar el pago");
}

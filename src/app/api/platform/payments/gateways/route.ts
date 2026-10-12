import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute } from "@/core/http/route";
import { listPaymentGateways } from "@/data/payment.repository";

/**
 * Propósito: Catálogo de pasarelas para el panel del super admin.
 */
export async function GET() {
  return handleRoute(async () => {
    await requireSuperAdmin();
    /**
     * Output:
     * @returns object — { gateways, pendingIntents }
     */
    return listPaymentGateways();
  }, "No se pudieron cargar las pasarelas de pago");
}

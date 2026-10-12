import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { settleManualPaymentIntent } from "@/data/payment.repository";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const settleSchema = z.object({
  reference: z.string().regex(/^[A-Z]{3}-\d{1,10}-[0-9a-f]{12}$/, "Referencia inválida"),
});

/**
 * Propósito: Confirma a mano una transferencia llave/Bre-B.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const body = parseSchema(settleSchema, await readJsonBody(request));
    await settleManualPaymentIntent(body.reference);
    /**
     * Output:
     * @returns { ok } — Liquidado
     */
    return { ok: true };
  }, "No se pudo confirmar el pago");
}

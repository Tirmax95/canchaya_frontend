import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { togglePaymentMethod } from "@/data/payment.repository";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const toggleSchema = z.object({ is_enabled: z.boolean() });

/**
 * Propósito: Enciende o apaga un medio (PSE, Nequi, tarjeta…) para el jugador.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const methodId = parsePositiveIntParam((await context.params).id, "método de pago");
    const body = parseSchema(toggleSchema, await readJsonBody(request));
    await togglePaymentMethod(methodId, body.is_enabled);
    /**
     * Output:
     * @returns { ok } — Flag actualizado
     */
    return { ok: true };
  }, "No se pudo actualizar el medio de pago");
}

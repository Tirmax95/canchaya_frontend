import { AppError } from "@/core/errors/app-error";
import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { updatePaymentGateway } from "@/data/payment.repository";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const GATEWAY_CODE_PATTERN = /^[a-z][a-z0-9_]{1,30}$/;

const updateGatewaySchema = z.object({
  is_enabled: z.boolean().optional(),
  is_test_mode: z.boolean().optional(),
  public_config: z.record(z.string(), z.string()).optional(),
});

/**
 * Propósito: Enciende/apaga una pasarela y guarda config pública (llave Bre-B).
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const { code } = await context.params;
    if (!GATEWAY_CODE_PATTERN.test(code)) {
      /**
       * Output:
       * @throws AppError — Código fuera de allowlist
       */
      throw new AppError("VALIDATION", "Pasarela inválida", 400);
    }
    const body = parseSchema(updateGatewaySchema, await readJsonBody(request));
    await updatePaymentGateway(code, {
      isEnabled: body.is_enabled,
      isTestMode: body.is_test_mode,
      publicConfig: body.public_config,
    });
    /**
     * Output:
     * @returns { ok } — Actualizado
     */
    return { ok: true };
  }, "No se pudo actualizar la pasarela");
}

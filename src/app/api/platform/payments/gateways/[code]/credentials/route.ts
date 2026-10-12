import { AppError } from "@/core/errors/app-error";
import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { updatePaymentGatewayCredentials } from "@/data/payment.repository";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const GATEWAY_CODE_PATTERN = /^[a-z][a-z0-9_]{1,30}$/;
const MAX_CREDENTIAL_LENGTH = 200;

const credentialsSchema = z.object({
  credentials: z
    .record(z.string().max(40), z.string().max(MAX_CREDENTIAL_LENGTH))
    .refine((record) => Object.keys(record).length <= 12, "Demasiados campos"),
});

/**
 * Propósito: Guarda llaves de una pasarela. El backend las cifra; aquí solo se reenvían.
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
    const body = parseSchema(credentialsSchema, await readJsonBody(request));
    await updatePaymentGatewayCredentials(code, body.credentials);
    /**
     * Output:
     * @returns { ok } — Guardado
     */
    return { ok: true };
  }, "No se pudieron guardar las llaves");
}

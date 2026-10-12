import { requireSession } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import {
  confirmRegistrationPaymentLocally,
  createRegistrationCheckout,
  withdrawRegistration,
} from "@/data/event.repository";
import { parseSchema, registrationActionSchema } from "@/domain/schemas";

/**
 * Propósito: Acciones del capitán sobre su inscripción: retirarse, pagar o confirmar un pago
 * de prueba. El backend valida que la inscripción sea suya (anti-IDOR).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ registrationId: string }> },
) {
  return handleRoute(async () => {
    await requireSession();
    const registrationId = parsePositiveIntParam(
      (await context.params).registrationId,
      "inscripción",
    );
    const input = parseSchema(registrationActionSchema, await readJsonBody(request));
    if (input.action === "withdraw") {
      await withdrawRegistration(registrationId);
      return { ok: true };
    }
    if (input.action === "checkout") {
      return { intent: await createRegistrationCheckout(registrationId, input.method_id) };
    }
    return { intent: await confirmRegistrationPaymentLocally(registrationId) };
  }, "No se pudo actualizar la inscripción");
}

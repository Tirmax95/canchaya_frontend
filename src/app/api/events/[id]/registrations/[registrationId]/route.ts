import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { manageRegistration } from "@/data/event.repository";
import { manageRegistrationSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Aprobar, rechazar, marcar pago/devolución o sembrar una inscripción.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; registrationId: string }> },
) {
  return handleRoute(async () => {
    await requireStaff();
    const params = await context.params;
    const eventId = parsePositiveIntParam(params.id, "evento");
    const registrationId = parsePositiveIntParam(params.registrationId, "inscripción");
    const input = parseSchema(manageRegistrationSchema, await readJsonBody(request));
    await manageRegistration(eventId, registrationId, input);
    return { ok: true };
  }, "No se pudo actualizar la inscripción");
}

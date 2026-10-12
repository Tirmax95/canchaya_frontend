import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { runEventAction, updateEvent } from "@/data/event.repository";
import { eventActionSchema, eventInputSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Edita el evento (solo staff del tenant; lo valida el backend).
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireStaff();
    const eventId = parsePositiveIntParam((await context.params).id, "evento");
    const input = parseSchema(eventInputSchema, await readJsonBody(request));
    await updateEvent(eventId, input);
    return { ok: true };
  }, "No se pudo guardar el evento");
}

/**
 * Propósito: Acciones de ciclo de vida y de competencia (publicar, iniciar, cancelar…).
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireStaff();
    const eventId = parsePositiveIntParam((await context.params).id, "evento");
    const input = parseSchema(eventActionSchema, await readJsonBody(request));
    await runEventAction(eventId, input);
    return { ok: true };
  }, "No se pudo actualizar el evento");
}

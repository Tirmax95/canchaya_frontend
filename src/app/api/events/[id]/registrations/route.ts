import { requireSession } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { registerTeam } from "@/data/event.repository";
import { parseSchema, registerTeamSchema } from "@/domain/schemas";

/**
 * Propósito: Inscribe un equipo. El backend exige que el usuario de la sesión sea el capitán.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireSession();
    const eventId = parsePositiveIntParam((await context.params).id, "evento");
    const input = parseSchema(registerTeamSchema, await readJsonBody(request));
    return { registration: await registerTeam(eventId, input) };
  }, "No se pudo inscribir el equipo");
}

import { requireStaff } from "@/core/auth/guards";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { clearEventMatch, updateEventMatch } from "@/data/event.repository";
import { matchUpdateSchema, parseSchema } from "@/domain/schemas";

type MatchRouteContext = { params: Promise<{ id: string; matchId: string }> };

/**
 * Propósito: Ids de ruta validados.
 */
async function readIds(context: MatchRouteContext) {
  const params = await context.params;
  /**
   * Output:
   * @returns object — eventId y matchId
   */
  return {
    eventId: parsePositiveIntParam(params.id, "evento"),
    matchId: parsePositiveIntParam(params.matchId, "partido"),
  };
}

/**
 * Propósito: Programa el partido en cancha o carga su resultado.
 */
export async function PUT(request: Request, context: MatchRouteContext) {
  return handleRoute(async () => {
    await requireStaff();
    const { eventId, matchId } = await readIds(context);
    const input = parseSchema(matchUpdateSchema, await readJsonBody(request));
    await updateEventMatch(eventId, matchId, input);
    return { ok: true };
  }, "No se pudo actualizar el partido");
}

/**
 * Propósito: Quita programación (`?kind=schedule`) o resultado (`?kind=result`).
 */
export async function DELETE(request: Request, context: MatchRouteContext) {
  return handleRoute(async () => {
    await requireStaff();
    const { eventId, matchId } = await readIds(context);
    const kind = new URL(request.url).searchParams.get("kind");
    if (kind !== "schedule" && kind !== "result") {
      throw new AppError("VALIDATION", "Acción inválida", 400);
    }
    await clearEventMatch(eventId, matchId, kind);
    return { ok: true };
  }, "No se pudo actualizar el partido");
}

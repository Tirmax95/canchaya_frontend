import { AppError } from "@/core/errors/app-error";
import { requireSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import {
  cancelPickupMatch,
  confirmPickupMatch,
  getPickupMatch,
  publishPickupMatch,
  startPickupMatch,
} from "@/data/pickup.repository";

/**
 * Propósito: Detalle público de un partido convocado.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const { id } = await context.params;
    return { match: await getPickupMatch(Number(id)) };
  }, "No se pudo cargar el partido");
}

/**
 * Propósito: Acciones del organizador. El backend revalida ownership.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSession();
    const { id } = await context.params;
    const matchId = Number(id);
    const url = new URL(request.url);
    const action = url.searchParams.get("action");
    if (action === "publish") {
      return { match: await publishPickupMatch(matchId) };
    }
    if (action === "cancel") {
      return { match: await cancelPickupMatch(matchId) };
    }
    if (action === "confirm") {
      return { match: await confirmPickupMatch(matchId) };
    }
    if (action === "start") {
      return { match: await startPickupMatch(matchId) };
    }
    throw new AppError("VALIDATION", "Acción de partido no soportada", 400);
  }, "No se pudo actualizar el partido");
}

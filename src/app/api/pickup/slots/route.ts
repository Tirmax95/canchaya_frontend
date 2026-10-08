import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { holdPickupSlot } from "@/data/pickup.repository";
import { holdSlotSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Reserva un cupo. El userId lo pone el backend, no el cliente.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const input = parseSchema(holdSlotSchema, await readJsonBody(request));
    return holdPickupSlot(input.matchId);
  }, "No se pudo reservar el cupo");
}

import { requireStaff } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { createEvent } from "@/data/event.repository";
import { createEventSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Crea un evento en borrador. El backend vuelve a exigir el módulo 'events' y que
 * la sede sea del tenant del actor.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireStaff();
    const input = parseSchema(createEventSchema, await readJsonBody(request));
    return { event: await createEvent(input) };
  }, "No se pudo crear el evento");
}

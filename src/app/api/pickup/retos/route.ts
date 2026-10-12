import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { createReto, listMyRetos, respondReto } from "@/data/pickup.repository";
import { createRetoSchema, parseSchema, retoActionSchema } from "@/domain/schemas";

/**
 * Propósito: Lista retos de los equipos del actor.
 */
export async function GET() {
  return handleRoute(async () => {
    await requireSession();
    return { retos: await listMyRetos() };
  }, "No se pudieron cargar los retos");
}

/**
 * Propósito: Crea o responde un reto. El backend valida que seas capitán.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const body = await readJsonBody(request);
    if (body && typeof body === "object" && "action" in body) {
      const action = parseSchema(retoActionSchema, body);
      return { reto: await respondReto(action.retoId, action.action === "accept") };
    }
    const input = parseSchema(createRetoSchema, body);
    return { reto: await createReto(input) };
  }, "No se pudo enviar el reto");
}

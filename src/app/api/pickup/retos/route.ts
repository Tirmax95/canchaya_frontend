import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { createReto, listMyRetos, respondReto } from "@/data/pickup.repository";
import { createRetoSchema, parseSchema } from "@/domain/schemas";

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
    const body = (await readJsonBody(request)) as {
      action?: string;
      retoId?: number;
    };
    if (body.action === "accept" && body.retoId) {
      return { reto: await respondReto(body.retoId, true) };
    }
    if (body.action === "decline" && body.retoId) {
      return { reto: await respondReto(body.retoId, false) };
    }
    const input = parseSchema(createRetoSchema, body);
    return { reto: await createReto(input) };
  }, "No se pudo enviar el reto");
}

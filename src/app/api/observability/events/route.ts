import { handleRoute, readJsonBody } from "@/core/http/route";
import { getSession } from "@/core/auth/session";
import { requestBackend } from "@/core/http/backend-client";
import { parseSchema } from "@/domain/schemas";
import { z } from "zod";

const clientErrorSchema = z.object({
  source: z.literal("frontend"),
  message: z.string().trim().min(1).max(500),
  name: z.string().trim().max(120).optional(),
  stack: z.string().max(4000).optional(),
  pagePath: z.string().trim().max(300).optional(),
  correlationId: z.string().trim().max(64).optional(),
});

/**
 * Propósito: Recibe un error del navegador y lo reenvía al backend. El origen lo fija
 * el BFF (frontend); no se acepta source=backend desde el cliente.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — 204
   */
  return handleRoute(async () => {
    const body = parseSchema(clientErrorSchema, await readJsonBody(request));
    const session = await getSession();
    await requestBackend({
      path: "/observability/events",
      method: "POST",
      sessionId: session?.sessionId,
      body,
    });
    /**
     * Output:
     * @returns undefined — 204
     */
    return undefined;
  }, "No se pudo registrar el error", { skipErrorLog: true });
}

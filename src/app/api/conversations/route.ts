import { requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { listConversations, openConversation } from "@/data/messaging.repository";
import { openConversationSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Bandeja de conversaciones del usuario.
 */
export async function GET() {
  return handleRoute(async () => {
    await requireSession();
    /**
     * Output:
     * @returns { conversations } — Conversaciones recientes
     */
    return { conversations: await listConversations() };
  }, "No se pudieron cargar los mensajes");
}

/**
 * Propósito: Abre (o crea) la conversación de una reserva o inscripción.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireSession();
    const input = parseSchema(openConversationSchema, await readJsonBody(request));
    /**
     * Output:
     * @returns { conversation, viewerSide } — Conversación lista
     */
    return await openConversation(input.subjectType, input.subjectId);
  }, "No se pudo abrir la conversación");
}

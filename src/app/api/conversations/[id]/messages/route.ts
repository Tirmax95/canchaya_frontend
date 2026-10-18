import { requireSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { getConversationMessages, sendConversationMessage } from "@/data/messaging.repository";
import { parseSchema, positiveIdSchema, sendMessageSchema } from "@/domain/schemas";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Propósito: Mensajes de una conversación (marca como leída). `?before=<id>` para paginar.
 */
export async function GET(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    await requireSession();
    const conversationId = parsePositiveIntParam((await context.params).id, "conversación");
    const before = new URL(request.url).searchParams.get("before");
    const parsedBefore = before ? positiveIdSchema.safeParse(before) : null;
    if (parsedBefore && !parsedBefore.success) {
      throw new AppError("VALIDATION", "Parámetro inválido", 400);
    }
    const beforeId = parsedBefore?.data;
    /**
     * Output:
     * @returns { conversation, viewerSide, messages } — Hilo
     */
    return await getConversationMessages(conversationId, beforeId);
  }, "No se pudieron cargar los mensajes");
}

/**
 * Propósito: Envía un mensaje.
 */
export async function POST(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    await requireSession();
    const conversationId = parsePositiveIntParam((await context.params).id, "conversación");
    const input = parseSchema(sendMessageSchema, await readJsonBody(request));
    /**
     * Output:
     * @returns { message } — Mensaje enviado
     */
    return { message: await sendConversationMessage(conversationId, input.body) };
  }, "No se pudo enviar el mensaje");
}

import { requestAuthedBackend } from "@/core/http/backend-client";
import type {
  Conversation,
  ConversationListItem,
  ConversationMessage,
  ConversationSide,
  ConversationSubjectType,
  PlayerContact,
} from "@/domain/messaging";

interface ConversationPayload {
  conversation_id: number;
  subject_type: ConversationSubjectType;
  subject_id: number;
  organization_name: string;
  player_name: string;
  title: string;
  created_at: string;
  last_message_at: string | null;
}

interface MessagePayload {
  message_id: number;
  sender_side: ConversationSide;
  sender_name: string | null;
  body: string;
  created_at: string;
}

/**
 * Propósito: Conversación snake_case → camelCase.
 */
function toConversation(payload: ConversationPayload): Conversation {
  /**
   * Output:
   * @returns Conversation — Conversación para la UI
   */
  return {
    conversationId: Number(payload.conversation_id),
    subjectType: payload.subject_type,
    subjectId: Number(payload.subject_id),
    organizationName: String(payload.organization_name),
    playerName: String(payload.player_name),
    title: String(payload.title),
    createdAt: String(payload.created_at),
    lastMessageAt: payload.last_message_at ? String(payload.last_message_at) : null,
  };
}

/**
 * Propósito: Mensaje snake_case → camelCase.
 */
function toMessage(payload: MessagePayload): ConversationMessage {
  /**
   * Output:
   * @returns ConversationMessage — Mensaje para la UI
   */
  return {
    messageId: Number(payload.message_id),
    senderSide: payload.sender_side,
    senderName: payload.sender_name,
    body: String(payload.body),
    createdAt: String(payload.created_at),
  };
}

/**
 * Propósito: Abre (o crea) la conversación de una reserva o inscripción.
 */
export async function openConversation(
  subjectType: ConversationSubjectType,
  subjectId: number,
): Promise<{ conversation: Conversation; viewerSide: ConversationSide }> {
  const payload = await requestAuthedBackend<{
    conversation: ConversationPayload;
    viewer_side: ConversationSide;
  }>({
    path: "/conversations",
    method: "POST",
    body: { subject_type: subjectType, subject_id: subjectId },
  });
  /**
   * Output:
   * @returns object — Conversación y lado del usuario
   */
  return { conversation: toConversation(payload.conversation), viewerSide: payload.viewer_side };
}

/**
 * Propósito: Bandeja del usuario (como jugador y como staff).
 */
export async function listConversations(): Promise<ConversationListItem[]> {
  const payload = await requestAuthedBackend<{
    conversations?: Array<
      ConversationPayload & {
        viewer_side: ConversationSide;
        is_unread: boolean;
        last_message_preview: string | null;
        last_message_side: ConversationSide | null;
      }
    >;
  }>({ path: "/conversations" });
  /**
   * Output:
   * @returns ConversationListItem[] — Conversaciones recientes primero
   */
  return (payload.conversations ?? []).map((item) => ({
    ...toConversation(item),
    viewerSide: item.viewer_side,
    isUnread: item.is_unread === true,
    lastMessagePreview: item.last_message_preview,
    lastMessageSide: item.last_message_side,
  }));
}

/**
 * Propósito: Conversaciones con mensajes nuevos.
 */
export async function countUnreadConversations(): Promise<number> {
  const payload = await requestAuthedBackend<{ unread?: number }>({
    path: "/conversations/unread-count",
  });
  /**
   * Output:
   * @returns number — Sin leer
   */
  return Number(payload.unread ?? 0);
}

/**
 * Propósito: Mensajes de una conversación (más nuevos primero).
 */
export async function getConversationMessages(
  conversationId: number,
  beforeMessageId?: number,
): Promise<{
  conversation: Conversation;
  viewerSide: ConversationSide;
  messages: ConversationMessage[];
}> {
  const query = beforeMessageId ? `?before_id=${beforeMessageId}` : "";
  const payload = await requestAuthedBackend<{
    conversation: ConversationPayload;
    viewer_side: ConversationSide;
    messages?: MessagePayload[];
  }>({ path: `/conversations/${conversationId}/messages${query}` });
  /**
   * Output:
   * @returns object — Conversación, lado y mensajes
   */
  return {
    conversation: toConversation(payload.conversation),
    viewerSide: payload.viewer_side,
    messages: (payload.messages ?? []).map(toMessage),
  };
}

/**
 * Propósito: Envía un mensaje.
 */
export async function sendConversationMessage(
  conversationId: number,
  body: string,
): Promise<ConversationMessage> {
  const payload = await requestAuthedBackend<{ message: MessagePayload }>({
    path: `/conversations/${conversationId}/messages`,
    method: "POST",
    body: { body },
  });
  /**
   * Output:
   * @returns ConversationMessage — Mensaje guardado
   */
  return toMessage(payload.message);
}

/**
 * Propósito: Contacto de quien reservó (staff del tenant; el backend audita la consulta).
 */
export async function getReservationContact(reservationId: number): Promise<PlayerContact> {
  const payload = await requestAuthedBackend<{
    contact: { full_name: string; email: string; phone: string | null; whatsapp: string | null };
  }>({ path: `/reservations/${reservationId}/contact` });
  /**
   * Output:
   * @returns PlayerContact — Nombre, correo, teléfono y número de WhatsApp
   */
  return {
    fullName: payload.contact.full_name,
    email: payload.contact.email,
    phone: payload.contact.phone,
    whatsapp: payload.contact.whatsapp,
  };
}

/**
 * Mensajería sede ↔ jugador. Tipos y reglas puras compartidas por la UI y el BFF.
 * El backend valida todo de nuevo (permisos, longitud, límites de envío).
 */

export const CONVERSATION_SUBJECT_TYPES = ["reservation", "event_registration"] as const;
export type ConversationSubjectType = (typeof CONVERSATION_SUBJECT_TYPES)[number];
export type ConversationSide = "venue" | "player";

export const MAX_MESSAGE_LENGTH = 2000;
/** Evento del navegador: la bandeja leyó mensajes y el contador del menú debe refrescarse. */
export const MESSAGES_READ_EVENT = "canchaya:messages-read";

export interface Conversation {
  conversationId: number;
  subjectType: ConversationSubjectType;
  subjectId: number;
  organizationName: string;
  playerName: string;
  title: string;
  createdAt: string;
  lastMessageAt: string | null;
}

export interface ConversationListItem extends Conversation {
  viewerSide: ConversationSide;
  isUnread: boolean;
  lastMessagePreview: string | null;
  lastMessageSide: ConversationSide | null;
}

export interface ConversationMessage {
  messageId: number;
  senderSide: ConversationSide;
  senderName: string | null;
  body: string;
  createdAt: string;
}

export interface PlayerContact {
  fullName: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
}

/**
 * Propósito: Enlace de WhatsApp con mensaje ya escrito; null sin número válido.
 */
export function buildWhatsappUrl(whatsappNumber: string | null, message: string): string | null {
  if (!whatsappNumber || !/^\d{8,15}$/.test(whatsappNumber)) {
    /**
     * Output:
     * @returns null — Sin número usable
     */
    return null;
  }
  /**
   * Output:
   * @returns string — https://wa.me/<número>?text=<mensaje>
   */
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Propósito: Enlace mailto con asunto y cuerpo codificados (sin inyección de cabeceras).
 */
export function buildMailtoUrl(email: string, subject: string, body: string): string {
  /**
   * Output:
   * @returns string — mailto:<correo>?subject=…&body=…
   */
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Propósito: Teléfono internacional → solo dígitos para wa.me; null si no sirve.
 */
export function toWhatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? "").replace(/\D/g, "");
  /**
   * Output:
   * @returns string | null — Dígitos (8 a 15) o null
   */
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

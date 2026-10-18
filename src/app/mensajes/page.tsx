import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listConversations } from "@/data/messaging.repository";
import type { ConversationListItem } from "@/domain/messaging";
import { MessagesInbox } from "@/features/messaging/messages-inbox";
import { Alert } from "@/shared/ui/alert";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de mensajes.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("messaging.meta") };
}

/**
 * Propósito: Bandeja de mensajes sede ↔ jugador. `?c=<id>` abre una conversación.
 */
export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const [{ t }, , { c }] = await Promise.all([getTranslator(), requireSession(), searchParams]);
  let conversations: ConversationListItem[] = [];
  let error: string | null = null;
  try {
    conversations = await listConversations();
  } catch {
    error = t("messaging.loadFailed");
  }
  const requestedId = Number(c);
  const initialConversationId = Number.isInteger(requestedId) && requestedId > 0 ? requestedId : null;

  /**
   * Output:
   * @returns JSX.Element — Encabezado + bandeja
   */
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
      <PageHeader
        kicker={t("messaging.kicker")}
        title={t("messaging.title")}
        description={t("messaging.description")}
      />
      {error ? (
        <Alert>{error}</Alert>
      ) : (
        <MessagesInbox
          initialConversations={conversations}
          initialConversationId={initialConversationId}
        />
      )}
    </div>
  );
}

"use client";

import { useI18n } from "@/core/i18n/provider";
import {
  MAX_MESSAGE_LENGTH,
  MESSAGES_READ_EVENT,
  type Conversation,
  type ConversationListItem,
  type ConversationMessage,
  type ConversationSide,
} from "@/domain/messaging";
import { cn } from "@/shared/lib/cn";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

const LIST_REFRESH_MS = 20_000;
const THREAD_REFRESH_MS = 8_000;

interface Thread {
  conversation: Conversation;
  viewerSide: ConversationSide;
  messages: ConversationMessage[];
}

/**
 * Propósito: Bandeja de mensajes: lista y conversación abierta, con refresco periódico
 * mientras la pestaña está visible (sin websockets).
 */
export function MessagesInbox({
  initialConversations,
  initialConversationId,
}: {
  initialConversations: ConversationListItem[];
  initialConversationId: number | null;
}) {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<number | null>(
    initialConversationId ?? null,
  );
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const refreshList = useCallback(async () => {
    const response = await fetch("/api/conversations", { cache: "no-store" }).catch(() => null);
    if (response?.ok) {
      const payload = (await response.json()) as { conversations?: ConversationListItem[] };
      setConversations(payload.conversations ?? []);
    }
  }, []);

  const loadThread = useCallback(
    async (conversationId: number) => {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        cache: "no-store",
      }).catch(() => null);
      if (!response) {
        setError(t("messaging.loadFailed"));
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as Partial<Thread> & {
        message?: string;
      };
      if (!response.ok || !payload.conversation) {
        setError(payload.message ?? t("messaging.loadFailed"));
        return;
      }
      setThread({
        conversation: payload.conversation,
        viewerSide: payload.viewerSide ?? "player",
        messages: payload.messages ?? [],
      });
      setConversations((current) =>
        current.map((item) =>
          item.conversationId === conversationId ? { ...item, isUnread: false } : item,
        ),
      );
      // El contador del menú (AppShell) se actualiza al instante, sin esperar su refresco.
      window.dispatchEvent(new Event(MESSAGES_READ_EVENT));
    },
    [t],
  );

  useEffect(() => {
    if (selectedId === null) {
      setThread(null);
      return;
    }
    setError(null);
    void loadThread(selectedId);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void loadThread(selectedId);
    }, THREAD_REFRESH_MS);
    return () => clearInterval(timer);
  }, [selectedId, loadThread]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void refreshList();
    }, LIST_REFRESH_MS);
    return () => clearInterval(timer);
  }, [refreshList]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages.length]);

  /**
   * Propósito: Abre una conversación y refleja la selección en la URL.
   */
  function selectConversation(conversationId: number | null) {
    setSelectedId(conversationId);
    router.replace(conversationId ? `/mensajes?c=${conversationId}` : "/mensajes", {
      scroll: false,
    });
    /**
     * Output:
     * Side effects — Conversación seleccionada
     */
  }

  /**
   * Propósito: Envía el borrador.
   */
  async function sendMessage(submitEvent?: FormEvent<HTMLFormElement>) {
    submitEvent?.preventDefault();
    const body = draft.trim();
    if (!body || selectedId === null || isSending) {
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      const response = await fetch(`/api/conversations/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      // Éxito: { message: ConversationMessage }. Error del BFF: { message: string }.
      const payload = (await response.json().catch(() => ({}))) as {
        message?: ConversationMessage | string;
      };
      if (!response.ok || typeof payload.message !== "object") {
        setError(typeof payload.message === "string" ? payload.message : t("messaging.sendFailed"));
        return;
      }
      setDraft("");
      await Promise.all([loadThread(selectedId), refreshList()]);
    } catch {
      setError(t("messaging.sendFailed"));
    } finally {
      setIsSending(false);
    }
    /**
     * Output:
     * Side effects — Mensaje enviado y vista actualizada
     */
  }

  const orderedMessages = thread ? [...thread.messages].reverse() : [];

  /**
   * Output:
   * @returns JSX.Element — Lista + hilo (en móvil, uno a la vez)
   */
  return (
    <div className="grid min-h-[60vh] overflow-hidden rounded-[28px] border border-white/8 bg-pitch md:grid-cols-[320px_minmax(0,1fr)]">
      <aside
        className={cn(
          "border-white/8 md:border-r",
          selectedId !== null ? "hidden md:block" : "block",
        )}
      >
        {conversations.length === 0 ? (
          <div className="p-6 text-sm text-mist">
            <p className="font-semibold text-bone">{t("messaging.emptyTitle")}</p>
            <p className="mt-1">{t("messaging.emptyDescription")}</p>
          </div>
        ) : (
          <ul className="max-h-[70vh] divide-y divide-white/5 overflow-y-auto">
            {conversations.map((item) => {
              const counterpart =
                item.viewerSide === "venue" ? item.playerName : item.organizationName;
              return (
                <li key={item.conversationId}>
                  <button
                    type="button"
                    onClick={() => selectConversation(item.conversationId)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-4 py-3 text-left transition-colors",
                      item.conversationId === selectedId ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                    )}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", item.isUnread ? "font-semibold text-bone" : "text-bone/90")}>
                        {counterpart}
                      </span>
                      {item.isUnread ? (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-lime" aria-label={t("messaging.unread")} />
                      ) : null}
                    </span>
                    <span className="truncate text-[11px] uppercase tracking-wide text-lime/80">
                      {item.title}
                    </span>
                    <span className="truncate text-xs text-mist">
                      {item.lastMessagePreview ?? t("messaging.noMessagesYet")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </aside>

      <section className={cn("flex min-h-[60vh] flex-col", selectedId === null ? "hidden md:flex" : "flex")}>
        {selectedId === null || !thread ? (
          <div className="grid flex-1 place-items-center p-6 text-sm text-mist">
            {selectedId === null ? t("messaging.pickConversation") : t("messaging.loading")}
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <button
                type="button"
                onClick={() => selectConversation(null)}
                className="text-sm text-mist hover:text-bone md:hidden"
                aria-label={t("messaging.back")}
              >
                ←
              </button>
              <div className="min-w-0">
                <p className="truncate font-semibold text-bone">
                  {thread.viewerSide === "venue"
                    ? thread.conversation.playerName
                    : thread.conversation.organizationName}
                </p>
                <p className="truncate text-xs text-mist">{thread.conversation.title}</p>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: "55vh" }}>
              {orderedMessages.length === 0 ? (
                <p className="text-center text-sm text-mist">{t("messaging.startHint")}</p>
              ) : (
                orderedMessages.map((message) => {
                  const isMine = message.senderSide === thread.viewerSide;
                  return (
                    <div key={message.messageId} className={cn("flex", isMine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                          isMine ? "rounded-br-md bg-lime/90 text-ink" : "rounded-bl-md bg-white/[0.07] text-bone",
                        )}
                      >
                        {!isMine && message.senderName ? (
                          <p className="mb-0.5 text-[11px] font-semibold opacity-70">{message.senderName}</p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{message.body}</p>
                        <p className={cn("mt-1 text-[10px]", isMine ? "text-ink/60" : "text-mist/70")}>
                          {formatDateTime(message.createdAt, intlLocale)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={(submitEvent) => void sendMessage(submitEvent)} className="space-y-2 border-t border-white/8 p-4">
              {error ? <Alert>{error}</Alert> : null}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(changeEvent) => setDraft(changeEvent.target.value)}
                  onKeyDown={(keyEvent) => {
                    if (keyEvent.key === "Enter" && !keyEvent.shiftKey) {
                      keyEvent.preventDefault();
                      void sendMessage();
                    }
                  }}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  placeholder={t("messaging.placeholder")}
                  aria-label={t("messaging.placeholder")}
                  className="min-h-[52px] flex-1 resize-none rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm text-bone outline-none placeholder:text-mist/50 focus:border-lime/70"
                />
                <Button type="submit" isLoading={isSending} disabled={!draft.trim()}>
                  {t("messaging.send")}
                </Button>
              </div>
              <p className="text-[11px] text-mist/70">{t("messaging.emailNote")}</p>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

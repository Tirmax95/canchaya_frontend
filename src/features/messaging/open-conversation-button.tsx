"use client";

import { useI18n } from "@/core/i18n/provider";
import type { ConversationSubjectType } from "@/domain/messaging";
import { Button, type ButtonVariant } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Abre (o crea) la conversación de una reserva o inscripción y lleva a /mensajes.
 */
export function OpenConversationButton({
  subjectType,
  subjectId,
  label,
  variant = "secondary",
  className,
}: {
  subjectType: ConversationSubjectType;
  subjectId: number;
  label: string;
  variant?: ButtonVariant;
  className?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [isOpening, setIsOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Propósito: Pide la conversación al BFF y navega al hilo.
   */
  async function openThread() {
    setIsOpening(true);
    setError(null);
    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectType, subjectId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        conversation?: { conversationId: number };
        message?: string;
      };
      if (!response.ok || !payload.conversation) {
        setError(payload.message ?? t("messaging.openFailed"));
        return;
      }
      router.push(`/mensajes?c=${payload.conversation.conversationId}`);
    } catch {
      setError(t("messaging.openFailed"));
    } finally {
      setIsOpening(false);
    }
    /**
     * Output:
     * Side effects — Navega a la conversación o muestra el error
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Botón con error en línea
   */
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        isLoading={isOpening}
        className={className ?? "px-3 py-1.5 text-xs"}
        onClick={() => void openThread()}
      >
        <svg aria-hidden viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round">
          <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v6a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3h0.5A2.5 2.5 0 0 1 3 11.5v-6Z" />
        </svg>
        {label}
      </Button>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </span>
  );
}

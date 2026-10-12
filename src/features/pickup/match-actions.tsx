"use client";

import { useI18n } from "@/core/i18n/provider";
import type { PickupMatch, PickupPayment } from "@/domain/pickup";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Reserva y paga en dos pasos. El hold vence solo; el pago es explícito.
 */
export function MatchActions({
  match,
  isOwner,
  isAuthenticated,
  pendingPayment,
}: {
  match: PickupMatch;
  isOwner: boolean;
  isAuthenticated: boolean;
  pendingPayment?: PickupPayment | null;
}) {
  const router = useRouter();
  const { t, intlLocale } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(
    pendingPayment ? t("pickup.infoPendingHold") : null,
  );
  const [isWorking, setIsWorking] = useState(false);
  const [paymentId, setPaymentId] = useState<number | null>(
    pendingPayment?.id ?? null,
  );
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const slotPrice = formatMoney(match.pricePerSlot, intlLocale, t("common.consult"));

  /**
   * Propósito: Reserva el cupo 10 minutos y abre checkout. No cobra todavía.
   */
  async function reserveSlot() {
    setIsWorking(true);
    setError(null);
    try {
      const hold = await fetch("/api/pickup/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const held = (await hold.json()) as {
        checkout?: { expiresAt?: string | null };
        message?: string;
      };
      if (!hold.ok) {
        setError(held.message ?? t("pickup.reserveFailed"));
        return;
      }
      const checkout = await fetch("/api/pickup/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId: match.id }),
      });
      const payload = (await checkout.json()) as {
        payment?: { id: number };
        message?: string;
      };
      if (!checkout.ok || !payload.payment) {
        setError(payload.message ?? t("pickup.openPaymentFailed"));
        return;
      }
      setPaymentId(payload.payment.id);
      setExpiresAt(held.checkout?.expiresAt ?? null);
      setInfo(t("pickup.infoReservedHold"));
      /**
       * Output:
       * Side effects — Hold + checkout pending
       */
    } catch {
      setError(t("pickup.reserveFailedRetry"));
    } finally {
      setIsWorking(false);
    }
  }

  /**
   * Propósito: Confirma el pago sandbox del checkout propio.
   */
  async function confirmPayment() {
    if (!paymentId) {
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      const approved = await fetch("/api/pickup/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", paymentId }),
      });
      const result = (await approved.json()) as { message?: string };
      if (!approved.ok) {
        setError(result.message ?? t("pickup.sandboxPayFailed"));
        return;
      }
      setInfo(t("pickup.infoSlotPaid"));
      setPaymentId(null);
      router.refresh();
      /**
       * Output:
       * Side effects — Pago aprobado
       */
    } catch {
      setError(t("pickup.confirmPaymentFailed"));
    } finally {
      setIsWorking(false);
    }
  }

  /**
   * Propósito: Ejecuta una acción de organizador contra el BFF.
   */
  async function runAction(action: string) {
    setIsWorking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/pickup/matches/${match.id}?action=${action}`,
        { method: "POST" },
      );
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(payload.message ?? t("pickup.updateFailed"));
        return;
      }
      router.refresh();
      /**
       * Output:
       * Side effects — Transición de estado
       */
    } catch {
      setError(t("pickup.updateMatchFailed"));
    } finally {
      setIsWorking(false);
    }
  }

  /**
   * Propósito: Pide confirmación antes de publicar, confirmar, empezar, cancelar, reservar o cobrar.
   */
  function requestMatchDecision(
    decision: "publish" | "confirm" | "start" | "cancel" | "pay" | "reserve",
  ) {
    if (decision === "reserve") {
      askConfirmation({
        title: t("pickup.reserveConfirmTitle"),
        description: t("pickup.reserveConfirmDescription"),
        confirmLabel: t("pickup.reserveConfirmYes"),
        tone: "primary",
        run: reserveSlot,
      });
      /**
       * Output:
       * Side effects — Abre el modal del cupo
       */
      return;
    }

    if (decision === "pay") {
      askConfirmation({
        title: t("pickup.paySlotConfirmTitle"),
        description: t("pickup.paySlotConfirmDescription", { amount: slotPrice }),
        confirmLabel: t("pickup.paySlotConfirmYes"),
        tone: "primary",
        run: confirmPayment,
      });
      /**
       * Output:
       * Side effects — Abre el modal del pago
       */
      return;
    }

    const decisionCopy = {
      publish: {
        title: t("pickup.publishConfirmTitle"),
        description: t("pickup.publishConfirmDescription"),
        confirmLabel: t("pickup.publishConfirmYes"),
        tone: "primary" as const,
      },
      confirm: {
        title: t("pickup.matchConfirmTitle"),
        description: t("pickup.matchConfirmDescription"),
        confirmLabel: t("pickup.matchConfirmYes"),
        tone: "primary" as const,
      },
      start: {
        title: t("pickup.startConfirmTitle"),
        description: t("pickup.startConfirmDescription"),
        confirmLabel: t("pickup.startConfirmYes"),
        tone: "primary" as const,
      },
      cancel: {
        title: t("pickup.cancelMatchConfirmTitle"),
        description: t("pickup.cancelMatchConfirmDescription"),
        confirmLabel: t("pickup.cancelMatchConfirmYes"),
        tone: "danger" as const,
      },
    }[decision];

    askConfirmation({
      ...decisionCopy,
      run: () => runAction(decision),
    });
    /**
     * Output:
     * Side effects — Abre el modal; el partido no cambia hasta aceptar
     */
  }

  const holdExpiresLabel = expiresAt
    ? t("pickup.holdExpiresAt", {
        time: new Date(expiresAt).toLocaleTimeString(intlLocale, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      })
    : null;

  /**
   * Output:
   * @returns JSX.Element — Acciones de cupo u organización
   */
  return (
    <div className="space-y-3">
      {confirmationDialog}
      {error ? <Alert>{error}</Alert> : null}
      {info ? <p className="text-sm text-lime">{info}</p> : null}
      {holdExpiresLabel ? (
        <p className="text-xs text-mist">{holdExpiresLabel}</p>
      ) : null}
      {!isAuthenticated ? (
        <Button onClick={() => router.push("/login")}>
          {t("pickup.loginToReserve")}
        </Button>
      ) : isOwner ? (
        <div className="flex flex-wrap gap-2">
          {match.status === "draft" ? (
            <Button isLoading={isWorking} onClick={() => requestMatchDecision("publish")}>
              {t("pickup.publishBtn")}
            </Button>
          ) : null}
          {match.status === "filled" ? (
            <Button isLoading={isWorking} onClick={() => requestMatchDecision("confirm")}>
              {t("booking.confirm")}
            </Button>
          ) : null}
          {match.status === "confirmed" ? (
            <Button isLoading={isWorking} onClick={() => requestMatchDecision("start")}>
              {t("pickup.startBtn")}
            </Button>
          ) : null}
          {match.status !== "cancelled" && match.status !== "closed" ? (
            <Button
              variant="danger"
              isLoading={isWorking}
              onClick={() => requestMatchDecision("cancel")}
            >
              {t("booking.cancel")}
            </Button>
          ) : null}
        </div>
      ) : match.status === "open" ? (
        paymentId ? (
          <Button isLoading={isWorking} onClick={() => requestMatchDecision("pay")}>
            {t("pickup.paySlot", { amount: slotPrice })}
          </Button>
        ) : (
          <Button isLoading={isWorking} onClick={() => requestMatchDecision("reserve")}>
            {t("pickup.reserveSlot")}
          </Button>
        )
      ) : (
        <p className="text-sm text-mist">{t("pickup.noOpenSlots")}</p>
      )}
    </div>
  );
}

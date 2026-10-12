"use client";

import { useI18n } from "@/core/i18n/provider";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Confirma o cancela una reserva vía BFF y refresca la vista.
 * El cliente no autoriza: el BFF vuelve a comprobar sesión y ownership.
 */
export function useReservationActions() {
  const router = useRouter();
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Propósito: Llama el endpoint de mutación y recarga datos del servidor.
   */
  async function mutate(path: string, reservationId: number) {
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      /**
       * Output:
       * Side effects — Ignora ids inválidos para no armar una URL de ataque
       */
      return;
    }
    setPendingId(reservationId);
    setError(null);
    try {
      const response = await fetch(path, { method: "PUT" });
      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!response.ok) {
        setError(payload.message ?? t("booking.updateError"));
        /**
         * Output:
         * Side effects — Muestra el error de la reserva
         */
        return;
      }
      router.refresh();
      /**
       * Output:
       * Side effects — Recarga la lista con el nuevo estado
       */
    } catch {
      setError(t("booking.updateError"));
      /**
       * Output:
       * Side effects — Muestra el fallo de red
       */
    } finally {
      setPendingId(null);
    }
  }

  /**
   * Propósito: Pide confirmación antes de tomar o liberar el horario.
   */
  function requestReservationChange(
    reservationId: number,
    action: "confirm" | "cancel",
  ) {
    const isCancel = action === "cancel";
    askConfirmation({
      title: isCancel ? t("booking.cancelTitle") : t("booking.confirmExistingTitle"),
      description: isCancel
        ? t("booking.cancelDescription")
        : t("booking.confirmExistingDescription"),
      confirmLabel: isCancel ? t("booking.cancelYes") : t("booking.confirmYesShort"),
      tone: isCancel ? "danger" : "primary",
      run: () => mutate(`/api/reservations/${reservationId}/${action}`, reservationId),
    });
    /**
     * Output:
     * Side effects — Abre el modal; la mutación espera a que la persona acepte
     */
  }

  /**
   * Output:
   * @returns object — API de acciones de reserva para la UI
   *   - pendingId: number | null — Reserva en vuelo
   *   - error: string | null — Último fallo visible
   *   - confirmationDialog: JSX — Modal compartido
   *   - requestReservationChange: función — Abre el confirm
   */
  return { pendingId, error, confirmationDialog, requestReservationChange };
}

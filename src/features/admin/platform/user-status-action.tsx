"use client";

import { useI18n } from "@/core/i18n/provider";
import { STATUS_REASON_MAX_LENGTH, type UserAccountStatus } from "@/domain/platform";
import { ConfirmWithInput } from "@/features/admin/platform/confirm-with-input";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useState } from "react";

/**
 * Propósito: Bloquear (con motivo, revoca sesiones) o desbloquear una cuenta.
 * El backend impide bloquearse a sí mismo o a otro super admin.
 */
export function UserStatusAction({ userId, status }: { userId: number; status: UserAccountStatus }) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const endpoint = `/api/platform/users/${userId}`;

  /**
   * Propósito: Pide confirmación antes de devolver el acceso a una cuenta bloqueada.
   */
  function requestUnblock() {
    askConfirmation({
      title: t("platform.unblockTitle"),
      description: t("platform.unblockDescription"),
      confirmLabel: t("platform.unblockConfirm"),
      tone: "primary",
      run: async () => {
        await runMutation("unblock", endpoint, "PUT", { action: "unblock" });
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal; la cuenta sigue bloqueada hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Acción según el estado actual
   */
  return (
    <div className="flex flex-col items-end gap-1">
      {confirmationDialog}
      {status === "blocked" ? (
        <Button
          variant="secondary"
          isLoading={pendingActionKey === "unblock"}
          onClick={requestUnblock}
          className="px-3 py-1.5 text-xs"
        >
          {t("platform.unblockButton")}
        </Button>
      ) : (
        <ConfirmWithInput
          triggerLabel={t("platform.blockTrigger")}
          inputLabel={t("platform.blockReasonLabel")}
          placeholder={t("platform.blockPlaceholder")}
          confirmLabel={t("platform.blockConfirm")}
          maxLength={STATUS_REASON_MAX_LENGTH}
          isPending={pendingActionKey === "block"}
          onConfirm={async (reason) =>
            (await runMutation("block", endpoint, "PUT", { action: "block", reason })) !== null
          }
        />
      )}
      {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}
    </div>
  );
}

/**
 * Propósito: Borra la verificación en dos pasos de alguien que perdió su app y sus códigos de
 * respaldo (cierra sus sesiones). Pide confirmar porque deja la cuenta solo con contraseña.
 */
export function ResetTwoFactorAction({ userId }: { userId: number }) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [hasJustReset, setHasJustReset] = useState(false);

  /**
   * Propósito: Ejecuta el reinicio tras la confirmación del modal.
   */
  async function resetTwoFactor() {
    const response = await runMutation("reset_2fa", `/api/platform/users/${userId}`, "PUT", {
      action: "reset_2fa",
    });
    setHasJustReset(response !== null);
    /**
     * Output:
     * Side effects — 2FA reiniciado o error visible
     */
  }

  /**
   * Propósito: Advierte que la cuenta queda solo con contraseña y se cierran sus sesiones.
   */
  function requestReset() {
    askConfirmation({
      title: t("platform.reset2faTitle"),
      description: t("platform.reset2faDescription"),
      confirmLabel: t("platform.reset2faConfirm"),
      tone: "danger",
      run: resetTwoFactor,
    });
    /**
     * Output:
     * Side effects — Abre el modal; el 2FA sigue activo hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Enlace de reinicio con modal de confirmación
   */
  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      {confirmationDialog}
      <button
        type="button"
        disabled={pendingActionKey === "reset_2fa"}
        onClick={requestReset}
        className="text-mist hover:text-bone disabled:opacity-50"
      >
        {pendingActionKey === "reset_2fa" ? t("platform.reset2faPending") : t("platform.reset2faTrigger")}
      </button>
      {hasJustReset ? <span className="text-lime">{t("platform.reset2faDone")}</span> : null}
      {errorMessage ? <span className="text-danger">{errorMessage}</span> : null}
    </div>
  );
}

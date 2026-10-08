"use client";

import { STATUS_REASON_MAX_LENGTH, type UserAccountStatus } from "@/domain/platform";
import { ConfirmWithInput } from "@/features/admin/platform/confirm-with-input";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { Button } from "@/shared/ui/button";
import { useState } from "react";

/**
 * Propósito: Bloquear (con motivo, revoca sesiones) o desbloquear una cuenta.
 * El backend impide bloquearse a sí mismo o a otro super admin.
 */
export function UserStatusAction({ userId, status }: { userId: number; status: UserAccountStatus }) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const endpoint = `/api/platform/users/${userId}`;

  /**
   * Output:
   * @returns JSX.Element — Acción según el estado actual
   */
  return (
    <div className="flex flex-col items-end gap-1">
      {status === "blocked" ? (
        <Button
          variant="secondary"
          isLoading={pendingActionKey === "unblock"}
          onClick={() => runMutation("unblock", endpoint, "PUT", { action: "unblock" })}
          className="px-3 py-1.5 text-xs"
        >
          Desbloquear
        </Button>
      ) : (
        <ConfirmWithInput
          triggerLabel="Bloquear"
          inputLabel="Motivo del bloqueo"
          placeholder="Ej. Reservas falsas repetidas"
          confirmLabel="Bloquear cuenta"
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
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const [isConfirming, setIsConfirming] = useState(false);
  const [hasJustReset, setHasJustReset] = useState(false);

  /**
   * Propósito: Ejecuta el reinicio tras la confirmación.
   */
  async function resetTwoFactor() {
    const response = await runMutation("reset_2fa", `/api/platform/users/${userId}`, "PUT", {
      action: "reset_2fa",
    });
    setIsConfirming(false);
    setHasJustReset(response !== null);
    /**
     * Output:
     * Side effects — 2FA reiniciado o error visible
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Enlace de reinicio con confirmación
   */
  return (
    <div className="flex flex-col items-end gap-1 text-xs">
      {isConfirming ? (
        <span className="flex items-center gap-2">
          <span className="text-mist">¿Reiniciar 2FA y cerrar sus sesiones?</span>
          <Button
            variant="secondary"
            isLoading={pendingActionKey === "reset_2fa"}
            onClick={() => void resetTwoFactor()}
            className="px-3 py-1 text-xs"
          >
            Sí, reiniciar
          </Button>
          <button type="button" onClick={() => setIsConfirming(false)} className="text-mist hover:text-bone">
            Cancelar
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setIsConfirming(true)} className="text-mist hover:text-bone">
          Reiniciar 2FA
        </button>
      )}
      {hasJustReset ? <span className="text-lime">2FA reiniciado</span> : null}
      {errorMessage ? <span className="text-danger">{errorMessage}</span> : null}
    </div>
  );
}

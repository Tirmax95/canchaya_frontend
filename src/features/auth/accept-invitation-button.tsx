"use client";

import { useI18n } from "@/core/i18n/provider";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Acepta la invitación con la cuenta en sesión y abre el panel del tenant.
 */
export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [isAccepting, setIsAccepting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Propósito: Llama al BFF y navega al panel si salió bien.
   */
  async function acceptInvitation() {
    setIsAccepting(true);
    setErrorMessage(null);
    const response = await fetch("/api/invitations/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const payload = (await response.json().catch(() => ({}))) as { redirectTo?: string; message?: string };
    if (!response.ok) {
      setErrorMessage(payload.message ?? t("auth.acceptFailed"));
      setIsAccepting(false);
      /**
       * Output:
       * Side effects — Error visible
       */
      return;
    }
    router.replace(payload.redirectTo ?? "/admin");
    router.refresh();
    /**
     * Output:
     * Side effects — Navega al panel con el rol de manager
     */
  }

  /**
   * Propósito: Pide confirmación antes de aceptar la invitación y entrar al panel.
   */
  function requestAccept() {
    askConfirmation({
      title: t("auth.inviteConfirmTitle"),
      description: t("auth.inviteConfirmDescription"),
      confirmLabel: t("auth.inviteConfirmYes"),
      tone: "primary",
      run: acceptInvitation,
    });
    /**
     * Output:
     * Side effects — Abre el modal; la invitación sigue pendiente hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Botón de aceptar
   */
  return (
    <div className="space-y-3">
      {confirmationDialog}
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      <Button type="button" isLoading={isAccepting} onClick={requestAccept} className="w-full">
        {t("auth.acceptInvite")}
      </Button>
    </div>
  );
}

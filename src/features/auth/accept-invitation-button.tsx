"use client";

import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Acepta la invitación con la cuenta en sesión y abre el panel del tenant.
 */
export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
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
      setErrorMessage(payload.message ?? "No se pudo aceptar la invitación");
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
   * Output:
   * @returns JSX.Element — Botón de aceptar
   */
  return (
    <div className="space-y-3">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}
      <Button type="button" isLoading={isAccepting} onClick={() => void acceptInvitation()} className="w-full">
        Unirme al equipo
      </Button>
    </div>
  );
}

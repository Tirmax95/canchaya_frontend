"use client";

import { useI18n } from "@/core/i18n/provider";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { TextField } from "@/shared/ui/input";
import { PasswordField } from "@/shared/ui/password-field";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Formulario web para borrar la propia cuenta. Pide confirmación en un modal y
 * llama al BFF, que toma el usuario de la sesión (nunca del formulario).
 */
export function DeleteAccountForm({
  email,
  isTwoFactorEnabled,
}: {
  email: string;
  /** null: no se pudo consultar, el código se muestra como opcional. */
  isTwoFactorEnabled: boolean | null;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  /**
   * Propósito: POST al BFF; si el backend acepta, la sesión ya no existe y se refresca la UI.
   */
  async function deleteAccount(currentPassword: string, code: string) {
    setIsBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, code: code || undefined }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        setError(payload.message ?? t("legal.deletion.failed"));
        return;
      }
      setIsDeleted(true);
      router.refresh();
    } catch {
      setError(t("legal.deletion.failed"));
    } finally {
      setIsBusy(false);
    }
    /**
     * Output:
     * Side effects — Cuenta borrada y sesión cerrada, o mensaje de error
     */
  }

  /**
   * Propósito: Lee el formulario y abre el modal antes de llamar al servidor.
   */
  function requestDeletion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const currentPassword = String(form.get("currentPassword") ?? "");
    const code = String(form.get("code") ?? "").trim();
    askConfirmation({
      title: t("legal.deletion.confirmTitle"),
      description: t("legal.deletion.confirmDescription"),
      confirmLabel: t("legal.deletion.confirmAction"),
      tone: "danger",
      run: () => deleteAccount(currentPassword, code),
    });
    /**
     * Output:
     * Side effects — Abre el modal; no llama al servidor todavía
     */
  }

  if (isDeleted) {
    /**
     * Output:
     * @returns JSX.Element — Confirmación final
     */
    return <Alert tone="info">{t("legal.deletion.done")}</Alert>;
  }

  /**
   * Output:
   * @returns JSX.Element — Formulario de borrado y su modal
   */
  return (
    <form onSubmit={requestDeletion} className="space-y-4">
      <p className="text-sm text-mist">{t("legal.deletion.signedInAs", { email })}</p>
      {error ? <Alert>{error}</Alert> : null}
      <PasswordField
        label={t("legal.deletion.passwordLabel")}
        name="currentPassword"
        autoComplete="current-password"
        required
      />
      {isTwoFactorEnabled === false ? null : (
        <TextField
          label={
            isTwoFactorEnabled ? t("legal.deletion.codeLabel") : t("legal.deletion.codeOptionalLabel")
          }
          name="code"
          autoComplete="one-time-code"
          maxLength={16}
          required={isTwoFactorEnabled === true}
        />
      )}
      <Button type="submit" variant="danger" isLoading={isBusy}>
        {t("legal.deletion.submit")}
      </Button>
      {confirmationDialog}
    </form>
  );
}

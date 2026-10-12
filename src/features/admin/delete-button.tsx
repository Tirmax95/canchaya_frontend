"use client";

import { useI18n } from "@/core/i18n/provider";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Elimina un recurso del panel solo después de confirmar en el modal.
 * La autorización la vuelve a comprobar el BFF; aquí no se confía en el href del botón.
 */
export function DeleteButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Propósito: DELETE al BFF y refresca la tabla si el servidor aceptó.
   */
  async function deleteResource() {
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      const response = await fetch(href, { method: "DELETE" });
      if (response.ok || response.status === 204) {
        router.refresh();
        /**
         * Output:
         * Side effects — Recarga la tabla sin el recurso eliminado
         */
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as { message?: string };
      setErrorMessage(payload.message ?? t("admin.deleteFailed"));
      /**
       * Output:
       * Side effects — Muestra el error del servidor
       */
    } catch {
      setErrorMessage(t("admin.deleteFailed"));
      /**
       * Output:
       * Side effects — Muestra el fallo de red
       */
    } finally {
      setIsDeleting(false);
    }
  }

  /**
   * Propósito: Abre el modal antes de borrar, para que un clic no elimine la cancha o la sede.
   */
  function requestDelete() {
    const resourceLabel = label.trim() || t("admin.deleteFallbackLabel");
    askConfirmation({
      title: t("admin.deleteTitle", { label: resourceLabel }),
      description: t("admin.confirmDeleteDescription"),
      confirmLabel: t("admin.confirmDeleteYes"),
      tone: "danger",
      run: deleteResource,
    });
    /**
     * Output:
     * Side effects — Abre el modal; no llama al servidor todavía
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Botón destructivo y su modal
   */
  return (
    <>
      <Button variant="danger" onClick={requestDelete} isLoading={isDeleting}>
        {t("common.delete")}
      </Button>
      {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}
      {confirmationDialog}
    </>
  );
}

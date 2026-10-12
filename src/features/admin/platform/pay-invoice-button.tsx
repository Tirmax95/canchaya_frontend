"use client";

import { useI18n } from "@/core/i18n/provider";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { useState } from "react";

/**
 * Propósito: Lleva al checkout de Wompi para pagar una factura. Al volver, la página de
 * facturación verifica la transacción.
 */
export function PayInvoiceButton({ invoiceId }: { invoiceId: number }) {
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Propósito: Pide la URL firmada al BFF y redirige.
   */
  async function startCheckout() {
    setIsRedirecting(true);
    setErrorMessage(null);
    const response = await fetch(`/api/organizations/mine/invoices/${invoiceId}/checkout`, {
      method: "POST",
    });
    const payload = (await response.json().catch(() => ({}))) as {
      checkoutUrl?: string;
      message?: string;
    };
    if (!response.ok || !payload.checkoutUrl) {
      setErrorMessage(payload.message ?? t("platform.payStartFailed"));
      setIsRedirecting(false);
      /**
       * Output:
       * Side effects — Muestra el error
       */
      return;
    }
    window.location.assign(payload.checkoutUrl);
    /**
     * Output:
     * Side effects — Navega a Wompi
     */
  }

  /**
   * Propósito: Pide confirmación antes de salir al checkout de la factura.
   */
  function requestCheckout() {
    askConfirmation({
      title: t("platform.payInvoiceTitle"),
      description: t("platform.payInvoiceDescription"),
      confirmLabel: t("platform.payInvoiceConfirm"),
      tone: "primary",
      run: startCheckout,
    });
    /**
     * Output:
     * Side effects — Abre el modal; la redirección espera la aceptación
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Botón de pago
   */
  return (
    <div className="flex flex-col items-end gap-1">
      {confirmationDialog}
      <Button type="button" isLoading={isRedirecting} onClick={requestCheckout}>
        {t("platform.payOnline")}
      </Button>
      {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}
    </div>
  );
}

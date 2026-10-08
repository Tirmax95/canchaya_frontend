"use client";

import { Button } from "@/shared/ui/button";
import { useState } from "react";

/**
 * Propósito: Lleva al checkout de Wompi para pagar una factura. Al volver, la página de
 * facturación verifica la transacción.
 */
export function PayInvoiceButton({ invoiceId }: { invoiceId: number }) {
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
      setErrorMessage(payload.message ?? "No se pudo iniciar el pago");
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
   * Output:
   * @returns JSX.Element — Botón de pago
   */
  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" isLoading={isRedirecting} onClick={() => void startCheckout()}>
        Pagar en línea
      </Button>
      {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}
    </div>
  );
}

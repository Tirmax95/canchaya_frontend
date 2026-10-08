"use client";

import { STATUS_REASON_MAX_LENGTH } from "@/domain/platform";
import { ConfirmWithInput } from "@/features/admin/platform/confirm-with-input";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";

/**
 * Propósito: Acciones de una factura emitida: registrar pago (con referencia) o anular (con motivo).
 */
export function InvoiceRowActions({ invoiceId }: { invoiceId: number }) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const endpoint = `/api/platform/invoices/${invoiceId}`;

  /**
   * Output:
   * @returns JSX.Element — Botones de pagar/anular
   */
  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmWithInput
        triggerLabel="Registrar pago"
        inputLabel="Referencia del pago"
        placeholder="Ej. Nequi 3001234567 / transferencia #889"
        confirmLabel="Marcar pagada"
        minLength={2}
        maxLength={120}
        tone="primary"
        isPending={pendingActionKey === "pay"}
        onConfirm={async (paymentReference) =>
          (await runMutation("pay", endpoint, "PUT", { action: "pay", paymentReference })) !== null
        }
      />
      <ConfirmWithInput
        triggerLabel="Anular"
        inputLabel="Motivo de anulación"
        confirmLabel="Anular factura"
        maxLength={STATUS_REASON_MAX_LENGTH}
        isPending={pendingActionKey === "void"}
        onConfirm={async (reason) =>
          (await runMutation("void", endpoint, "PUT", { action: "void", reason })) !== null
        }
      />
      {errorMessage ? <p className="text-xs text-danger">{errorMessage}</p> : null}
    </div>
  );
}

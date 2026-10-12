"use client";

import { useI18n } from "@/core/i18n/provider";
import { STATUS_REASON_MAX_LENGTH } from "@/domain/platform";
import { ConfirmWithInput } from "@/features/admin/platform/confirm-with-input";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";

/**
 * Propósito: Acciones de una factura emitida: registrar pago (con referencia) o anular (con motivo).
 */
export function InvoiceRowActions({ invoiceId }: { invoiceId: number }) {
  const { t } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const endpoint = `/api/platform/invoices/${invoiceId}`;

  /**
   * Output:
   * @returns JSX.Element — Botones de pagar/anular
   */
  return (
    <div className="flex flex-col items-end gap-2">
      <ConfirmWithInput
        triggerLabel={t("platform.registerPayment")}
        inputLabel={t("platform.paymentReferenceLabel")}
        placeholder={t("platform.paymentRefPlaceholder")}
        confirmLabel={t("platform.markPaid")}
        minLength={2}
        maxLength={120}
        tone="primary"
        isPending={pendingActionKey === "pay"}
        onConfirm={async (paymentReference) =>
          (await runMutation("pay", endpoint, "PUT", { action: "pay", paymentReference })) !== null
        }
      />
      <ConfirmWithInput
        triggerLabel={t("platform.voidTrigger")}
        inputLabel={t("platform.voidReasonLabel")}
        confirmLabel={t("platform.voidInvoice")}
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

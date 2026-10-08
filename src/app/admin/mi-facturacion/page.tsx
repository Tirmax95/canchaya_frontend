import { requireTenantOwnerAccess } from "@/application/admin-access";
import { AppError } from "@/core/errors/app-error";
import {
  getInvoicePaymentSettings,
  listMyInvoices,
  verifyInvoicePayment,
  type InvoicePaymentResult,
} from "@/data/platform.repository";
import { PLATFORM_PAYMENT_INSTRUCTIONS } from "@/domain/platform";
import { InvoiceTable } from "@/features/admin/platform/invoice-table";
import { PanelSection, StatCard } from "@/features/admin/platform/platform-ui";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Mi facturación" };

const WOMPI_TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

const PAYMENT_RESULT_NOTICES: Record<InvoicePaymentResult, { tone: "info" | "danger"; text: string }> = {
  approved: { tone: "info", text: "¡Pago aprobado! Tu factura quedó pagada y te enviamos el comprobante por correo." },
  pending: { tone: "info", text: "Tu pago está en proceso. La factura se actualizará apenas Wompi lo confirme." },
  declined: { tone: "danger", text: "El pago fue rechazado. Puedes intentarlo de nuevo con otro medio." },
  error: { tone: "danger", text: "Hubo un problema con el pago. Si se te cobró, escríbenos con el número de factura." },
};

/**
 * Propósito: Verifica la transacción con la que Wompi devolvió al usuario. Un error de
 * verificación no debe impedir ver las facturas.
 */
async function resolvePaymentNotice(transactionId: string | undefined) {
  if (!transactionId || !WOMPI_TRANSACTION_ID_PATTERN.test(transactionId)) {
    /**
     * Output:
     * @returns null — No viene de un pago
     */
    return null;
  }
  try {
    const verification = await verifyInvoicePayment(transactionId);
    /**
     * Output:
     * @returns object — Aviso según el resultado
     */
    return PAYMENT_RESULT_NOTICES[verification.status];
  } catch (error) {
    /**
     * Output:
     * @returns object — Aviso de error de verificación
     */
    return {
      tone: "danger" as const,
      text: error instanceof AppError ? error.message : "No se pudo verificar el pago.",
    };
  }
}

/**
 * Propósito: El dueño del tenant consulta y paga lo que debe a CanchaYa (aun si está suspendido).
 */
export default async function TenantBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const access = await requireTenantOwnerAccess();
  const { id: transactionId } = await searchParams;
  const paymentNotice = await resolvePaymentNotice(transactionId);
  const [invoices, paymentSettings] = await Promise.all([
    listMyInvoices(),
    getInvoicePaymentSettings(),
  ]);
  const pendingInvoices = invoices.filter((invoice) => invoice.status === "issued");
  const overdueInvoices = pendingInvoices.filter((invoice) => invoice.isOverdue);
  const pendingAmount = pendingInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);

  /**
   * Output:
   * @returns JSX.Element — Facturas del tenant
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Cuenta"
        title="Mi facturación"
        description="Tu plan con CanchaYa: mensualidad más una comisión sobre las reservas confirmadas o jugadas de cada mes."
      />
      {paymentNotice ? <Alert tone={paymentNotice.tone}>{paymentNotice.text}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Por pagar" value={formatMoney(pendingAmount)} detail={`${pendingInvoices.length} factura(s)`} />
        <StatCard
          label="Vencidas"
          value={String(overdueInvoices.length)}
          tone={overdueInvoices.length > 0 ? "danger" : "neutral"}
          detail={overdueInvoices.length > 0 ? "Ponte al día para evitar la suspensión" : "Estás al día"}
        />
        <StatCard label="Facturas emitidas" value={String(invoices.length)} />
      </div>
      <p className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-mist">
        {paymentSettings.onlinePaymentEnabled
          ? "Paga en línea con tarjeta, PSE o Nequi desde el botón de cada factura; queda pagada al instante. "
          : null}
        {PLATFORM_PAYMENT_INSTRUCTIONS}
      </p>
      <PanelSection title="Facturas">
        {invoices.length === 0 ? (
          <EmptyState title="Sin facturas" description="Aquí verás las facturas mensuales de CanchaYa." />
        ) : (
          <InvoiceTable
            invoices={invoices}
            audience={{
              kind: "tenant",
              isOnlinePaymentEnabled: paymentSettings.onlinePaymentEnabled,
              isReadOnly: access.isReadOnly,
            }}
          />
        )}
      </PanelSection>
    </div>
  );
}

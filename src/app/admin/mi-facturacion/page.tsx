import { requireTenantOwnerAccess } from "@/application/admin-access";
import { AppError } from "@/core/errors/app-error";
import { getTranslator } from "@/core/i18n/get-locale";
import {
  getInvoicePaymentSettings,
  listMyInvoices,
  verifyInvoicePayment,
  type InvoicePaymentResult,
} from "@/data/platform.repository";
import { InvoiceTable } from "@/features/admin/platform/invoice-table";
import { PanelSection, StatCard } from "@/features/admin/platform/platform-ui";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import type { TranslateFn } from "@/core/i18n/translate";

const WOMPI_TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

/**
 * Propósito: Avisos según el resultado de verificación de pago Wompi.
 */
function paymentResultNotice(
  t: TranslateFn,
  result: InvoicePaymentResult,
): { tone: "info" | "danger"; text: string } {
  const notices: Record<InvoicePaymentResult, { tone: "info" | "danger"; text: string }> = {
    approved: { tone: "info", text: t("platform.paymentApproved") },
    pending: { tone: "info", text: t("platform.paymentPending") },
    declined: { tone: "danger", text: t("platform.paymentDeclined") },
    error: { tone: "danger", text: t("platform.paymentError") },
  };
  /**
   * Output:
   * @returns object — Tono y texto localizados
   */
  return notices[result];
}

/**
 * Propósito: Verifica la transacción con la que Wompi devolvió al usuario. Un error de
 * verificación no debe impedir ver las facturas.
 */
async function resolvePaymentNotice(transactionId: string | undefined, t: TranslateFn) {
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
    return paymentResultNotice(t, verification.status);
  } catch (error) {
    /**
     * Output:
     * @returns object — Aviso de error de verificación
     */
    return {
      tone: "danger" as const,
      text: error instanceof AppError ? error.message : t("platform.paymentVerifyFailed"),
    };
  }
}

/**
 * Propósito: Metadata de facturación del tenant.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.myBillingMeta") };
}

/**
 * Propósito: El dueño del tenant consulta y paga lo que debe a CanchaYa (aun si está suspendido).
 */
export default async function TenantBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [{ t, intlLocale }, access, { id: transactionId }] = await Promise.all([
    getTranslator(),
    requireTenantOwnerAccess("billing"),
    searchParams,
  ]);
  const consultLabel = t("common.consult");
  const paymentNotice = await resolvePaymentNotice(transactionId, t);
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
        kicker={t("platform.myBillingKicker")}
        title={t("platform.myBillingTitle")}
        description={t("platform.myBillingDescription")}
      />
      {paymentNotice ? <Alert tone={paymentNotice.tone}>{paymentNotice.text}</Alert> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("platform.toPay")}
          value={formatMoney(pendingAmount, intlLocale, consultLabel)}
          detail={t("platform.invoiceCount", { count: pendingInvoices.length })}
        />
        <StatCard
          label={t("platform.overdueInvoices")}
          value={String(overdueInvoices.length)}
          tone={overdueInvoices.length > 0 ? "danger" : "neutral"}
          detail={
            overdueInvoices.length > 0 ? t("platform.overdueStatHint") : t("platform.uptodateHint")
          }
        />
        <StatCard label={t("platform.issuedInvoices")} value={String(invoices.length)} />
      </div>
      <p className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3 text-sm text-mist">
        {paymentSettings.onlinePaymentEnabled ? t("platform.onlinePayHint") : null}
        {t("platform.paymentInstructions")}
      </p>
      <PanelSection title={t("platform.invoices")}>
        {invoices.length === 0 ? (
          <EmptyState
            title={t("platform.myInvoicesEmptyTitle")}
            description={t("platform.myInvoicesEmptyDescription")}
          />
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

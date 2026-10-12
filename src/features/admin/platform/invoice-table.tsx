"use client";

import { useI18n } from "@/core/i18n/provider";
import {
  formatBillingPeriod,
  formatCommissionBps,
  resolveInvoiceDisplayStatus,
  type TenantInvoice,
} from "@/domain/platform";
import { InvoiceRowActions } from "@/features/admin/platform/invoice-row-actions";
import { PayInvoiceButton } from "@/features/admin/platform/pay-invoice-button";
import { DataTable, InvoiceStatusPill } from "@/features/admin/platform/platform-ui";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";

type InvoiceTableAudience =
  | { kind: "platform" }
  | { kind: "tenant"; isOnlinePaymentEnabled: boolean; isReadOnly: boolean };

/**
 * Propósito: Ruta del PDF según quién la descarga (el BFF valida el acceso en cada caso).
 */
function buildInvoicePdfHref(audience: InvoiceTableAudience, invoiceId: number): string {
  /**
   * Output:
   * @returns string — Ruta del BFF que entrega el PDF
   */
  return audience.kind === "platform"
    ? `/api/platform/invoices/${invoiceId}/pdf`
    : `/api/organizations/mine/invoices/${invoiceId}/pdf`;
}

/**
 * Propósito: Tabla de facturas compartida: el super admin registra pagos o anula; el tenant
 * descarga el PDF y, si está habilitado, paga en línea.
 */
export function InvoiceTable({
  invoices,
  audience,
}: {
  invoices: TenantInvoice[];
  audience: InvoiceTableAudience;
}) {
  const { t, intlLocale } = useI18n();
  const consultLabel = t("common.consult");
  const showTenant = audience.kind === "platform";
  const headers = [
    t("platform.invoiceColumnInvoice"),
    ...(showTenant ? [t("platform.invoiceColumnTenant")] : []),
    t("platform.invoiceColumnPeriod"),
    t("platform.invoiceColumnDetail"),
    t("platform.invoiceColumnTotal"),
    t("platform.invoiceColumnStatus"),
    "",
  ];

  /**
   * Output:
   * @returns JSX.Element — Tabla de facturas
   */
  return (
    <DataTable headers={headers}>
      {invoices.map((invoice) => (
        <tr key={invoice.invoiceId} className="align-top">
          <td className="px-3 py-3">
            <p className="font-mono text-xs text-bone">{invoice.invoiceNumber}</p>
            <p className="text-[11px] text-mist">
              {t("platform.issuedAtLabel", { date: formatDateTime(invoice.issuedAt, intlLocale) })}
            </p>
          </td>
          {showTenant ? <td className="px-3 py-3 text-bone">{invoice.organizationName}</td> : null}
          <td className="px-3 py-3 capitalize text-bone">
            {formatBillingPeriod(invoice.period, intlLocale)}
          </td>
          <td className="px-3 py-3 text-xs leading-5 text-mist">
            {t("platform.monthlyFeeLine", {
              amount: formatMoney(invoice.monthlyFee, intlLocale, consultLabel),
            })}
            <br />
            {t("platform.commissionLine", {
              percent: formatCommissionBps(invoice.commissionBps, intlLocale),
              gross: formatMoney(invoice.grossBookings, intlLocale, consultLabel),
              commission: formatMoney(invoice.commissionAmount, intlLocale, consultLabel),
            })}
            <br />
            {t("platform.reservationHours", {
              count: invoice.reservationCount,
              hours: invoice.bookedHours,
            })}
            {invoice.notes ? (
              <>
                <br />
                {t("platform.notePrefix", { note: invoice.notes })}
              </>
            ) : null}
          </td>
          <td className="px-3 py-3 font-semibold text-bone">
            {formatMoney(invoice.totalAmount, intlLocale, consultLabel)}
          </td>
          <td className="px-3 py-3">
            <InvoiceStatusPill status={resolveInvoiceDisplayStatus(invoice)} />
            <p className="mt-1 text-[11px] text-mist">
              {invoice.status === "paid" && invoice.paidAt
                ? t("platform.paidAtLabel", {
                    date: formatDateTime(invoice.paidAt, intlLocale),
                    reference: invoice.paymentReference ?? "",
                  })
                : invoice.status === "void"
                  ? t("platform.voidReasonLine", {
                      reason: invoice.voidReason ?? t("common.none"),
                    })
                  : t("platform.dueAtLabel", {
                      date: formatDateTime(invoice.dueDate, intlLocale),
                    })}
            </p>
          </td>
          <td className="px-3 py-3">
            <div className="flex flex-col items-end gap-2">
              <a
                href={buildInvoicePdfHref(audience, invoice.invoiceId)}
                className="text-xs font-semibold text-lime hover:underline"
                download
              >
                {t("platform.downloadPdf")}
              </a>
              {invoice.status === "issued" && audience.kind === "platform" ? (
                <InvoiceRowActions invoiceId={invoice.invoiceId} />
              ) : null}
              {invoice.status === "issued" &&
              audience.kind === "tenant" &&
              audience.isOnlinePaymentEnabled &&
              !audience.isReadOnly ? (
                <PayInvoiceButton invoiceId={invoice.invoiceId} />
              ) : null}
            </div>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}

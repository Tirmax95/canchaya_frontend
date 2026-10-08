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
  const showTenant = audience.kind === "platform";
  const headers = [
    "Factura",
    ...(showTenant ? ["Tenant"] : []),
    "Periodo",
    "Detalle",
    "Total",
    "Estado",
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
            <p className="text-[11px] text-mist">Emitida {formatDateTime(invoice.issuedAt)}</p>
          </td>
          {showTenant ? <td className="px-3 py-3 text-bone">{invoice.organizationName}</td> : null}
          <td className="px-3 py-3 capitalize text-bone">{formatBillingPeriod(invoice.period)}</td>
          <td className="px-3 py-3 text-xs leading-5 text-mist">
            Mensualidad {formatMoney(invoice.monthlyFee)}
            <br />
            Comisión {formatCommissionBps(invoice.commissionBps)} de {formatMoney(invoice.grossBookings)} ={" "}
            {formatMoney(invoice.commissionAmount)}
            <br />
            {invoice.reservationCount} reservas · {invoice.bookedHours} h
            {invoice.notes ? (
              <>
                <br />
                Nota: {invoice.notes}
              </>
            ) : null}
          </td>
          <td className="px-3 py-3 font-semibold text-bone">{formatMoney(invoice.totalAmount)}</td>
          <td className="px-3 py-3">
            <InvoiceStatusPill status={resolveInvoiceDisplayStatus(invoice)} />
            <p className="mt-1 text-[11px] text-mist">
              {invoice.status === "paid" && invoice.paidAt
                ? `Pagada ${formatDateTime(invoice.paidAt)} · ${invoice.paymentReference ?? ""}`
                : invoice.status === "void"
                  ? `Motivo: ${invoice.voidReason ?? "—"}`
                  : `Vence ${formatDateTime(invoice.dueDate)}`}
            </p>
          </td>
          <td className="px-3 py-3">
            <div className="flex flex-col items-end gap-2">
              <a
                href={buildInvoicePdfHref(audience, invoice.invoiceId)}
                className="text-xs font-semibold text-lime hover:underline"
                download
              >
                Descargar PDF
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

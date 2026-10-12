import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { INVOICE_STATUS_KEYS, translateMappedLabel } from "@/core/i18n/label-keys";
import { listPlatformInvoices, listPlatformTenants } from "@/data/platform.repository";
import { INVOICE_STATUS_FILTERS, type InvoiceStatusFilter, toBillingPeriod } from "@/domain/platform";
import { InvoiceGenerator } from "@/features/admin/platform/invoice-generator";
import { InvoiceTable } from "@/features/admin/platform/invoice-table";
import { PanelSection } from "@/features/admin/platform/platform-ui";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Metadata de facturación de plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.billingMeta") };
}

const BILLING_PATH = "/admin/facturacion";
const SELECTABLE_PAST_MONTHS = 12;

/**
 * Propósito: Arma el href de filtros conservando los demás parámetros.
 */
function buildFilterHref(filters: { estado?: string; tenant?: string }): string {
  const searchParams = new URLSearchParams();
  if (filters.estado) searchParams.set("estado", filters.estado);
  if (filters.tenant) searchParams.set("tenant", filters.tenant);
  const query = searchParams.toString();
  /**
   * Output:
   * @returns string — Ruta con query
   */
  return query ? `${BILLING_PATH}?${query}` : BILLING_PATH;
}

/**
 * Propósito: Facturación a tenants: emitir el mes, filtrar y registrar pagos o anulaciones.
 */
export default async function PlatformBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; tenant?: string }>;
}) {
  const [{ t, intlLocale }, , { estado, tenant }] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    searchParams,
  ]);
  const consultLabel = t("common.consult");
  const statusFilter = INVOICE_STATUS_FILTERS.includes(estado as InvoiceStatusFilter)
    ? (estado as InvoiceStatusFilter)
    : undefined;
  const tenantFilter = Number(tenant);
  const organizationId = Number.isInteger(tenantFilter) && tenantFilter > 0 ? tenantFilter : undefined;

  const [invoices, tenants] = await Promise.all([
    listPlatformInvoices({ status: statusFilter, organizationId }),
    listPlatformTenants(),
  ]);
  const now = new Date();
  const selectablePeriods = Array.from({ length: SELECTABLE_PAST_MONTHS + 1 }, (_, index) =>
    toBillingPeriod(now, -index),
  );
  const listedOutstanding = invoices
    .filter((invoice) => invoice.status === "issued")
    .reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const statusTabs: Array<{ key?: InvoiceStatusFilter; label: string }> = [
    { label: t("common.all") },
    ...INVOICE_STATUS_FILTERS.map((key) => ({
      key,
      label: translateMappedLabel(t, INVOICE_STATUS_KEYS, key),
    })),
  ];

  /**
   * Output:
   * @returns JSX.Element — Emisión + listado de facturas
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("platform.billingTitle")}
        description={t("platform.billingDescription")}
      />

      <PanelSection title={t("platform.issueInvoices")}>
        <InvoiceGenerator selectablePeriods={selectablePeriods} defaultPeriod={toBillingPeriod(now, -1)} />
      </PanelSection>

      <PanelSection
        title={t("platform.invoices")}
        action={
          <span className="text-xs text-mist">
            {t("platform.outstandingInView", {
              amount: formatMoney(listedOutstanding, intlLocale, consultLabel),
            })}
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {statusTabs.map((statusTab) => (
            <Link
              key={statusTab.label}
              href={buildFilterHref({ estado: statusTab.key, tenant })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                statusFilter === statusTab.key
                  ? "border-lime/50 bg-lime/10 text-lime"
                  : "border-white/10 text-mist hover:text-bone",
              )}
            >
              {statusTab.label}
            </Link>
          ))}
          <span className="mx-1 h-4 w-px bg-white/10" aria-hidden />
          <Link
            href={buildFilterHref({ estado })}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              organizationId ? "border-white/10 text-mist hover:text-bone" : "border-lime/50 bg-lime/10 text-lime",
            )}
          >
            {t("platform.allTenantsFilter")}
          </Link>
          {tenants.map((tenantOption) => (
            <Link
              key={tenantOption.organizationId}
              href={buildFilterHref({ estado, tenant: String(tenantOption.organizationId) })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                organizationId === tenantOption.organizationId
                  ? "border-lime/50 bg-lime/10 text-lime"
                  : "border-white/10 text-mist hover:text-bone",
              )}
            >
              {tenantOption.name}
            </Link>
          ))}
        </div>
        {invoices.length === 0 ? (
          <EmptyState
            title={t("platform.invoicesEmptyTitle")}
            description={t("platform.invoicesEmptyDescription")}
          />
        ) : (
          <InvoiceTable invoices={invoices} audience={{ kind: "platform" }} />
        )}
      </PanelSection>
    </div>
  );
}

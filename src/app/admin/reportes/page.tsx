import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { getTenantPeriodReport } from "@/data/platform.repository";
import {
  MAX_REPORT_RANGE_DAYS,
  formatBillingPeriod,
  formatCommissionBps,
  isBillingPeriod,
  toBillingPeriod,
} from "@/domain/platform";
import {
  DataTable,
  InvoiceStatusPill,
  PanelSection,
  PickupRevenueStats,
  StatusPill,
} from "@/features/admin/platform/platform-ui";
import { toDateInputValue } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { buttonClassName } from "@/shared/ui/button-styles";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de reportes de plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.reportsMeta") };
}

const SELECTABLE_PAST_MONTHS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Propósito: Reporte mensual por tenant (base de la facturación) y exportaciones CSV.
 */
export default async function PlatformReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const [{ t, intlLocale }, , { periodo }] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    searchParams,
  ]);
  const consultLabel = t("common.consult");
  const now = new Date();
  const period = isBillingPeriod(periodo) ? periodo : toBillingPeriod(now);
  const { rows, pickupRevenue } = await getTenantPeriodReport(period);
  const selectablePeriods = Array.from({ length: SELECTABLE_PAST_MONTHS + 1 }, (_, index) =>
    toBillingPeriod(now, -index),
  );
  const totals = rows.reduce(
    (accumulated, row) => ({
      reservations: accumulated.reservations + row.reservationCount,
      gross: accumulated.gross + row.grossBookings,
      billable: accumulated.billable + row.totalAmount,
    }),
    { reservations: 0, gross: 0, billable: 0 },
  );

  /**
   * Output:
   * @returns JSX.Element — Reporte mensual + descargas
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("platform.reportsTitle")}
        description={t("platform.reportsDescription")}
      />

      <PanelSection
        title={t("platform.usageByTenant", { period: formatBillingPeriod(period, intlLocale) })}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <select
                name="periodo"
                defaultValue={period}
                aria-label={t("platform.reportMonth")}
                className="rounded-full border border-white/10 bg-ink/40 px-3 py-1.5 text-xs capitalize text-bone"
              >
                {selectablePeriods.map((selectablePeriod) => (
                  <option key={selectablePeriod} value={selectablePeriod} className="bg-ink">
                    {formatBillingPeriod(selectablePeriod, intlLocale)}
                  </option>
                ))}
              </select>
              <button type="submit" className={buttonClassName("secondary", "px-3 py-1.5 text-xs")}>
                {t("platform.view")}
              </button>
            </form>
            <a
              href={`/api/platform/reports/tenants?period=${period}`}
              className={buttonClassName("primary", "px-3 py-1.5 text-xs")}
            >
              {t("platform.downloadCsv")}
            </a>
          </div>
        }
      >
        <DataTable
          headers={[
            t("platform.reportColumnTenant"),
            t("platform.reportColumnReservations"),
            t("platform.reportColumnBooked"),
            t("platform.reportColumnPlan"),
            t("platform.reportColumnCommission"),
            t("platform.reportColumnBillable"),
            t("platform.reportColumnInvoice"),
          ]}
        >
          {rows.map((row) => (
            <tr key={row.organizationId}>
              <td className="px-3 py-3">
                <span className="text-bone">{row.name}</span>{" "}
                {row.status === "suspended" ? (
                  <StatusPill tone="danger">{t("labels.tenantSuspended")}</StatusPill>
                ) : null}
              </td>
              <td className="px-3 py-3 text-mist">
                {t("platform.hoursBookedShort", {
                  count: row.reservationCount,
                  hours: row.bookedHours,
                })}
              </td>
              <td className="px-3 py-3 text-bone">
                {formatMoney(row.grossBookings, intlLocale, consultLabel)}
              </td>
              <td className="px-3 py-3 text-xs text-mist">
                {formatMoney(row.monthlyFee, intlLocale, consultLabel)} +{" "}
                {formatCommissionBps(row.commissionBps, intlLocale)}
              </td>
              <td className="px-3 py-3 text-mist">
                {formatMoney(row.commissionAmount, intlLocale, consultLabel)}
              </td>
              <td className="px-3 py-3 font-semibold text-bone">
                {formatMoney(row.totalAmount, intlLocale, consultLabel)}
              </td>
              <td className="px-3 py-3">
                {row.invoiceStatus ? (
                  <InvoiceStatusPill status={row.invoiceStatus} />
                ) : (
                  <span className="text-xs text-mist">{t("platform.notIssued")}</span>
                )}
              </td>
            </tr>
          ))}
          <tr className="border-t border-white/10 font-semibold">
            <td className="px-3 py-3 text-bone">{t("platform.totalRow")}</td>
            <td className="px-3 py-3 text-bone">{totals.reservations}</td>
            <td className="px-3 py-3 text-bone">{formatMoney(totals.gross, intlLocale, consultLabel)}</td>
            <td />
            <td />
            <td className="px-3 py-3 text-lime">{formatMoney(totals.billable, intlLocale, consultLabel)}</td>
            <td />
          </tr>
        </DataTable>
        <p className="mt-3 text-xs text-mist">
          {t("platform.reportConfirmedHint")}
        </p>
      </PanelSection>

      <PickupRevenueStats
        pickupRevenue={pickupRevenue}
        periodLabel={formatBillingPeriod(period, intlLocale)}
      />

      <PanelSection title={t("platform.exportReservationsSection")}>
        <form
          method="get"
          action="/api/platform/reports/reservations"
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-mist">{t("platform.fromDate")}</span>
            <input
              type="date"
              name="from"
              required
              defaultValue={toDateInputValue(new Date(now.getTime() - 30 * DAY_MS))}
              className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-mist">{t("platform.untilInclusive")}</span>
            <input
              type="date"
              name="to"
              required
              defaultValue={toDateInputValue(now)}
              className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
            />
          </label>
          <button type="submit" className={buttonClassName("primary")}>
            {t("platform.downloadCsv")}
          </button>
        </form>
        <p className="mt-3 text-xs text-mist">
          {t("platform.exportRangeHint", { days: MAX_REPORT_RANGE_DAYS })}
        </p>
      </PanelSection>
    </div>
  );
}

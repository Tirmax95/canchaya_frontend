import { requireSuperAdminAccess } from "@/application/admin-access";
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
import { buttonClassName } from "@/shared/ui/button";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Reportes" };

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
  const [, { periodo }] = await Promise.all([requireSuperAdminAccess(), searchParams]);
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
        kicker="Plataforma"
        title="Reportes"
        description="Volumen y facturable por tenant, y detalle de reservas de toda la plataforma para exportar."
      />

      <PanelSection
        title={`Uso por tenant · ${formatBillingPeriod(period)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <form method="get" className="flex items-center gap-2">
              <select
                name="periodo"
                defaultValue={period}
                aria-label="Mes del reporte"
                className="rounded-full border border-white/10 bg-ink/40 px-3 py-1.5 text-xs capitalize text-bone"
              >
                {selectablePeriods.map((selectablePeriod) => (
                  <option key={selectablePeriod} value={selectablePeriod} className="bg-ink">
                    {formatBillingPeriod(selectablePeriod)}
                  </option>
                ))}
              </select>
              <button type="submit" className={buttonClassName("secondary", "px-3 py-1.5 text-xs")}>
                Ver
              </button>
            </form>
            <a
              href={`/api/platform/reports/tenants?period=${period}`}
              className={buttonClassName("primary", "px-3 py-1.5 text-xs")}
            >
              Descargar CSV
            </a>
          </div>
        }
      >
        <DataTable headers={["Tenant", "Reservas", "Reservado", "Plan", "Comisión", "Total a facturar", "Factura"]}>
          {rows.map((row) => (
            <tr key={row.organizationId}>
              <td className="px-3 py-3">
                <span className="text-bone">{row.name}</span>{" "}
                {row.status === "suspended" ? <StatusPill tone="danger">Suspendido</StatusPill> : null}
              </td>
              <td className="px-3 py-3 text-mist">
                {row.reservationCount} · {row.bookedHours} h
              </td>
              <td className="px-3 py-3 text-bone">{formatMoney(row.grossBookings)}</td>
              <td className="px-3 py-3 text-xs text-mist">
                {formatMoney(row.monthlyFee)} + {formatCommissionBps(row.commissionBps)}
              </td>
              <td className="px-3 py-3 text-mist">{formatMoney(row.commissionAmount)}</td>
              <td className="px-3 py-3 font-semibold text-bone">{formatMoney(row.totalAmount)}</td>
              <td className="px-3 py-3">
                {row.invoiceStatus ? (
                  <InvoiceStatusPill status={row.invoiceStatus} />
                ) : (
                  <span className="text-xs text-mist">Sin emitir</span>
                )}
              </td>
            </tr>
          ))}
          <tr className="border-t border-white/10 font-semibold">
            <td className="px-3 py-3 text-bone">Total</td>
            <td className="px-3 py-3 text-bone">{totals.reservations}</td>
            <td className="px-3 py-3 text-bone">{formatMoney(totals.gross)}</td>
            <td />
            <td />
            <td className="px-3 py-3 text-lime">{formatMoney(totals.billable)}</td>
            <td />
          </tr>
        </DataTable>
        <p className="mt-3 text-xs text-mist">
          Solo cuentan reservas confirmadas o jugadas. El valor usa la tarifa por hora actual de cada cancha.
        </p>
      </PanelSection>

      <PickupRevenueStats pickupRevenue={pickupRevenue} periodLabel={formatBillingPeriod(period)} />

      <PanelSection title="Exportar reservas">
        <form
          method="get"
          action="/api/platform/reports/reservations"
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-mist">Desde</span>
            <input
              type="date"
              name="from"
              required
              defaultValue={toDateInputValue(new Date(now.getTime() - 30 * DAY_MS))}
              className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-mist">Hasta (incluido)</span>
            <input
              type="date"
              name="to"
              required
              defaultValue={toDateInputValue(now)}
              className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone"
            />
          </label>
          <button type="submit" className={buttonClassName("primary")}>
            Descargar CSV
          </button>
        </form>
        <p className="mt-3 text-xs text-mist">
          Máximo {MAX_REPORT_RANGE_DAYS} días por descarga y 5.000 filas. Incluye todas las reservas, de todos los estados.
        </p>
      </PanelSection>
    </div>
  );
}

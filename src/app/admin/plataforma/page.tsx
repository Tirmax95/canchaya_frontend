import { requireSuperAdminAccess } from "@/application/admin-access";
import { getPlatformOverview } from "@/data/platform.repository";
import type { PlatformOverview } from "@/domain/platform";
import { PanelSection, PickupRevenueStats, StatCard } from "@/features/admin/platform/platform-ui";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin · Resumen de plataforma" };

const SERIES_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Propósito: Completa la serie diaria con días sin actividad para que el gráfico sea continuo.
 */
function buildContinuousSeries(overview: PlatformOverview) {
  const valuesByDay = new Map(overview.dailySeries.map((point) => [point.day, point]));
  const endInstant = new Date(overview.generatedAt).getTime() - 5 * 60 * 60 * 1000;
  /**
   * Output:
   * @returns Array — 30 puntos {day, reservations, grossBookings}, del más antiguo al más reciente
   */
  return Array.from({ length: SERIES_DAYS }, (_, index) => {
    const day = new Date(endInstant - (SERIES_DAYS - 1 - index) * DAY_MS).toISOString().slice(0, 10);
    return valuesByDay.get(day) ?? { day, reservations: 0, grossBookings: 0 };
  });
}

/**
 * Propósito: Vista general del dueño de la plataforma: usuarios, tenants, reservas, cobros.
 */
export default async function PlatformOverviewPage() {
  await requireSuperAdminAccess();
  const overview = await getPlatformOverview();
  const series = buildContinuousSeries(overview);
  const peakReservations = Math.max(1, ...series.map((point) => point.reservations));
  const reservations = overview.reservationsLast30Days;
  const reservationStatusRows = [
    { label: "Confirmadas", value: reservations.confirmed, barClassName: "bg-lime" },
    { label: "Completadas", value: reservations.completed, barClassName: "bg-mist" },
    { label: "Pendientes", value: reservations.pending, barClassName: "bg-clay" },
    { label: "Canceladas", value: reservations.cancelled, barClassName: "bg-danger" },
  ];

  /**
   * Output:
   * @returns JSX.Element — Tablero de la plataforma
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Plataforma"
        title="Resumen"
        description={`Toda la actividad de CanchaYa. Actualizado ${formatDateTime(overview.generatedAt)}.`}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reservado (30 días)"
          value={formatMoney(reservations.grossBookings)}
          detail={`${reservations.bookedHours} h en reservas confirmadas o jugadas`}
          tone="positive"
        />
        <StatCard
          label="Reservas (30 días)"
          value={String(reservations.total)}
          detail={`${overview.pickupMatchesLast30Days} partidos abiertos creados`}
        />
        <StatCard
          label="Tenants"
          value={String(overview.tenants.total)}
          detail={`${overview.inventory.establishments} sedes · ${overview.inventory.fields} canchas · ${overview.tenants.pending} por aprobar · ${overview.tenants.suspended} suspendidos`}
          tone={overview.tenants.suspended > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Usuarios"
          value={String(overview.users.total)}
          detail={`${overview.users.newLast30Days} nuevos · ${overview.users.owners} dueños · ${overview.users.blocked} bloqueados`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Por cobrar"
          value={formatMoney(overview.billing.outstandingAmount)}
          detail={`${overview.billing.outstandingCount} facturas emitidas`}
        />
        <StatCard
          label="Vencido"
          value={formatMoney(overview.billing.overdueAmount)}
          detail={`${overview.billing.overdueCount} facturas vencidas`}
          tone={overview.billing.overdueCount > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Cobrado este mes"
          value={formatMoney(overview.billing.collectedThisMonth)}
          tone="positive"
        />
      </div>

      {overview.tenants.pending > 0 ? (
        <Link
          href="/admin/tenants?estado=pending"
          className="block rounded-2xl border border-lime/30 bg-lime/8 px-4 py-3 text-sm text-bone hover:bg-lime/12"
        >
          <strong className="font-semibold">{overview.tenants.pending} tenant(s) esperan aprobación.</strong>{" "}
          Sus sedes no salen al público hasta que los apruebes →
        </Link>
      ) : null}

      <PickupRevenueStats pickupRevenue={overview.pickupRevenueLast30Days} periodLabel="30 días" />

      <PanelSection
        title="Reservas por día"
        action={<span className="text-xs text-mist">Últimos {SERIES_DAYS} días · hora Bogotá</span>}
      >
        <div className="flex h-44 items-end gap-1" role="img" aria-label="Reservas por día en los últimos 30 días">
          {series.map((point) => (
            <div key={point.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="min-h-[2px] rounded-t bg-lime/70 transition group-hover:bg-lime"
                style={{ height: `${(point.reservations / peakReservations) * 100}%` }}
              />
              <span className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-bone shadow group-hover:block">
                {point.day.slice(5)} · {point.reservations} · {formatMoney(point.grossBookings)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[11px] text-mist">
          <span>{series[0]?.day}</span>
          <span>{series.at(-1)?.day}</span>
        </div>
      </PanelSection>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelSection
          title="Tenants con más reservas"
          action={
            <Link href="/admin/tenants" className="text-xs text-lime hover:underline">
              Ver tenants
            </Link>
          }
        >
          {overview.topTenants.length === 0 ? (
            <p className="text-sm text-mist">Aún no hay reservas facturables en los últimos 30 días.</p>
          ) : (
            <ol className="space-y-3">
              {overview.topTenants.map((tenant, index) => (
                <li key={tenant.organizationId} className="flex items-center gap-3 text-sm">
                  <span className="flex size-7 items-center justify-center rounded-full bg-white/8 text-xs text-mist">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-bone">{tenant.name}</span>
                  <span className="text-mist">{tenant.reservations} reservas</span>
                  <span className="w-28 text-right font-semibold text-bone">{formatMoney(tenant.grossBookings)}</span>
                </li>
              ))}
            </ol>
          )}
        </PanelSection>

        <PanelSection title="Estado de las reservas (30 días)">
          <div className="space-y-3">
            {reservationStatusRows.map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs text-mist">
                  <span>{row.label}</span>
                  <span className="text-bone">{row.value}</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full ${row.barClassName}`}
                    style={{ width: `${reservations.total ? (row.value / reservations.total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </PanelSection>
      </div>
    </div>
  );
}

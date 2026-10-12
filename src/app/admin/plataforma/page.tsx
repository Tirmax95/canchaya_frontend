import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { getPlatformOverview } from "@/data/platform.repository";
import type { PlatformOverview } from "@/domain/platform";
import { PanelSection, PickupRevenueStats, StatCard } from "@/features/admin/platform/platform-ui";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

const SERIES_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Propósito: Metadata del resumen de plataforma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.platformOverviewMeta") };
}

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
  const [{ t, intlLocale }, , overview] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    getPlatformOverview(),
  ]);
  const consultLabel = t("common.consult");
  const series = buildContinuousSeries(overview);
  const peakReservations = Math.max(1, ...series.map((point) => point.reservations));
  const reservations = overview.reservationsLast30Days;
  const reservationStatusRows = [
    { label: t("labels.reservationConfirmed"), value: reservations.confirmed, barClassName: "bg-lime" },
    { label: t("labels.reservationCompleted"), value: reservations.completed, barClassName: "bg-mist" },
    { label: t("labels.reservationPending"), value: reservations.pending, barClassName: "bg-clay" },
    { label: t("labels.reservationCancelled"), value: reservations.cancelled, barClassName: "bg-danger" },
  ];

  /**
   * Output:
   * @returns JSX.Element — Tablero de la plataforma
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("platform.overviewTitle")}
        description={t("platform.overviewDescription", {
          date: formatDateTime(overview.generatedAt, intlLocale),
        })}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t("platform.booked30")}
          value={formatMoney(reservations.grossBookings, intlLocale, consultLabel)}
          detail={t("platform.booked30Detail", { hours: reservations.bookedHours })}
          tone="positive"
        />
        <StatCard
          label={t("platform.reservations30")}
          value={String(reservations.total)}
          detail={t("platform.reservations30Detail", { count: overview.pickupMatchesLast30Days })}
        />
        <StatCard
          label={t("platform.tenants")}
          value={String(overview.tenants.total)}
          detail={t("platform.tenantsOverviewDetail", {
            establishments: overview.inventory.establishments,
            fields: overview.inventory.fields,
            pending: overview.tenants.pending,
            suspended: overview.tenants.suspended,
          })}
          tone={overview.tenants.suspended > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label={t("platform.users")}
          value={String(overview.users.total)}
          detail={t("platform.usersOverviewDetail", {
            newUsers: overview.users.newLast30Days,
            owners: overview.users.owners,
            blocked: overview.users.blocked,
          })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("platform.outstanding")}
          value={formatMoney(overview.billing.outstandingAmount, intlLocale, consultLabel)}
          detail={t("platform.outstandingInvoicesDetail", { count: overview.billing.outstandingCount })}
        />
        <StatCard
          label={t("platform.overdue")}
          value={formatMoney(overview.billing.overdueAmount, intlLocale, consultLabel)}
          detail={t("platform.overdueInvoicesDetail", { count: overview.billing.overdueCount })}
          tone={overview.billing.overdueCount > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label={t("platform.collectedMonth")}
          value={formatMoney(overview.billing.collectedThisMonth, intlLocale, consultLabel)}
          tone="positive"
        />
      </div>

      {overview.tenants.pending > 0 ? (
        <Link
          href="/admin/tenants?estado=pending"
          className="block rounded-2xl border border-lime/30 bg-lime/8 px-4 py-3 text-sm text-bone hover:bg-lime/12"
        >
          <strong className="font-semibold">
            {t("platform.pendingApprovalBanner", { count: overview.tenants.pending })}
          </strong>{" "}
          {t("platform.pendingApprovalBannerHint")}
        </Link>
      ) : null}

      <PickupRevenueStats pickupRevenue={overview.pickupRevenueLast30Days} periodLabel={t("platform.last30")} />

      <PanelSection
        title={t("platform.reservationsPerDay")}
        action={
          <span className="text-xs text-mist">{t("platform.seriesFootnote", { days: SERIES_DAYS })}</span>
        }
      >
        <div
          className="flex h-44 items-end gap-1"
          role="img"
          aria-label={t("platform.reservationsPerDayAria")}
        >
          {series.map((point) => (
            <div key={point.day} className="group relative flex h-full flex-1 flex-col justify-end">
              <div
                className="min-h-[2px] rounded-t bg-lime/70 transition group-hover:bg-lime"
                style={{ height: `${(point.reservations / peakReservations) * 100}%` }}
              />
              <span className="pointer-events-none absolute -top-9 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink px-2 py-1 text-[11px] text-bone shadow group-hover:block">
                {point.day.slice(5)} · {point.reservations} ·{" "}
                {formatMoney(point.grossBookings, intlLocale, consultLabel)}
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
          title={t("platform.topTenants")}
          action={
            <Link href="/admin/tenants" className="text-xs text-lime hover:underline">
              {t("platform.seeTenantsLink")}
            </Link>
          }
        >
          {overview.topTenants.length === 0 ? (
            <p className="text-sm text-mist">{t("platform.topTenantsEmpty")}</p>
          ) : (
            <ol className="space-y-3">
              {overview.topTenants.map((tenant, index) => (
                <li key={tenant.organizationId} className="flex items-center gap-3 text-sm">
                  <span className="flex size-7 items-center justify-center rounded-full bg-white/8 text-xs text-mist">
                    {index + 1}
                  </span>
                  <span className="flex-1 truncate text-bone">{tenant.name}</span>
                  <span className="text-mist">
                    {t("platform.tenantReservationsCount", { count: tenant.reservations })}
                  </span>
                  <span className="w-28 text-right font-semibold text-bone">
                    {formatMoney(tenant.grossBookings, intlLocale, consultLabel)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </PanelSection>

        <PanelSection title={t("platform.reservationStatus30")}>
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

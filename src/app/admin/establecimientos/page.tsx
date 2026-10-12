import { requireAdminModule } from "@/application/admin-access";
import { getManagedEstablishmentCatalog } from "@/application/catalog";
import { getTranslator } from "@/core/i18n/get-locale";
import { hasLocation } from "@/domain/establishment";
import { VenueAdminList } from "@/features/admin/venue-admin-list";
import { VenueMap, type VenueMapMarker } from "@/features/maps/venue-map";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * Propósito: Metadata del listado de sedes.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.venuesMeta") };
}

/**
 * Propósito: Sedes del tenant con resumen, mapa y tarjetas de gestión. Sedes y canchas se
 * cargan en paralelo (sin N+1) para contar canchas y precio desde.
 */
export default async function AdminEstablishmentsPage() {
  const [{ t }, , venues] = await Promise.all([
    getTranslator(),
    requireAdminModule("establishments"),
    getManagedEstablishmentCatalog(),
  ]);
  const markers: VenueMapMarker[] = venues.filter(hasLocation).map((venue) => ({
    id: venue.establishmentId,
    latitude: venue.latitude,
    longitude: venue.longitude,
    title: venue.name,
    subtitle: [venue.address, venue.city].filter(Boolean).join(", "),
    href: `/admin/establecimientos/${venue.establishmentId}`,
  }));
  const stats = [
    { label: t("venue.statTotal"), value: venues.length },
    { label: t("venue.statPublished"), value: venues.filter((venue) => venue.isActive).length },
    { label: t("venue.statWithLocation"), value: markers.length },
    { label: t("venue.statCourts"), value: venues.reduce((total, venue) => total + venue.fieldCount, 0) },
  ];

  /**
   * Output:
   * @returns JSX.Element — Panel de sedes
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker={t("admin.venuesKicker")}
        title={t("admin.venuesTitle")}
        action={
          <Link
            href="/admin/establecimientos/nuevo"
            className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink transition hover:bg-flare"
          >
            {t("admin.newVenue")}
          </Link>
        }
      />

      {venues.length === 0 ? (
        <EmptyState
          title={t("venue.adminEmptyTitle")}
          description={t("venue.adminEmptyDescription")}
          action={
            <Link href="/admin/establecimientos/nuevo" className="text-lime hover:underline">
              {t("admin.newVenue")}
            </Link>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[20px] border border-white/8 bg-pitch px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-mist">{stat.label}</dt>
                <dd className="mt-1 font-display text-2xl text-bone">{stat.value}</dd>
              </div>
            ))}
          </dl>

          {markers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg text-bone">{t("venue.mapTitle")}</h2>
              <VenueMap ariaLabel={t("venue.mapTitle")} markers={markers} className="h-72" />
            </section>
          ) : null}

          <VenueAdminList venues={venues} />
        </>
      )}
    </div>
  );
}

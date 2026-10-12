import { getVisibleEstablishmentCatalog } from "@/application/catalog";
import { shouldSeeOnlyOwnedVenues } from "@/core/auth/roles";
import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { hasLocation, type EstablishmentCatalogItem } from "@/domain/establishment";
import { CatalogSearch } from "@/features/catalog/catalog-search";
import { EstablishmentCard } from "@/features/catalog/establishment-card";
import { VenueMap } from "@/features/maps/venue-map";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { Suspense } from "react";

/**
 * Propósito: Filtra sedes en memoria tras un único fetch de catálogo.
 */
export default async function EstablishmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ t }, { q }, session] = await Promise.all([
    getTranslator(),
    searchParams,
    getSession(),
  ]);
  const isOwnerCatalog = shouldSeeOnlyOwnedVenues(session);
  let error: string | null = null;
  let establishments: EstablishmentCatalogItem[] = [];

  try {
    const catalog = await getVisibleEstablishmentCatalog();
    const query = q?.trim().toLowerCase() ?? "";
    establishments = query
      ? catalog.filter((item) => `${item.name} ${item.address} ${item.city}`.toLowerCase().includes(query))
      : catalog;
  } catch {
    error = t("catalog.venuesLoadError");
  }

  const mapMarkers = establishments.filter(hasLocation).map((establishment) => ({
    id: establishment.establishmentId,
    latitude: establishment.latitude,
    longitude: establishment.longitude,
    title: establishment.name,
    subtitle: [establishment.address, establishment.city].filter(Boolean).join(", "),
    href: `/establecimientos/${establishment.establishmentId}`,
  }));

  /**
   * Output:
   * @returns JSX.Element — Catálogo de sedes
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("catalog.venuesKicker")}
        title={isOwnerCatalog ? t("catalog.venuesTitleOwner") : t("catalog.venuesTitle")}
        description={
          isOwnerCatalog ? t("catalog.venuesDescriptionOwner") : t("catalog.venuesDescription")
        }
      />
      <Suspense>
        <CatalogSearch placeholder={t("catalog.venuesSearch")} />
      </Suspense>
      {error ? <Alert>{error}</Alert> : null}
      {!error && establishments.length === 0 ? (
        <EmptyState
          title={t("catalog.venuesEmptyTitle")}
          description={t("catalog.venuesEmptyDescription")}
        />
      ) : (
        <>
          {mapMarkers.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-display text-lg text-bone">{t("venue.catalogMapTitle")}</h2>
              <VenueMap ariaLabel={t("venue.catalogMapTitle")} markers={mapMarkers} className="h-80" />
            </section>
          ) : null}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {establishments.map((establishment) => (
              <EstablishmentCard key={establishment.establishmentId} establishment={establishment} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

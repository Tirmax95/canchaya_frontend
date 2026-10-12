import { getAdminAccess } from "@/application/admin-access";
import { getVenueMapData } from "@/application/venue-map";
import { getTranslator } from "@/core/i18n/get-locale";
import { VenueMapView } from "@/features/admin/venue-map/venue-map-view";
import { EmptyState } from "@/shared/ui/empty-state";
import Link from "next/link";

/**
 * Propósito: Carga en servidor los datos del mapa y lo pinta, o un empty state si no hay sedes.
 * Compartido por el dashboard (/admin) y la vista mapa de /admin/canchas.
 * Remonta por día (key) para reiniciar la hora visualizada al navegar fechas.
 */
export async function VenueMapSection({
  requestedDay,
  dayNavigationBaseHref,
}: {
  requestedDay?: string;
  dayNavigationBaseHref: string;
}) {
  const [{ t }, venueMapData, access] = await Promise.all([
    getTranslator(),
    getVenueMapData(requestedDay),
    getAdminAccess(),
  ]);
  if (venueMapData.establishments.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Empty state si el tenant aún no tiene sedes
     */
    return (
      <EmptyState
        title={t("venueMap.emptyTitle")}
        description={t("venueMap.emptyDescription")}
        action={
          access.enabledModules.includes("establishments") ? (
            <Link href="/admin/establecimientos/nuevo" className="text-lime hover:underline">
              {t("admin.createVenueAction")}
            </Link>
          ) : undefined
        }
      />
    );
  }
  /**
   * Output:
   * @returns JSX.Element — Mapa interactivo del complejo
   */
  return (
    <VenueMapView
      key={venueMapData.dayIsoDate}
      data={venueMapData}
      dayNavigationBaseHref={dayNavigationBaseHref}
      permissions={{
        canManageFields: access.enabledModules.includes("fields"),
        canViewReservations: access.enabledModules.includes("reservations"),
      }}
    />
  );
}

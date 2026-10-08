import { requireAdminModule } from "@/application/admin-access";
import { VenueMapSection } from "@/features/admin/venue-map/venue-map-section";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Dashboard" };

const ADMIN_DASHBOARD_PATH = "/admin";

/**
 * Propósito: Dashboard principal del staff: mapa 3D en vivo del complejo a ancho completo,
 * con opción de pantalla completa. El día viaja en `?fecha=` para poder compartirlo/recargarlo.
 */
export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const [, { fecha }] = await Promise.all([requireAdminModule("dashboard"), searchParams]);

  /**
   * Output:
   * @returns JSX.Element — Mapa del complejo sin encabezado, para priorizar la vista
   */
  return (
    <>
      <h1 className="sr-only">Dashboard de tu sede</h1>
      <VenueMapSection requestedDay={fecha} dayNavigationBaseHref={ADMIN_DASHBOARD_PATH} />
    </>
  );
}

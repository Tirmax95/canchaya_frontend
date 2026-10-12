import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { VenueMapSection } from "@/features/admin/venue-map/venue-map-section";
import type { Metadata } from "next";

const ADMIN_DASHBOARD_PATH = "/admin";

/**
 * Propósito: Título del documento del dashboard del staff.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.dashboardMeta") };
}

/**
 * Propósito: Dashboard principal del staff: mapa 3D en vivo del complejo a ancho completo,
 * con opción de pantalla completa. El día viaja en `?fecha=` para poder compartirlo/recargarlo.
 */
export default async function AdminHomePage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const [{ t }, , { fecha }] = await Promise.all([
    getTranslator(),
    requireAdminModule("dashboard"),
    searchParams,
  ]);

  /**
   * Output:
   * @returns JSX.Element — Mapa del complejo sin encabezado, para priorizar la vista
   */
  return (
    <>
      <h1 className="sr-only">{t("admin.dashboardSr")}</h1>
      <VenueMapSection requestedDay={fecha} dayNavigationBaseHref={ADMIN_DASHBOARD_PATH} />
    </>
  );
}

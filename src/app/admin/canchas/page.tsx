import { requireAdminModule } from "@/application/admin-access";
import { getManagedFieldCatalog } from "@/application/catalog";
import { getTranslator } from "@/core/i18n/get-locale";
import { DeleteButton } from "@/features/admin/delete-button";
import { VenueMapSection } from "@/features/admin/venue-map/venue-map-section";
import {
  buildFieldsViewHref,
  parseFieldsViewMode,
  type FieldsViewMode,
} from "@/features/admin/venue-map/view-mode";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * Propósito: Metadata del inventario de canchas.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.courtsMeta") };
}

/**
 * Propósito: Inventario de canchas con dos vistas: tabla clásica o mapa isométrico del complejo
 * con ocupación en vivo. El modo y el día viajan en la URL para poder compartir/recargar.
 */
export default async function AdminFieldsPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const [{ t, intlLocale }, , { vista, fecha }] = await Promise.all([
    getTranslator(),
    requireAdminModule("fields"),
    searchParams,
  ]);
  const viewMode = parseFieldsViewMode(vista);
  const viewModeOptions: Array<{ mode: FieldsViewMode; label: string }> = [
    { mode: "lista", label: t("admin.listView") },
    { mode: "mapa", label: t("admin.mapView") },
  ];

  /**
   * Output:
   * @returns JSX.Element — Header con toggle de vista + tabla o mapa
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker={t("admin.courtsKicker")}
        title={t("admin.courtsInventory")}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <ViewModeToggle activeMode={viewMode} options={viewModeOptions} viewModeLabel={t("admin.viewMode")} />
            <Link
              href="/admin/canchas/nueva"
              className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
            >
              {t("admin.newCourt")}
            </Link>
          </div>
        }
      />
      {viewMode === "mapa" ? (
        <VenueMapSection
          requestedDay={fecha}
          dayNavigationBaseHref={buildFieldsViewHref("mapa")}
        />
      ) : (
        <FieldsTableSection intlLocale={intlLocale} consultLabel={t("common.consult")} />
      )}
    </div>
  );
}

/**
 * Propósito: Toggle segmentado entre vistas; usa enlaces para que funcione sin JS y con historial.
 */
function ViewModeToggle({
  activeMode,
  options,
  viewModeLabel,
}: {
  activeMode: FieldsViewMode;
  options: Array<{ mode: FieldsViewMode; label: string }>;
  viewModeLabel: string;
}) {
  /**
   * Output:
   * @returns JSX.Element — Control segmentado Lista / Mapa 3D
   */
  return (
    <nav aria-label={viewModeLabel} className="flex rounded-full border border-white/10 bg-white/4 p-1">
      {options.map(({ mode, label }) => (
        <Link
          key={mode}
          href={buildFieldsViewHref(mode)}
          aria-current={mode === activeMode ? "page" : undefined}
          className={cn(
            "rounded-full px-4 py-1.5 text-sm font-semibold transition",
            mode === activeMode ? "bg-bone text-ink" : "text-mist hover:text-bone",
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Propósito: Vista lista clásica con acciones de staff.
 */
async function FieldsTableSection({
  intlLocale,
  consultLabel,
}: {
  intlLocale: string;
  consultLabel: string;
}) {
  const [{ t }, fields] = await Promise.all([getTranslator(), getManagedFieldCatalog()]);

  /**
   * Output:
   * @returns JSX.Element — Tabla de canchas
   */
  return (
    <div className="overflow-hidden rounded-[28px] border border-white/8">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/4 text-mist">
          <tr>
            <th className="px-4 py-3 font-medium">{t("admin.tableCourt")}</th>
            <th className="px-4 py-3 font-medium">{t("admin.tableVenue")}</th>
            <th className="px-4 py-3 font-medium">{t("admin.tablePrice")}</th>
            <th className="px-4 py-3 font-medium">{t("admin.tableActions")}</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.id} className="border-t border-white/8">
              <td className="px-4 py-3 text-bone">{field.numberField}</td>
              <td className="px-4 py-3 text-mist">{field.establishmentName}</td>
              <td className="px-4 py-3 text-bone">
                {formatMoney(field.basePricePerHour, intlLocale, consultLabel)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/admin/canchas/${field.id}`} className="text-lime hover:underline">
                    {t("common.edit")}
                  </Link>
                  <DeleteButton
                    href={`/api/fields/${field.id}`}
                    label={t("admin.deleteCourt", { number: field.numberField })}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

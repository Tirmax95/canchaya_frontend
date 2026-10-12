import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEstablishments } from "@/data/establishment.repository";
import { DeleteButton } from "@/features/admin/delete-button";
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
 * Propósito: Tabla de sedes con acciones de edición y borrado.
 */
export default async function AdminEstablishmentsPage() {
  const [{ t }, , establishments] = await Promise.all([
    getTranslator(),
    requireAdminModule("establishments"),
    listManagedEstablishments(),
  ]);

  /**
   * Output:
   * @returns JSX.Element — CRUD list
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker={t("admin.venuesKicker")}
        title={t("admin.venuesTitle")}
        action={
          <Link
            href="/admin/establecimientos/nuevo"
            className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
          >
            {t("admin.newVenue")}
          </Link>
        }
      />
      <div className="overflow-hidden rounded-[28px] border border-white/8">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/4 text-mist">
            <tr>
              <th className="px-4 py-3 font-medium">{t("admin.tableName")}</th>
              <th className="px-4 py-3 font-medium">{t("admin.tableOrganization")}</th>
              <th className="px-4 py-3 font-medium">{t("admin.tableAddress")}</th>
              <th className="px-4 py-3 font-medium">{t("admin.tableActions")}</th>
            </tr>
          </thead>
          <tbody>
            {establishments.map((establishment) => (
              <tr
                key={establishment.establishmentId}
                className="border-t border-white/8"
              >
                <td className="px-4 py-3 text-bone">{establishment.name}</td>
                <td className="px-4 py-3 text-mist">
                  {establishment.organizationName ?? t("common.none")}
                </td>
                <td className="px-4 py-3 text-mist">{establishment.address}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/establecimientos/${establishment.establishmentId}`}
                      className="text-lime hover:underline"
                    >
                      {t("common.edit")}
                    </Link>
                    <DeleteButton
                      href={`/api/establishments/${establishment.establishmentId}`}
                      label={establishment.name}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

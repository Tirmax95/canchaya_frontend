import {
  assertViewerCanSeeEstablishment,
  filterFieldsByEstablishment,
  getVisibleFieldCatalog,
} from "@/application/catalog";
import { getTranslator } from "@/core/i18n/get-locale";
import { getEstablishmentById } from "@/data/establishment.repository";
import { FieldCard } from "@/features/catalog/field-card";
import { isSafeHttpUrl } from "@/shared/lib/url";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Propósito: Título genérico de sede según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("common.unknownVenue") };
}

/**
 * Propósito: Detalle de sede + canchas. Un par de fetches, sin N+1.
 */
export default async function EstablishmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const establishmentId = Number((await params).id);
  if (!Number.isInteger(establishmentId) || establishmentId <= 0) {
    notFound();
  }

  try {
    const [{ t }, establishment, fieldCatalog] = await Promise.all([
      getTranslator(),
      getEstablishmentById(establishmentId),
      getVisibleFieldCatalog(),
      assertViewerCanSeeEstablishment(establishmentId),
    ]);
    const fields = filterFieldsByEstablishment(fieldCatalog, establishmentId);

    /**
     * Output:
     * @returns JSX.Element — Ficha de sede
     */
    return (
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
        <div className="overflow-hidden rounded-[36px] border border-white/8">
          <div
            className="h-64 bg-cover bg-center"
            style={{
              backgroundImage: isSafeHttpUrl(establishment.imageEstablishment)
                ? `url(${establishment.imageEstablishment})`
                : undefined,
              backgroundColor: "#102218",
            }}
          />
          <div className="bg-pitch p-6 sm:p-8">
            <PageHeader
              kicker={t("common.unknownVenue")}
              title={establishment.name}
              description={
                [establishment.address, establishment.phone].filter(Boolean).join(" · ") ||
                t("catalog.venueFallback")
              }
            />
          </div>
        </div>
        {fields.length === 0 ? (
          <EmptyState
            title={t("catalog.venueEmptyTitle")}
            description={t("catalog.venueEmptyDescription")}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {fields.map((field) => (
              <FieldCard key={field.id} field={field} />
            ))}
          </div>
        )}
      </div>
    );
  } catch {
    notFound();
  }
}

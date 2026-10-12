import { getVisibleFieldCatalog } from "@/application/catalog";
import { shouldSeeOnlyOwnedVenues } from "@/core/auth/roles";
import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import type { FieldCatalogItem } from "@/domain/field";
import { CatalogSearch } from "@/features/catalog/catalog-search";
import { FieldCard } from "@/features/catalog/field-card";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import { Suspense } from "react";

/**
 * Propósito: Título del listado de canchas según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("catalog.courtsKicker") };
}

/**
 * Propósito: Catálogo global de canchas con búsqueda local.
 */
export default async function FieldsPage({
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
  let fields: FieldCatalogItem[] = [];

  try {
    const catalog = await getVisibleFieldCatalog();
    const query = q?.trim().toLowerCase() ?? "";
    fields = query
      ? catalog.filter((field) =>
          `${field.numberField} ${field.establishmentName} ${field.description}`
            .toLowerCase()
            .includes(query),
        )
      : catalog;
  } catch {
    error = t("catalog.courtsLoadError");
  }

  /**
   * Output:
   * @returns JSX.Element — Listado de canchas
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("catalog.courtsKicker")}
        title={isOwnerCatalog ? t("catalog.courtsTitleOwner") : t("catalog.courtsTitle")}
        description={
          isOwnerCatalog ? t("catalog.courtsDescriptionOwner") : t("catalog.courtsDescription")
        }
      />
      <Suspense>
        <CatalogSearch placeholder={t("catalog.courtsSearch")} />
      </Suspense>
      {error ? <Alert>{error}</Alert> : null}
      {!error && fields.length === 0 ? (
        <EmptyState
          title={t("catalog.courtsEmptyTitle")}
          description={t("catalog.courtsEmptyDescription")}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

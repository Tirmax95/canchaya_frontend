import { getFieldCatalog } from "@/application/catalog";
import type { FieldCatalogItem } from "@/domain/field";
import { CatalogSearch } from "@/features/catalog/catalog-search";
import { FieldCard } from "@/features/catalog/field-card";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Canchas" };

/**
 * Propósito: Catálogo global de canchas con búsqueda local.
 */
export default async function FieldsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let error: string | null = null;
  let fields: FieldCatalogItem[] = [];

  try {
    const catalog = await getFieldCatalog();
    const query = q?.trim().toLowerCase() ?? "";
    fields = query
      ? catalog.filter((field) =>
          `${field.numberField} ${field.establishmentName} ${field.description}`
            .toLowerCase()
            .includes(query),
        )
      : catalog;
  } catch {
    error = "No pudimos cargar las canchas. Revisa que el API esté activo.";
  }

  /**
   * Output:
   * @returns JSX.Element — Listado de canchas
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Canchas"
        title="Horarios listos para reservar"
        description="Compara precios y entra al calendario de cada cancha."
      />
      <Suspense>
        <CatalogSearch placeholder="Busca cancha o sede" />
      </Suspense>
      {error ? <Alert>{error}</Alert> : null}
      {!error && fields.length === 0 ? (
        <EmptyState
          title="No hay canchas publicadas"
          description="Un administrador puede crearlas desde el panel."
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

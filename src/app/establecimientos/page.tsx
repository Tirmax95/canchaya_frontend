import { getEstablishmentCatalog } from "@/application/catalog";
import type { EstablishmentCatalogItem } from "@/domain/establishment";
import { CatalogSearch } from "@/features/catalog/catalog-search";
import { EstablishmentCard } from "@/features/catalog/establishment-card";
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
  const { q } = await searchParams;
  let error: string | null = null;
  let establishments: EstablishmentCatalogItem[] = [];

  try {
    const catalog = await getEstablishmentCatalog();
    const query = q?.trim().toLowerCase() ?? "";
    establishments = query
      ? catalog.filter((item) =>
          `${item.name} ${item.address}`.toLowerCase().includes(query),
        )
      : catalog;
  } catch {
    error = "No pudimos cargar las sedes. ¿Está el backend en marcha?";
  }

  /**
   * Output:
   * @returns JSX.Element — Catálogo de sedes
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Sedes"
        title="Elige dónde jugar"
        description="Complejos con canchas publicadas y precio desde."
      />
      <Suspense>
        <CatalogSearch placeholder="Busca por nombre o dirección" />
      </Suspense>
      {error ? <Alert>{error}</Alert> : null}
      {!error && establishments.length === 0 ? (
        <EmptyState
          title="No hay sedes todavía"
          description="Cuando un administrador publique un establecimiento, aparecerá aquí."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {establishments.map((establishment) => (
            <EstablishmentCard
              key={establishment.establishmentId}
              establishment={establishment}
            />
          ))}
        </div>
      )}
    </div>
  );
}

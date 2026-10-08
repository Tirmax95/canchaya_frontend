import { getVisibleFieldCatalog } from "@/application/catalog";
import type { FieldCatalogItem } from "@/domain/field";
import { FieldCard } from "@/features/catalog/field-card";
import { Alert } from "@/shared/ui/alert";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Nueva reserva" };

/**
 * Propósito: Atajo de reserva: primero elegir cancha del catálogo.
 */
export default async function NewReservationPage() {
  let fields: FieldCatalogItem[] = [];
  let error: string | null = null;
  try {
    fields = await getVisibleFieldCatalog();
  } catch {
    error = "No pudimos cargar las canchas. ¿Está el API en línea?";
  }

  /**
   * Output:
   * @returns JSX.Element — Selector de cancha
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Nueva reserva"
        title="¿En qué cancha juegan?"
        description="Elige una cancha para ver horarios libres."
      />
      {error ? <Alert>{error}</Alert> : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
      )}
    </div>
  );
}

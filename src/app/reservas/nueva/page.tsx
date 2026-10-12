import { getVisibleFieldCatalog } from "@/application/catalog";
import { getTranslator } from "@/core/i18n/get-locale";
import type { FieldCatalogItem } from "@/domain/field";
import { FieldCard } from "@/features/catalog/field-card";
import { Alert } from "@/shared/ui/alert";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Título del atajo de reserva según idioma.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("booking.newKicker") };
}

/**
 * Propósito: Atajo de reserva: primero elegir cancha del catálogo.
 */
export default async function NewReservationPage() {
  const { t } = await getTranslator();
  let fields: FieldCatalogItem[] = [];
  let error: string | null = null;
  try {
    fields = await getVisibleFieldCatalog();
  } catch {
    error = t("catalog.courtsLoadError");
  }

  /**
   * Output:
   * @returns JSX.Element — Selector de cancha
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("booking.newKicker")}
        title={t("booking.newTitle")}
        description={t("booking.newDescription")}
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

import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEstablishments } from "@/data/establishment.repository";
import { EventForm } from "@/features/events/event-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Título de alta de evento.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("events.adminNew") };
}

/**
 * Propósito: Alta de evento en una sede del tenant.
 */
export default async function NewEventPage() {
  const [{ t }, , establishments] = await Promise.all([
    getTranslator(),
    requireAdminModule("events"),
    listManagedEstablishments(),
  ]);
  /**
   * Output:
   * @returns JSX.Element — Formulario de alta
   */
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader kicker={t("events.kicker")} title={t("events.adminNew")} />
      <EventForm
        venues={establishments.map((establishment) => ({
          establishmentId: establishment.establishmentId,
          name: establishment.name,
        }))}
      />
    </div>
  );
}

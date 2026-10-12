import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEstablishments } from "@/data/establishment.repository";
import { getEventDetail } from "@/data/event.repository";
import type { EventDetail } from "@/domain/events";
import { EventForm } from "@/features/events/event-form";
import { PageHeader } from "@/shared/ui/page-header";
import { notFound } from "next/navigation";

/**
 * Propósito: Edición de un evento del tenant.
 */
export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ t }, , establishments] = await Promise.all([
    getTranslator(),
    requireAdminModule("events"),
    listManagedEstablishments(),
  ]);
  const eventId = Number((await params).id);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    notFound();
  }
  let detail: EventDetail;
  try {
    detail = await getEventDetail(eventId);
  } catch {
    notFound();
  }
  if (!detail.viewer.canManage) {
    notFound();
  }
  const venues = establishments
    .filter((establishment) => establishment.organizationId === detail.event.organizationId)
    .map((establishment) => ({ establishmentId: establishment.establishmentId, name: establishment.name }));
  /**
   * Output:
   * @returns JSX.Element — Formulario de edición
   */
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader kicker={t("events.adminEdit")} title={detail.event.name} />
      <EventForm venues={venues} event={detail.event} />
    </div>
  );
}

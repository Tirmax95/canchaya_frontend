import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { getEventDetail } from "@/data/event.repository";
import type { EventDetail } from "@/domain/events";
import { EventAdminPanel } from "@/features/events/event-admin-panel";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * Propósito: Título del panel del evento.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("events.adminTitle") };
}

/**
 * Propósito: Administración de un evento del tenant. Si el actor no lo administra (otro
 * tenant o módulo apagado), 404.
 */
export default async function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const [{ t }] = await Promise.all([getTranslator(), requireAdminModule("events")]);
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
  /**
   * Output:
   * @returns JSX.Element — Panel del evento
   */
  return (
    <div className="space-y-6">
      <Link href="/admin/eventos" className="text-sm text-mist hover:text-bone">
        ← {t("events.adminBack")}
      </Link>
      <PageHeader kicker={t("events.kicker")} title={detail.event.name} />
      <EventAdminPanel detail={detail} />
    </div>
  );
}

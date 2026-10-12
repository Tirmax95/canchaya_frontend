import { requireAdminModule } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { listManagedEvents } from "@/data/event.repository";
import { EventAdminList } from "@/features/events/event-admin-list";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Título del listado de eventos del panel.
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
 * Propósito: Eventos del tenant con resumen y acceso a su administración. Requiere el
 * módulo 'events' habilitado por el super admin.
 */
export default async function AdminEventsPage() {
  const [{ t }, , events] = await Promise.all([
    getTranslator(),
    requireAdminModule("events"),
    listManagedEvents(),
  ]);
  const activeStatuses = ["registration_open", "registration_closed", "in_progress"];
  const stats = [
    { label: t("events.statEvents"), value: events.length },
    { label: t("events.statActive"), value: events.filter((event) => activeStatuses.includes(event.status)).length },
    { label: t("events.statTeams"), value: events.reduce((total, event) => total + event.confirmedTeams, 0) },
    { label: t("events.statWaitlist"), value: events.reduce((total, event) => total + event.waitlistedTeams, 0) },
  ];

  /**
   * Output:
   * @returns JSX.Element — Panel de eventos
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker={t("events.kicker")}
        title={t("events.adminTitle")}
        description={t("events.adminDescription")}
        action={
          <Link
            href="/admin/eventos/nuevo"
            className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink transition hover:bg-flare"
          >
            {t("events.adminNew")}
          </Link>
        }
      />
      {events.length === 0 ? (
        <EmptyState
          title={t("events.adminEmptyTitle")}
          description={t("events.adminEmptyDescription")}
          action={
            <Link href="/admin/eventos/nuevo" className="text-lime hover:underline">
              {t("events.adminNew")}
            </Link>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-[20px] border border-white/8 bg-pitch px-4 py-3">
                <dt className="text-xs uppercase tracking-[0.16em] text-mist">{stat.label}</dt>
                <dd className="mt-1 font-display text-2xl text-bone">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <EventAdminList events={events} />
        </>
      )}
    </div>
  );
}

import { getAdminAccess } from "@/application/admin-access";
import { isStaff } from "@/core/auth/roles";
import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { EVENT_SPORT_KEYS } from "@/core/i18n/label-keys";
import { listMyEventRegistrations, listPublicEvents } from "@/data/event.repository";
import { EVENT_SPORTS, type EventSummary, type MyEventRegistration } from "@/domain/events";
import { eventListQuerySchema } from "@/domain/schemas";
import { RegistrationStatusBadge } from "@/features/events/event-badges";
import { EventCard } from "@/features/events/event-card";
import { Alert } from "@/shared/ui/alert";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import Link from "next/link";

const PUBLIC_STATUS_FILTERS = [
  "registration_open",
  "registration_closed",
  "in_progress",
  "completed",
] as const;

/**
 * Propósito: Título del catálogo de eventos.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("events.metaTitle"), description: t("events.description") };
}

/**
 * Propósito: Catálogo público de eventos con filtros por GET (enlazables) y, con sesión,
 * las inscripciones de los equipos del usuario.
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ t }, rawQuery, session] = await Promise.all([getTranslator(), searchParams, getSession()]);
  const parsed = eventListQuerySchema.safeParse({
    status: rawQuery.status || undefined,
    sport: rawQuery.sport || undefined,
    city: rawQuery.city?.trim() || undefined,
    include_past: rawQuery.include_past === "true" ? "true" : undefined,
  });
  const query = parsed.success ? parsed.data : {};
  let events: EventSummary[] = [];
  let myRegistrations: MyEventRegistration[] = [];
  let error: string | null = null;
  try {
    [events, myRegistrations] = await Promise.all([
      listPublicEvents(query),
      session ? listMyEventRegistrations().catch(() => []) : Promise.resolve([]),
    ]);
  } catch {
    error = t("events.loadError");
  }
  const canOrganize =
    session && isStaff(session)
      ? await getAdminAccess()
          .then((access) => access.enabledModules.includes("events"))
          .catch(() => false)
      : null;
  const activeMine = myRegistrations.filter(
    (item) => !["withdrawn", "rejected"].includes(item.registration.status) && item.event.status !== "completed",
  );

  /**
   * Output:
   * @returns JSX.Element — Catálogo
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("events.kicker")}
        title={t("events.title")}
        description={t("events.description")}
        action={
          canOrganize ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/eventos"
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-bone transition hover:bg-white/5"
              >
                {t("events.organizerMyEvents")}
              </Link>
              <Link
                href="/admin/eventos/nuevo"
                className="rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink transition hover:bg-flare"
              >
                {t("events.adminNew")}
              </Link>
            </div>
          ) : undefined
        }
      />
      {canOrganize === false ? <Alert tone="info">{t("events.organizerModuleDisabled")}</Alert> : null}

      {session && activeMine.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-bone">{t("events.myRegistrations")}</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {activeMine.map(({ registration, event }) => (
              <li key={registration.registrationId}>
                <Link
                  href={`/eventos/${event.eventId}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-pitch px-4 py-3 transition hover:border-lime/30"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-bone">{event.name}</span>
                    <span className="block truncate text-xs text-mist">{registration.teamName}</span>
                  </span>
                  <RegistrationStatusBadge status={registration.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <form className="grid gap-3 rounded-[24px] border border-white/8 bg-pitch p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
        <label className="space-y-1.5">
          <span className="text-xs text-mist">{t("events.filterSport")}</span>
          <select
            name="sport"
            defaultValue={query.sport ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone"
          >
            <option value="">{t("events.filterAll")}</option>
            {EVENT_SPORTS.map((sport) => (
              <option key={sport} value={sport}>
                {t(EVENT_SPORT_KEYS[sport])}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-mist">{t("events.filterStatus")}</span>
          <select
            name="status"
            defaultValue={query.status ?? ""}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone"
          >
            <option value="">{t("events.filterAll")}</option>
            {PUBLIC_STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {t(`events.status_${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-mist">{t("events.filterCity")}</span>
          <input
            name="city"
            defaultValue={query.city ?? ""}
            maxLength={80}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-3 py-2.5 text-sm text-bone"
          />
        </label>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-mist">
            <input type="checkbox" name="include_past" value="true" defaultChecked={query.include_past === "true"} className="accent-lime" />
            {t("events.filterIncludePast")}
          </label>
          <button type="submit" className="rounded-full bg-lime px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-flare">
            {t("events.filterApply")}
          </button>
        </div>
      </form>

      {error ? <Alert>{error}</Alert> : null}
      {!error && events.length === 0 ? (
        <EmptyState title={t("events.emptyTitle")} description={t("events.emptyDescription")} />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.eventId} event={event} href={`/eventos/${event.eventId}`} />
          ))}
        </div>
      )}
    </div>
  );
}

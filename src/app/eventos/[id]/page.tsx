import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { EVENT_FORMAT_KEYS, EVENT_SPORT_KEYS } from "@/core/i18n/label-keys";
import { getEventDetail } from "@/data/event.repository";
import { listMyTeams } from "@/data/pickup.repository";
import { formatHasBracket, formatHasMatches, type EventDetail } from "@/domain/events";
import type { PickupTeam } from "@/domain/pickup";
import { BracketView, FixtureView, StandingsView } from "@/features/events/competition-views";
import { EventStatusBadge, RegistrationStatusBadge } from "@/features/events/event-badges";
import { formatEventDates, formatEventDateTime } from "@/features/events/event-format";
import { EventRegistrationPanel, EventTabs } from "@/features/events/event-registration-panel";
import { VenueMap } from "@/features/maps/venue-map";
import { isSafeImageSrc } from "@/shared/lib/url";
import { Alert } from "@/shared/ui/alert";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * Propósito: Id de ruta válido o null.
 */
function parseEventId(raw: string): number | null {
  const eventId = Number(raw);
  /**
   * Output:
   * @returns number | null — Id entero positivo
   */
  return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
}

/**
 * Propósito: Título y descripción con el nombre real del evento.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { t } = await getTranslator();
  const eventId = parseEventId((await params).id);
  try {
    if (!eventId) throw new Error("invalid");
    const detail = await getEventDetail(eventId);
    /**
     * Output:
     * @returns Metadata — Nombre y descripción del evento
     */
    return {
      title: detail.event.name,
      description: detail.event.description.slice(0, 160) || undefined,
    };
  } catch {
    return { title: t("events.metaTitle") };
  }
}

/**
 * Propósito: Ficha pública del evento: portada, datos clave, inscripción, equipos, fixture,
 * tabla o llaves, reglamento y ubicación. El organizador ve el acceso a su panel.
 */
export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const eventId = parseEventId((await params).id);
  if (!eventId) {
    notFound();
  }
  const [{ t, intlLocale }, session] = await Promise.all([getTranslator(), getSession()]);
  let detail: EventDetail;
  try {
    detail = await getEventDetail(eventId);
  } catch {
    notFound();
  }
  let captainTeams: PickupTeam[] = [];
  if (session && detail.event.isRegistrationOpen) {
    captainTeams = (await listMyTeams().catch(() => [])).filter((team) => team.captainId === session.id);
  }
  const { event } = detail;
  const confirmedTeams = detail.teams.filter((team) => team.status === "confirmed");
  const location = detail.venue ? [detail.venue.address, detail.venue.city].filter(Boolean).join(", ") : "";

  const infoItems = [
    { label: t("events.format"), value: t(EVENT_FORMAT_KEYS[event.format]) },
    { label: t("events.sport"), value: t(EVENT_SPORT_KEYS[event.sport]) },
    { label: t("events.teamsLimit"), value: t("events.seats", { taken: event.seatsTaken, max: event.maxTeams }) },
    {
      label: t("events.playersPerTeam"),
      value: event.maxPlayersPerTeam
        ? t("events.playersRange", { min: event.minPlayersPerTeam, max: event.maxPlayersPerTeam })
        : t("events.playersMin", { min: event.minPlayersPerTeam }),
    },
  ];
  const competitionNotes = [
    event.format === "league" || event.format === "groups_knockout"
      ? t("events.pointsSystem", {
          win: event.settings.pointsWin,
          draw: event.settings.pointsDraw,
          loss: event.settings.pointsLoss,
        })
      : null,
    event.settings.doubleRound && event.format !== "knockout" && event.format !== "open" ? t("events.doubleRound") : null,
    event.format === "groups_knockout"
      ? t("events.groupsConfig", {
          groups: event.settings.groupCount,
          qualifiers: event.settings.qualifiersPerGroup,
        })
      : null,
    formatHasBracket(event.format) && event.settings.thirdPlaceMatch ? t("events.thirdPlace") : null,
  ].filter((note): note is string => Boolean(note));

  const overview = (
    <div className="space-y-8">
      {event.description ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-bone">{t("events.about")}</h2>
          <p className="whitespace-pre-line leading-7 text-mist">{event.description}</p>
        </section>
      ) : null}
      <dl className="grid gap-3 sm:grid-cols-2">
        {infoItems.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
            <dt className="text-xs uppercase tracking-[0.16em] text-mist">{item.label}</dt>
            <dd className="mt-1 text-bone">{item.value}</dd>
          </div>
        ))}
      </dl>
      {competitionNotes.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {competitionNotes.map((note) => (
            <li key={note} className="rounded-full border border-white/10 px-3 py-1 text-xs text-mist">
              {note}
            </li>
          ))}
        </ul>
      ) : null}
      {event.prizes ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-bone">{t("events.prizes")}</h2>
          <p className="whitespace-pre-line rounded-2xl border border-lime/20 bg-lime/5 p-5 text-sm leading-6 text-bone">
            {event.prizes}
          </p>
        </section>
      ) : null}
      {event.rules ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl text-bone">{t("events.rules")}</h2>
          <p className="whitespace-pre-line rounded-2xl border border-white/8 bg-white/3 p-5 text-sm leading-6 text-mist">
            {event.rules}
          </p>
        </section>
      ) : null}
    </div>
  );

  const teamsTab = (
    <div className="space-y-2">
      {detail.teams.length === 0 ? (
        <p className="text-sm text-mist">{t("events.teamsEmpty")}</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {detail.teams.map((team) => (
            <li
              key={team.registrationId}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-ink/30 px-4 py-3"
            >
              <span className="min-w-0 truncate font-medium text-bone">
                {team.teamName}
                {team.groupLabel ? (
                  <span className="ml-2 text-xs text-lime">{t("events.group", { group: team.groupLabel })}</span>
                ) : null}
              </span>
              <RegistrationStatusBadge status={team.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const tabs = [
    { id: "info", label: t("events.tabOverview"), content: overview },
    { id: "teams", label: `${t("events.tabTeams")} (${confirmedTeams.length})`, content: teamsTab },
    ...(formatHasMatches(event.format)
      ? [{ id: "fixture", label: t("events.tabFixture"), content: <FixtureView matches={detail.matches} /> }]
      : []),
    ...(event.format === "league" || event.format === "groups_knockout"
      ? [
          {
            id: "standings",
            label: t("events.tabStandings"),
            content: (
              <StandingsView
                tables={detail.standings}
                qualifiersPerGroup={event.format === "groups_knockout" ? event.settings.qualifiersPerGroup : undefined}
              />
            ),
          },
        ]
      : []),
    ...(formatHasBracket(event.format)
      ? [{ id: "bracket", label: t("events.tabBracket"), content: <BracketView detail={detail} /> }]
      : []),
  ];

  /**
   * Output:
   * @returns JSX.Element — Ficha del evento
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <header className="relative overflow-hidden rounded-[36px] border border-white/8 bg-pitch">
        <div
          className="h-56 bg-cover bg-center sm:h-72"
          style={{
            backgroundImage: isSafeImageSrc(event.coverImage)
              ? `url(${JSON.stringify(event.coverImage)})`
              : undefined,
            backgroundColor: "#102218",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className="text-xs uppercase tracking-[0.2em] text-lime">
              {t(EVENT_SPORT_KEYS[event.sport])} · {event.organizationName}
            </span>
          </div>
          <h1 className="font-display text-4xl text-bone sm:text-5xl">{event.name}</h1>
          <p className="text-sm text-mist">
            {formatEventDates(event, intlLocale)}
            {detail.venue ? ` · ${detail.venue.name}` : ""}
            {event.registrationClosesAt && event.isRegistrationOpen
              ? ` · ${t("events.registrationCloses", { date: formatEventDateTime(event.registrationClosesAt, intlLocale) })}`
              : ""}
          </p>
          {detail.viewer.canManage ? (
            <Link
              href={`/admin/eventos/${event.eventId}`}
              className="inline-flex rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink transition hover:bg-flare"
            >
              {t("events.adminManage")}
            </Link>
          ) : null}
        </div>
      </header>

      {event.status === "cancelled" ? (
        <Alert>{t("events.cancelledNotice", { reason: event.cancelledReason ?? "—" })}</Alert>
      ) : null}

      {detail.champion ? (
        <div className="flex items-center gap-4 rounded-[28px] border border-lime/30 bg-lime/10 px-6 py-5">
          <span aria-hidden="true" className="text-3xl">
            🏆
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-lime">{t("events.champion")}</p>
            <p className="font-display text-2xl text-bone">{detail.champion.teamName}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <EventTabs tabs={tabs} />
        </div>
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          {event.status !== "cancelled" ? (
            <EventRegistrationPanel detail={detail} captainTeams={captainTeams} isLoggedIn={Boolean(session)} />
          ) : null}
          {detail.venue ? (
            <div className="space-y-3 rounded-[28px] border border-white/8 bg-pitch p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-lime">{t("events.venue")}</p>
              <Link
                href={`/establecimientos/${detail.venue.establishmentId}`}
                className="block font-display text-xl text-bone hover:text-lime"
              >
                {detail.venue.name}
              </Link>
              {location ? <p className="text-sm text-mist">{location}</p> : null}
              {detail.venue.latitude !== null && detail.venue.longitude !== null ? (
                <VenueMap
                  ariaLabel={detail.venue.name}
                  className="h-44"
                  markers={[
                    {
                      id: detail.venue.establishmentId,
                      latitude: detail.venue.latitude,
                      longitude: detail.venue.longitude,
                      title: detail.venue.name,
                      subtitle: location,
                    },
                  ]}
                />
              ) : null}
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

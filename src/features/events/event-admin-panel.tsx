"use client";

import { EVENT_NEXT_STEP_KEYS } from "@/core/i18n/label-keys";
import { useI18n } from "@/core/i18n/provider";
import {
  ACTIVE_REGISTRATION_STATUSES,
  formatHasBracket,
  formatHasMatches,
  groupMatchesByRound,
  isMatchPlayed,
  type EventDetail,
  type EventMatch,
  type EventTeam,
} from "@/domain/events";
import type { EventActionInput, ManageRegistrationInput } from "@/domain/schemas";
import {
  BracketView,
  countKnockoutRounds,
  getRoundTitle,
  MatchRow,
  StandingsView,
} from "@/features/events/competition-views";
import { EventStatusBadge, PaymentStatusBadge, RegistrationStatusBadge } from "@/features/events/event-badges";
import { formatEntryFee, formatEventDates } from "@/features/events/event-format";
import { EventTabs } from "@/features/events/event-registration-panel";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Feedback = { tone: "info" | "danger"; text: string } | null;

/**
 * Propósito: Envía JSON al BFF y devuelve el mensaje de error del backend si falla.
 */
async function sendJson(url: string, method: string, body?: unknown): Promise<string | null> {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.ok) {
    /**
     * Output:
     * @returns null — Sin error
     */
    return null;
  }
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  /**
   * Output:
   * @returns string — Mensaje para mostrar
   */
  return payload.message ?? "error";
}

/**
 * Propósito: Panel del organizador para un evento.
 */
export function EventAdminPanel({ detail }: { detail: EventDetail }) {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const { event } = detail;

  /**
   * Propósito: Ejecuta una mutación y refresca la vista o muestra el error.
   */
  async function mutate(url: string, method: string, body?: unknown): Promise<boolean> {
    setFeedback(null);
    const error = await sendJson(url, method, body);
    if (error) {
      setFeedback({ tone: "danger", text: error === "error" ? t("events.actionFailed") : error });
      return false;
    }
    router.refresh();
    /**
     * Output:
     * @returns boolean — True si salió bien
     */
    return true;
  }

  const runAction = (input: EventActionInput) => mutate(`/api/events/${event.eventId}`, "POST", input);
  const pendingReview = detail.teams.filter(
    (team) => team.status === "pending_approval" || team.paymentStatus === "refund_due",
  ).length;

  const tabs = [
    {
      id: "overview",
      label: t("events.tabOverview"),
      content: <LifecycleSection detail={detail} runAction={runAction} />,
    },
    {
      id: "registrations",
      label: `${t("events.tabRegistrations")}${pendingReview ? ` (${pendingReview})` : ""}`,
      content: <RegistrationsSection detail={detail} mutate={mutate} />,
    },
    ...(formatHasMatches(event.format)
      ? [
          {
            id: "matches",
            label: t("events.tabMatches"),
            content: <MatchesSection detail={detail} mutate={mutate} runAction={runAction} />,
          },
        ]
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
      ? [{ id: "bracket", label: t("events.tabBracket"), content: <BracketView matches={detail.matches} /> }]
      : []),
  ];

  /**
   * Output:
   * @returns JSX.Element — Panel con resumen y pestañas
   */
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-white/8 bg-pitch p-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <EventStatusBadge status={event.status} />
            <span className="text-sm text-mist">
              {formatEventDates(event, intlLocale)} · {detail.venue?.name}
            </span>
          </div>
          <p className="text-sm text-mist">{t(EVENT_NEXT_STEP_KEYS[event.status])}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/eventos/${event.eventId}/editar`}
            className="rounded-full border border-white/12 px-4 py-2 text-sm text-bone transition hover:bg-white/5"
          >
            {t("events.adminEdit")}
          </Link>
          {event.status !== "draft" ? (
            <Link
              href={`/eventos/${event.eventId}`}
              className="rounded-full border border-white/12 px-4 py-2 text-sm text-bone transition hover:bg-white/5"
            >
              {t("events.adminViewPublic")}
            </Link>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t("events.teamsLimit"), value: `${event.seatsTaken}/${event.maxTeams}` },
          { label: t("events.statTeams"), value: event.confirmedTeams },
          { label: t("events.statWaitlist"), value: event.waitlistedTeams },
          { label: t("events.entryFee"), value: formatEntryFee(event, intlLocale) ?? t("events.free") },
        ].map((stat) => (
          <div key={stat.label} className="rounded-[20px] border border-white/8 bg-pitch px-4 py-3">
            <dt className="text-xs uppercase tracking-[0.14em] text-mist">{stat.label}</dt>
            <dd className="mt-1 font-display text-2xl text-bone">{stat.value}</dd>
          </div>
        ))}
      </dl>

      {feedback ? <Alert tone={feedback.tone}>{feedback.text}</Alert> : null}
      {detail.champion ? (
        <Alert tone="info">
          🏆 {t("events.champion")}: {detail.champion.teamName}
        </Alert>
      ) : null}

      <EventTabs tabs={tabs} />
    </div>
  );
}

/**
 * Propósito: Acciones de ciclo de vida con confirmación (publicar, cerrar, iniciar…).
 */
function LifecycleSection({
  detail,
  runAction,
}: {
  detail: EventDetail;
  runAction: (input: EventActionInput) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [randomize, setRandomize] = useState(true);
  const [cancelReason, setCancelReason] = useState("");
  const { event } = detail;
  const confirmedCount = detail.teams.filter((team) => team.status === "confirmed").length;
  const canCancel = !["completed", "cancelled"].includes(event.status);

  const confirm = (title: string, description: string, input: EventActionInput, tone: "primary" | "danger" = "primary") =>
    askConfirmation({
      title,
      description,
      confirmLabel: t("events.confirmYes"),
      tone,
      run: async () => {
        await runAction(input);
      },
    });

  /**
   * Output:
   * @returns JSX.Element — Acciones disponibles según el estado
   */
  return (
    <div className="space-y-5">
      {confirmationDialog}
      <div className="space-y-4 rounded-[24px] border border-white/8 bg-pitch p-5">
        <h2 className="font-display text-lg text-bone">{t("events.lifecycleTitle")}</h2>
        <div className="flex flex-wrap gap-2">
          {event.status === "draft" ? (
            <Button onClick={() => confirm(t("events.confirmPublishTitle"), t("events.confirmPublishDescription"), { action: "publish" })}>
              {t("events.actionPublish")}
            </Button>
          ) : null}
          {event.status === "registration_open" ? (
            <Button onClick={() => confirm(t("events.confirmCloseTitle"), t("events.confirmCloseDescription"), { action: "close_registration" })}>
              {t("events.actionCloseRegistration")}
            </Button>
          ) : null}
          {event.status === "registration_closed" ? (
            <>
              <Button
                onClick={() =>
                  confirm(
                    t("events.confirmStartTitle"),
                    t("events.confirmStartDescription", { count: confirmedCount }),
                    { action: "start", randomize },
                  )
                }
              >
                {t("events.actionStart")}
              </Button>
              <Button variant="secondary" onClick={() => runAction({ action: "reopen_registration" })}>
                {t("events.actionReopenRegistration")}
              </Button>
            </>
          ) : null}
          {event.status === "in_progress" ? (
            <Button onClick={() => confirm(t("events.confirmCompleteTitle"), t("events.confirmCompleteDescription"), { action: "complete" })}>
              {t("events.actionComplete")}
            </Button>
          ) : null}
        </div>
        {event.status === "registration_closed" && formatHasMatches(event.format) ? (
          <label className="flex items-center gap-2 text-sm text-mist">
            <input type="checkbox" className="size-4 accent-lime" checked={randomize} onChange={(changeEvent) => setRandomize(changeEvent.target.checked)} />
            {t("events.randomizeSeeds")}
          </label>
        ) : null}
      </div>

      {canCancel ? (
        <div className="space-y-3 rounded-[24px] border border-danger/20 bg-danger/5 p-5">
          <h3 className="font-semibold text-bone">{t("events.actionCancel")}</h3>
          <p className="text-sm text-mist">{t("events.confirmCancelDescription")}</p>
          <textarea
            value={cancelReason}
            onChange={(changeEvent) => setCancelReason(changeEvent.target.value)}
            maxLength={300}
            rows={2}
            placeholder={t("events.cancelReason")}
            aria-label={t("events.cancelReason")}
            className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm text-bone outline-none focus:border-danger/60"
          />
          <Button
            variant="danger"
            disabled={cancelReason.trim().length < 3}
            onClick={() =>
              confirm(
                t("events.confirmCancelTitle"),
                t("events.confirmCancelDescription"),
                { action: "cancel", reason: cancelReason.trim() },
                "danger",
              )
            }
          >
            {t("events.actionCancel")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Propósito: Tabla de inscripciones con contacto del capitán y acciones del organizador.
 */
function RegistrationsSection({
  detail,
  mutate,
}: {
  detail: EventDetail;
  mutate: (url: string, method: string, body?: unknown) => Promise<boolean>;
}) {
  const { t, intlLocale } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [showAll, setShowAll] = useState(false);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const { event } = detail;
  const canChangeTeams = ["draft", "registration_open", "registration_closed"].includes(event.status);
  const visible = showAll
    ? detail.teams
    : detail.teams.filter(
        (team) => ACTIVE_REGISTRATION_STATUSES.includes(team.status) || team.paymentStatus === "refund_due",
      );

  const manage = (team: EventTeam, input: ManageRegistrationInput) =>
    mutate(`/api/events/${event.eventId}/registrations/${team.registrationId}`, "PATCH", input);

  /**
   * Output:
   * @returns JSX.Element — Lista de inscripciones
   */
  return (
    <div className="space-y-4">
      {confirmationDialog}
      <div className="flex gap-2">
        {[false, true].map((all) => (
          <button
            key={String(all)}
            type="button"
            onClick={() => setShowAll(all)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs",
              showAll === all ? "border-lime/50 bg-lime/10 text-lime" : "border-white/10 text-mist",
            )}
          >
            {all ? t("events.regFilterAll") : t("events.regFilterActive")}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="text-sm text-mist">{t("events.regEmpty")}</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((team) => (
            <li key={team.registrationId} className="space-y-3 rounded-2xl border border-white/8 bg-pitch p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-bone">
                    {team.teamName}
                    {team.groupLabel ? <span className="ml-2 text-xs text-lime">{t("events.group", { group: team.groupLabel })}</span> : null}
                  </p>
                  {team.contact ? (
                    <p className="text-xs text-mist">
                      {t("events.regCaptain")}: {team.contact.fullName || team.contact.email} ·{" "}
                      <a href={`mailto:${team.contact.email}`} className="hover:text-bone">
                        {team.contact.email}
                      </a>
                      {team.contact.phone ? (
                        <>
                          {" · "}
                          <a href={`tel:${team.contact.phone}`} className="hover:text-bone">
                            {team.contact.phone}
                          </a>
                        </>
                      ) : null}
                    </p>
                  ) : null}
                  <p className="text-xs text-mist/70">
                    {t("events.regRegisteredAt")}: {new Date(team.createdAt).toLocaleDateString(intlLocale)}
                    {(team.amountCents ?? 0) > 0 ? ` · ${formatMoney(Math.round((team.amountCents ?? 0) / 100), intlLocale)}` : ""}
                  </p>
                  {team.notes ? <p className="mt-1 text-xs italic text-mist">“{team.notes}”</p> : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <RegistrationStatusBadge status={team.status} />
                  {team.paymentStatus ? <PaymentStatusBadge status={team.paymentStatus} /> : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {team.status === "pending_approval" ? (
                  <Button variant="secondary" onClick={() => manage(team, { action: "approve" })}>
                    {t("events.regApprove")}
                  </Button>
                ) : null}
                {team.paymentStatus === "pending" && team.status !== "waitlisted" && ACTIVE_REGISTRATION_STATUSES.includes(team.status) ? (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      askConfirmation({
                        title: t("events.regMarkPaidTitle", { team: team.teamName }),
                        description: t("events.regMarkPaidDescription"),
                        confirmLabel: t("events.confirmYes"),
                        tone: "primary",
                        run: async () => {
                          await manage(team, { action: "mark_paid" });
                        },
                      })
                    }
                  >
                    {t("events.regMarkPaid")}
                  </Button>
                ) : null}
                {team.paymentStatus === "refund_due" ? (
                  <Button variant="secondary" onClick={() => manage(team, { action: "mark_refunded" })}>
                    {t("events.regMarkRefunded")}
                  </Button>
                ) : null}
                {canChangeTeams && !event.fixtureGeneratedAt && team.status === "confirmed" ? (
                  <label className="flex items-center gap-2 text-xs text-mist">
                    {t("events.regSeed")}
                    <input
                      type="number"
                      min={1}
                      max={event.maxTeams}
                      defaultValue={team.seed ?? ""}
                      onBlur={(blurEvent) => {
                        const raw = blurEvent.target.value.trim();
                        const seed = raw ? Math.trunc(Number(raw)) : null;
                        if (seed !== team.seed && (seed === null || (seed >= 1 && seed <= event.maxTeams))) {
                          void manage(team, { action: "set_seed", seed });
                        }
                      }}
                      className="w-16 rounded-lg border border-white/10 bg-ink/40 px-2 py-1 text-bone"
                    />
                  </label>
                ) : null}
                {canChangeTeams && ACTIVE_REGISTRATION_STATUSES.includes(team.status) ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRejecting(rejecting === team.registrationId ? null : team.registrationId);
                      setReason("");
                    }}
                    className="ml-auto text-xs text-danger hover:underline"
                  >
                    {t("events.regReject")}
                  </button>
                ) : null}
              </div>

              {rejecting === team.registrationId ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={reason}
                    maxLength={300}
                    onChange={(changeEvent) => setReason(changeEvent.target.value)}
                    placeholder={t("events.regRejectReason")}
                    aria-label={t("events.regRejectReason")}
                    className="flex-1 rounded-2xl border border-white/10 bg-ink/40 px-4 py-2.5 text-sm text-bone"
                  />
                  <Button
                    variant="danger"
                    disabled={reason.trim().length < 3}
                    onClick={async () => {
                      if (await manage(team, { action: "reject", reason: reason.trim() })) {
                        setRejecting(null);
                      }
                    }}
                  >
                    {t("events.regReject")}
                  </Button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Propósito: Partidos por fecha/ronda con programación en cancha y carga de resultados.
 */
function MatchesSection({
  detail,
  mutate,
  runAction,
}: {
  detail: EventDetail;
  mutate: (url: string, method: string, body?: unknown) => Promise<boolean>;
  runAction: (input: EventActionInput) => Promise<boolean>;
}) {
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [onlyPending, setOnlyPending] = useState(false);
  const { event, matches } = detail;
  const isInProgress = event.status === "in_progress";
  const totalKnockoutRounds = countKnockoutRounds(matches);
  const groupStageDone =
    event.format === "groups_knockout" &&
    matches.some((match) => match.stage === "group") &&
    matches.filter((match) => match.stage === "group").every(isMatchPlayed) &&
    !matches.some((match) => match.stage === "knockout");
  const anyPlayed = matches.some(isMatchPlayed);
  const blocks = groupMatchesByRound(onlyPending ? matches.filter((match) => !isMatchPlayed(match)) : matches);

  if (matches.length === 0) {
    /**
     * Output:
     * @returns JSX.Element — Sin fixture
     */
    return <p className="text-sm text-mist">{t("events.matchesEmpty")}</p>;
  }

  /**
   * Output:
   * @returns JSX.Element — Gestión de partidos
   */
  return (
    <div className="space-y-6">
      {confirmationDialog}
      {groupStageDone && isInProgress ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-lime/30 bg-lime/10 px-4 py-3">
          <p className="text-sm text-bone">{t("events.knockoutReadyHint")}</p>
          <Button
            onClick={() =>
              askConfirmation({
                title: t("events.confirmKnockoutTitle"),
                description: t("events.confirmKnockoutDescription"),
                confirmLabel: t("events.confirmYes"),
                tone: "primary",
                run: async () => {
                  await runAction({ action: "generate_knockout" });
                },
              })
            }
          >
            {t("events.actionGenerateKnockout")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {[true, false].map((pending) => (
            <button
              key={String(pending)}
              type="button"
              onClick={() => setOnlyPending(pending)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                onlyPending === pending ? "border-lime/50 bg-lime/10 text-lime" : "border-white/10 text-mist",
              )}
            >
              {pending ? t("events.matchFilterPending") : t("events.matchFilterAll")}
            </button>
          ))}
        </div>
        {isInProgress && !anyPlayed ? (
          <button
            type="button"
            onClick={() =>
              askConfirmation({
                title: t("events.confirmRegenerateTitle"),
                description: t("events.confirmRegenerateDescription"),
                confirmLabel: t("events.confirmYes"),
                tone: "danger",
                run: async () => {
                  await runAction({ action: "regenerate_fixture", randomize: true });
                },
              })
            }
            className="text-xs text-mist underline-offset-2 hover:text-bone hover:underline"
          >
            {t("events.actionRegenerate")}
          </button>
        ) : null}
      </div>

      {blocks.map((block) => (
        <section key={block.key} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-lime">
            {getRoundTitle(t, block, totalKnockoutRounds)}
          </h3>
          {block.matches.map((match) => (
            <MatchEditor key={match.matchId} detail={detail} match={match} mutate={mutate} isEditable={isInProgress} />
          ))}
        </section>
      ))}
    </div>
  );
}

/**
 * Propósito: Fila de partido con formularios en línea para programar y cargar resultado.
 */
function MatchEditor({
  detail,
  match,
  mutate,
  isEditable,
}: {
  detail: EventDetail;
  match: EventMatch;
  mutate: (url: string, method: string, body?: unknown) => Promise<boolean>;
  isEditable: boolean;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"none" | "schedule" | "result">("none");
  const [isSaving, setIsSaving] = useState(false);
  const fields = detail.fields ?? [];
  const isPlayed = isMatchPlayed(match);
  const hasTeams = match.homeRegistrationId !== null && match.awayRegistrationId !== null;
  const url = `/api/events/${detail.event.eventId}/matches/${match.matchId}`;

  const [fieldId, setFieldId] = useState<number | null>(match.fieldId ?? fields[0]?.fieldId ?? null);
  const [startsAt, setStartsAt] = useState(() =>
    match.startsAt ? new Date(new Date(match.startsAt).getTime() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "",
  );
  const [duration, setDuration] = useState(detail.event.settings.matchDurationMinutes);
  const [homeScore, setHomeScore] = useState(match.homeScore ?? 0);
  const [awayScore, setAwayScore] = useState(match.awayScore ?? 0);
  const [homePenalties, setHomePenalties] = useState<number | "">(match.homePenalties ?? "");
  const [awayPenalties, setAwayPenalties] = useState<number | "">(match.awayPenalties ?? "");
  const [walkover, setWalkover] = useState(match.status === "walkover");
  const needsPenalties = match.stage === "knockout" && homeScore === awayScore;

  /**
   * Propósito: Guarda la programación (crea o mueve la reserva de cancha).
   */
  async function saveSchedule() {
    if (!fieldId || !startsAt) {
      return;
    }
    setIsSaving(true);
    const ok = await mutate(url, "PUT", {
      kind: "schedule",
      field_id: fieldId,
      starts_at: new Date(startsAt).toISOString(),
      duration_minutes: duration,
    });
    setIsSaving(false);
    if (ok) setMode("none");
  }

  /**
   * Propósito: Guarda el resultado (y avanza la llave).
   */
  async function saveResult() {
    setIsSaving(true);
    const ok = await mutate(url, "PUT", {
      kind: "result",
      home_score: homeScore,
      away_score: awayScore,
      home_penalties: needsPenalties && homePenalties !== "" ? homePenalties : null,
      away_penalties: needsPenalties && awayPenalties !== "" ? awayPenalties : null,
      walkover,
    });
    setIsSaving(false);
    if (ok) setMode("none");
  }

  const actionButton = (label: string, onClick: () => void, tone: "default" | "danger" = "default") => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition",
        tone === "danger" ? "border-danger/30 text-danger hover:bg-danger/10" : "border-white/12 text-bone hover:bg-white/5",
      )}
    >
      {label}
    </button>
  );

  const scoreInput = (value: number | "", onChange: (value: number | "") => void, label: string) => (
    <input
      type="number"
      min={0}
      max={99}
      aria-label={label}
      value={value}
      onChange={(changeEvent) =>
        onChange(changeEvent.target.value === "" ? "" : Math.max(0, Math.min(99, Math.trunc(Number(changeEvent.target.value)))))
      }
      className="w-16 rounded-xl border border-white/10 bg-ink/40 px-2 py-2 text-center font-display text-lg text-bone"
    />
  );

  /**
   * Output:
   * @returns JSX.Element — Partido editable
   */
  return (
    <div className="space-y-2">
      <MatchRow
        match={match}
        actions={
          isEditable && hasTeams ? (
            <div className="flex flex-wrap gap-1.5">
              {!isPlayed ? actionButton(match.startsAt ? t("events.matchReschedule") : t("events.matchSchedule"), () => setMode(mode === "schedule" ? "none" : "schedule")) : null}
              {actionButton(isPlayed ? t("events.matchEditResult") : t("events.matchResult"), () => setMode(mode === "result" ? "none" : "result"))}
            </div>
          ) : null
        }
      />
      {mode === "schedule" ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-pitch p-4">
          {fields.length === 0 ? (
            <p className="text-sm text-mist">{t("events.matchNoFields")}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[1.5fr_1.2fr_0.6fr]">
                <label className="space-y-1">
                  <span className="text-xs text-mist">{t("events.matchField")}</span>
                  <select
                    value={fieldId ?? ""}
                    onChange={(changeEvent) => setFieldId(Number(changeEvent.target.value))}
                    className="w-full rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone"
                  >
                    {fields.map((field) => (
                      <option key={field.fieldId} value={field.fieldId}>
                        {field.name} · {field.establishmentName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-mist">{t("events.matchStartsAt")}</span>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(changeEvent) => setStartsAt(changeEvent.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone [color-scheme:dark]"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-mist">{t("events.matchDuration")}</span>
                  <input
                    type="number"
                    min={20}
                    max={240}
                    value={duration}
                    onChange={(changeEvent) => setDuration(Math.trunc(Number(changeEvent.target.value)))}
                    className="w-full rounded-xl border border-white/10 bg-ink/40 px-3 py-2 text-sm text-bone"
                  />
                </label>
              </div>
              <p className="text-xs text-mist">{t("events.matchScheduleHint")}</p>
              <div className="flex flex-wrap gap-2">
                <Button isLoading={isSaving} onClick={saveSchedule} disabled={!startsAt || !fieldId}>
                  {t("events.matchSave")}
                </Button>
                {match.startsAt ? (
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      if (await mutate(`${url}?kind=schedule`, "DELETE")) setMode("none");
                    }}
                  >
                    {t("events.matchUnschedule")}
                  </Button>
                ) : null}
                <Button variant="ghost" onClick={() => setMode("none")}>
                  {t("events.matchCancel")}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
      {mode === "result" ? (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-pitch p-4">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="max-w-40 truncate text-sm text-bone">{match.homeTeamName}</span>
            {scoreInput(homeScore, (value) => setHomeScore(value === "" ? 0 : value), match.homeTeamName ?? "home")}
            <span className="text-mist">-</span>
            {scoreInput(awayScore, (value) => setAwayScore(value === "" ? 0 : value), match.awayTeamName ?? "away")}
            <span className="max-w-40 truncate text-sm text-bone">{match.awayTeamName}</span>
          </div>
          {needsPenalties ? (
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-mist">
              {t("events.matchPenalties")}
              {scoreInput(homePenalties, setHomePenalties, `${t("events.matchPenalties")} ${match.homeTeamName ?? ""}`)}
              <span>-</span>
              {scoreInput(awayPenalties, setAwayPenalties, `${t("events.matchPenalties")} ${match.awayTeamName ?? ""}`)}
            </div>
          ) : null}
          <label className="flex items-center justify-center gap-2 text-xs text-mist">
            <input type="checkbox" className="accent-lime" checked={walkover} onChange={(changeEvent) => setWalkover(changeEvent.target.checked)} />
            {t("events.matchWalkover")}
          </label>
          <div className="flex flex-wrap justify-center gap-2">
            <Button isLoading={isSaving} onClick={saveResult}>
              {t("events.matchSave")}
            </Button>
            {isPlayed ? (
              <Button
                variant="ghost"
                onClick={async () => {
                  if (await mutate(`${url}?kind=result`, "DELETE")) setMode("none");
                }}
              >
                {t("events.matchClearResult")}
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setMode("none")}>
              {t("events.matchCancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

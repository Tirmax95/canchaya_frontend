"use client";

import { useI18n } from "@/core/i18n/provider";
import {
  ACTIVE_REGISTRATION_STATUSES,
  getFreeSeats,
  type EventDetail,
  type EventTeam,
} from "@/domain/events";
import type { PickupTeam } from "@/domain/pickup";
import { PaymentStatusBadge, RegistrationStatusBadge } from "@/features/events/event-badges";
import { formatEntryFee } from "@/features/events/event-format";
import { Alert } from "@/shared/ui/alert";
import { Button, ButtonLink } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { OpenConversationButton } from "@/features/messaging/open-conversation-button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Panel lateral del jugador en la ficha del evento: estado de sus inscripciones
 * (pagar, retirarse) y formulario para que el capitán inscriba un equipo.
 */
export function EventRegistrationPanel({
  detail,
  captainTeams,
  isLoggedIn,
}: {
  detail: EventDetail;
  captainTeams: PickupTeam[];
  isLoggedIn: boolean;
}) {
  const { t, intlLocale } = useI18n();
  const router = useRouter();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const { event } = detail;
  const activeRegistrations = detail.viewer.myRegistrations.filter((registration) =>
    ACTIVE_REGISTRATION_STATUSES.includes(registration.status),
  );
  const registeredTeamIds = new Set(activeRegistrations.map((registration) => registration.teamId));
  const eligibleTeams = captainTeams.filter((team) => !registeredTeamIds.has(team.id));
  const [teamId, setTeamId] = useState<number | null>(eligibleTeams[0]?.id ?? null);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const fee = formatEntryFee(event, intlLocale);
  const isFull = getFreeSeats(event) === 0;

  /**
   * Propósito: Inscribe el equipo elegido.
   */
  async function register() {
    if (!teamId) {
      return;
    }
    setIsWorking(true);
    setMessage(null);
    const response = await fetch(`/api/events/${event.eventId}/registrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ team_id: teamId, notes: notes.trim() || undefined }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      registration?: { registrationId: number; status: string };
    };
    setIsWorking(false);
    if (!response.ok || !payload.registration) {
      setMessage({ tone: "error", text: payload.message ?? t("events.registerFailed") });
      return;
    }
    if (payload.registration.status === "pending_payment" && detail.onlinePaymentsEnabled) {
      router.push(`/eventos/${event.eventId}/inscripcion/${payload.registration.registrationId}`);
      return;
    }
    setMessage({
      tone: "info",
      text:
        payload.registration.status === "waitlisted"
          ? t("events.registerSuccessWaitlist")
          : t("events.registerSuccess"),
    });
    setNotes("");
    router.refresh();
    /**
     * Output:
     * Side effects — Inscripción creada y ficha refrescada
     */
  }

  /**
   * Propósito: Retira una inscripción propia tras confirmar.
   */
  function requestWithdraw(registration: EventTeam) {
    askConfirmation({
      title: t("events.withdrawTitle"),
      description: t("events.withdrawDescription"),
      confirmLabel: t("events.withdrawConfirm"),
      tone: "danger",
      run: async () => {
        const response = await fetch(`/api/events/registrations/${registration.registrationId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "withdraw" }),
        });
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        if (!response.ok) {
          setMessage({ tone: "error", text: payload.message ?? t("events.actionFailed") });
          return;
        }
        router.refresh();
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal de confirmación
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Panel de inscripción
   */
  return (
    <div className="space-y-4 rounded-[28px] border border-white/8 bg-pitch p-5">
      {confirmationDialog}
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-lime">{t("events.entryFee")}</p>
        <p className="mt-1 font-display text-3xl text-bone">{fee ?? t("events.free")}</p>
        {event.requiresApproval ? (
          <p className="mt-1 text-xs text-mist">{t("events.approvalRequired")}</p>
        ) : null}
      </div>

      {message ? <Alert tone={message.tone === "error" ? undefined : "info"}>{message.text}</Alert> : null}

      {activeRegistrations.length > 0 ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-bone">{t("events.yourRegistration")}</p>
          {activeRegistrations.map((registration) => (
            <div key={registration.registrationId} className="space-y-3 rounded-2xl border border-white/10 bg-ink/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-bone">{registration.teamName}</span>
                <RegistrationStatusBadge status={registration.status} />
              </div>
              <PaymentStatusBadge status={registration.paymentStatus} />
              {registration.status === "pending_payment" ? (
                detail.onlinePaymentsEnabled ? (
                  <ButtonLink
                    href={`/eventos/${event.eventId}/inscripcion/${registration.registrationId}`}
                    className="w-full"
                  >
                    {t("events.payNow")}
                  </ButtonLink>
                ) : (
                  <p className="text-xs leading-5 text-mist">{t("events.payAtVenue")}</p>
                )
              ) : null}
              <OpenConversationButton
                subjectType="event_registration"
                subjectId={registration.registrationId}
                label={t("messaging.writeToOrganizer")}
              />
              {["draft", "registration_open", "registration_closed"].includes(event.status) ? (
                <button
                  type="button"
                  onClick={() => requestWithdraw(registration)}
                  className="text-xs text-danger hover:underline"
                >
                  {t("events.withdraw")}
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {event.isRegistrationOpen ? (
        !isLoggedIn ? (
          <ButtonLink href={`/login?next=/eventos/${event.eventId}`} className="w-full">
            {t("events.registerLogin")}
          </ButtonLink>
        ) : eligibleTeams.length === 0 ? (
          activeRegistrations.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-mist">{t("events.registerNoTeams")}</p>
              <Link href="/equipos" className="text-sm font-semibold text-lime hover:underline">
                {t("events.goToTeams")}
              </Link>
            </div>
          ) : null
        ) : (
          <div className="space-y-3 border-t border-white/8 pt-4">
            <p className="text-sm font-semibold text-bone">{t("events.registerTitle")}</p>
            <p className="text-xs leading-5 text-mist">
              {event.maxPlayersPerTeam
                ? t("events.registerHint", { min: event.minPlayersPerTeam, max: event.maxPlayersPerTeam })
                : t("events.registerHintMin", { min: event.minPlayersPerTeam })}
            </p>
            <label className="block space-y-1.5">
              <span className="text-sm text-mist">{t("events.registerChooseTeam")}</span>
              <select
                value={teamId ?? ""}
                onChange={(changeEvent) => setTeamId(Number(changeEvent.target.value) || null)}
                className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70"
              >
                {eligibleTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.members.length})
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-mist">{t("events.registerNotes")}</span>
              <textarea
                value={notes}
                maxLength={300}
                rows={2}
                onChange={(changeEvent) => setNotes(changeEvent.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm text-bone outline-none focus:border-lime/70"
              />
            </label>
            <Button className="w-full" isLoading={isWorking} onClick={register} disabled={!teamId}>
              {isFull ? t("events.registerSubmitWaitlist") : t("events.registerSubmit")}
            </Button>
            <p className="text-center text-[11px] leading-4 text-mist/70">{t("messaging.contactConsentEvent")}</p>
          </div>
        )
      ) : activeRegistrations.length === 0 ? (
        <p className="text-sm text-mist">{t("events.registerClosed")}</p>
      ) : null}
    </div>
  );
}

/**
 * Propósito: Pestañas simples para secciones de la ficha (sin cambiar de ruta).
 */
export function EventTabs({
  tabs,
}: {
  tabs: Array<{ id: string; label: string; content: React.ReactNode }>;
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  /**
   * Output:
   * @returns JSX.Element — Barra de pestañas + contenido
   */
  return (
    <div className="space-y-5">
      <div role="tablist" className="flex gap-1 overflow-x-auto rounded-full border border-white/8 bg-pitch p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active?.id}
            onClick={() => setActiveId(tab.id)}
            className={
              tab.id === active?.id
                ? "shrink-0 rounded-full bg-lime px-4 py-2 text-sm font-semibold text-ink"
                : "shrink-0 rounded-full px-4 py-2 text-sm text-mist transition hover:text-bone"
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{active?.content}</div>
    </div>
  );
}

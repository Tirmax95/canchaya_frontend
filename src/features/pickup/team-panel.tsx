"use client";

import { useI18n } from "@/core/i18n/provider";
import type { PickupInvite, PickupTeam } from "@/domain/pickup";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { TextField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Crea equipos, responde invitaciones e invita por celular.
 */
export function TeamPanel({
  teams,
  invites,
  userId,
}: {
  teams: PickupTeam[];
  invites: PickupInvite[];
  userId: number;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const captainTeam = teams.find((team) => team.captainId === userId);

  /**
   * Propósito: POST al BFF de equipos y refresca RSC.
   */
  async function post(body: Record<string, unknown>) {
    setError(null);
    const response = await fetch("/api/pickup/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("pickup.teamActionFailed"));
      return;
    }
    router.refresh();
    /**
     * Output:
     * Side effects — Mutación de equipo
     */
  }

  /**
   * Propósito: Pide confirmación antes de aceptar o rechazar una invitación.
   */
  function requestInviteDecision(invite: PickupInvite, action: "accept" | "decline") {
    const teamName = invite.teamName?.trim() || t("pickup.teamInviteFallback");
    const isDecline = action === "decline";
    askConfirmation({
      title: isDecline
        ? t("pickup.declineInviteTitle", { name: teamName })
        : t("pickup.acceptInviteTitle", { name: teamName }),
      description: isDecline
        ? t("pickup.declineInviteDescription")
        : t("pickup.acceptInviteDescription"),
      confirmLabel: isDecline ? t("pickup.declineInviteYes") : t("pickup.acceptInviteYes"),
      tone: isDecline ? "danger" : "primary",
      run: () => post({ action, inviteId: invite.id }),
    });
    /**
     * Output:
     * Side effects — Abre el modal; la invitación no cambia hasta aceptar
     */
  }

  /**
   * Propósito: Busca por teléfono e invita al equipo del capitán.
   */
  async function inviteByPhone(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!captainTeam) return;
    const phone = String(new FormData(event.currentTarget).get("phone") ?? "");
    const response = await fetch(
      `/api/pickup/teams?view=user&phone=${encodeURIComponent(phone)}`,
    );
    const payload = (await response.json()) as {
      user?: { id: number; fullName?: string } | null;
      message?: string;
    };
    if (!response.ok || !payload.user) {
      setError(payload.message ?? t("pickup.phoneNotFound"));
      return;
    }
    await post({
      action: "invite",
      teamId: captainTeam.id,
      userId: payload.user.id,
    });
    setInfo(
      t("pickup.invitedPlayer", {
        name: payload.user.fullName ?? t("pickup.invitedPlayerFallback"),
      }),
    );
    /**
     * Output:
     * Side effects — Invitación enviada
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Panel de equipos
   */
  return (
    <div className="space-y-8">
      {confirmationDialog}
      {error ? <Alert>{error}</Alert> : null}
      {info ? <p className="text-sm text-lime">{info}</p> : null}

      {invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-2xl text-bone">{t("pickup.invitations")}</h2>
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-pitch p-4"
            >
              <p className="text-bone">{invite.teamName ?? t("pickup.teamFallback")}</p>
              <div className="flex gap-2">
                <Button onClick={() => requestInviteDecision(invite, "accept")}>
                  {t("pickup.accept")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => requestInviteDecision(invite, "decline")}
                >
                  {t("pickup.decline")}
                </Button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          const name = String(new FormData(event.currentTarget).get("name") ?? "");
          await post({ name });
        }}
      >
        <TextField label={t("pickup.newTeam")} name="name" required />
        <Button type="submit">{t("pickup.createTeam")}</Button>
      </form>

      {teams.map((team) => (
        <article key={team.id} className="rounded-[28px] border border-white/8 bg-pitch p-5">
          <h3 className="font-display text-2xl text-bone">{team.name}</h3>
          <p className="text-sm text-mist">
            {t("pickup.playersCount", { count: team.members.length })}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-mist">
            {team.members.map((member) => (
              <li key={`${team.id}-${member.userId}`}>
                {member.name ?? t("pickup.playerNumber", { id: member.userId })} · {member.role}
              </li>
            ))}
          </ul>
        </article>
      ))}

      {captainTeam ? (
        <form onSubmit={inviteByPhone} className="flex flex-wrap items-end gap-3">
          <TextField
            label={t("pickup.inviteByPhone")}
            name="phone"
            placeholder="+573001112233"
            required
          />
          <Button type="submit">{t("pickup.inviteButton")}</Button>
        </form>
      ) : null}
    </div>
  );
}

"use client";

import type { TeamInvitation, TeamMember } from "@/data/team.repository";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { TextField } from "@/shared/ui/input";
import { useState } from "react";

/**
 * Propósito: Equipo de un tenant: invitar managers por correo, revocar invitaciones vigentes y
 * retirar managers. El dueño no puede retirarse (el backend lo impide).
 */
export function TeamManager({
  organizationId,
  members,
  invitations,
  isReadOnly,
}: {
  organizationId: number;
  members: TeamMember[];
  invitations: TeamInvitation[];
  isReadOnly: boolean;
}) {
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const teamEndpoint = `/api/organizations/${organizationId}/team`;

  /**
   * Propósito: Envía la invitación y limpia el formulario si salió bien.
   */
  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = String(new FormData(form).get("email") ?? "").trim();
    setInvitedEmail(null);
    const response = await runMutation("invite", `${teamEndpoint}/invitations`, "POST", { email });
    if (response !== null) {
      form.reset();
      setInvitedEmail(email);
    }
    /**
     * Output:
     * Side effects — Invitación enviada o error visible
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Gestión del equipo
   */
  return (
    <div className="space-y-5">
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}

      {isReadOnly ? null : (
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <TextField
              label="Invitar manager"
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder="correo@ejemplo.com"
              hint="Podrá gestionar reservas, sedes y canchas. La invitación vence en 7 días."
            />
          </div>
          <Button type="submit" isLoading={pendingActionKey === "invite"} className="mb-6">
            Enviar invitación
          </Button>
        </form>
      )}
      {invitedEmail ? (
        <p className="text-xs font-semibold text-lime">Invitación enviada a {invitedEmail}</p>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">Miembros</h3>
        <ul className="mt-2 divide-y divide-white/5">
          {members.map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-bone">{member.fullName ?? member.email}</p>
                <p className="text-xs text-mist">
                  {member.email} · {member.role === "owner" ? "Dueño" : "Manager"} desde{" "}
                  {formatDateTime(member.assignedAt)}
                </p>
              </div>
              {member.role === "manager" && !isReadOnly ? (
                <Button
                  variant="secondary"
                  isLoading={pendingActionKey === `remove-${member.userId}`}
                  onClick={() =>
                    runMutation(`remove-${member.userId}`, `${teamEndpoint}/members/${member.userId}`, "DELETE")
                  }
                  className="px-3 py-1.5 text-xs"
                >
                  Retirar
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {invitations.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">Invitaciones pendientes</h3>
          <ul className="mt-2 divide-y divide-white/5">
            {invitations.map((invitation) => (
              <li
                key={invitation.invitationId}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-bone">{invitation.email}</p>
                  <p className="text-xs text-mist">
                    Enviada {formatDateTime(invitation.createdAt)}
                    {invitation.invitedByName ? ` por ${invitation.invitedByName}` : ""} · vence{" "}
                    {formatDateTime(invitation.expiresAt)}
                  </p>
                </div>
                {isReadOnly ? null : (
                  <Button
                    variant="secondary"
                    isLoading={pendingActionKey === `revoke-${invitation.invitationId}`}
                    onClick={() =>
                      runMutation(
                        `revoke-${invitation.invitationId}`,
                        `${teamEndpoint}/invitations/${invitation.invitationId}`,
                        "DELETE",
                      )
                    }
                    className="px-3 py-1.5 text-xs"
                  >
                    Revocar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

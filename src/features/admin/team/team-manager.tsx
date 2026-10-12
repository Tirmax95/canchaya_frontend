"use client";

import { useI18n } from "@/core/i18n/provider";
import type { TeamInvitation, TeamMember } from "@/data/team.repository";
import { usePlatformMutation } from "@/features/admin/platform/use-platform-mutation";
import { formatDateTime } from "@/shared/lib/datetime";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
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
  const { t, intlLocale } = useI18n();
  const { runMutation, pendingActionKey, errorMessage } = usePlatformMutation();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
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
   * Propósito: Pide confirmación antes de quitar a un manager del panel.
   */
  function requestMemberRemoval(member: TeamMember) {
    const memberName = member.fullName?.trim() || member.email;
    askConfirmation({
      title: t("admin.removeMemberTitle", { name: memberName }),
      description: t("platform.removeMemberDescription"),
      confirmLabel: t("platform.removeMemberConfirm"),
      tone: "danger",
      run: async () => {
        await runMutation(
          `remove-${member.userId}`,
          `${teamEndpoint}/members/${member.userId}`,
          "DELETE",
        );
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal; el manager sigue hasta aceptar
     */
  }

  /**
   * Propósito: Pide confirmación antes de invalidar una invitación pendiente.
   */
  function requestInvitationRevoke(invitation: TeamInvitation) {
    askConfirmation({
      title: t("admin.revokeInviteTitle", { email: invitation.email }),
      description: t("platform.revokeDescription"),
      confirmLabel: t("platform.revokeConfirm"),
      tone: "danger",
      run: async () => {
        await runMutation(
          `revoke-${invitation.invitationId}`,
          `${teamEndpoint}/invitations/${invitation.invitationId}`,
          "DELETE",
        );
      },
    });
    /**
     * Output:
     * Side effects — Abre el modal; la invitación sigue vigente hasta aceptar
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Gestión del equipo
   */
  return (
    <div className="space-y-5">
      {confirmationDialog}
      {errorMessage ? <Alert>{errorMessage}</Alert> : null}

      {isReadOnly ? null : (
        <form onSubmit={handleInvite} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <TextField
              label={t("admin.inviteManager")}
              name="email"
              type="email"
              required
              maxLength={160}
              placeholder={t("admin.emailPlaceholder")}
              hint={t("platform.teamInviteHint")}
            />
          </div>
          <Button type="submit" isLoading={pendingActionKey === "invite"} className="mb-6">
            {t("admin.inviteManager")}
          </Button>
        </form>
      )}
      {invitedEmail ? (
        <p className="text-xs font-semibold text-lime">
          {t("platform.inviteSent", { email: invitedEmail })}
        </p>
      ) : null}

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">
          {t("platform.membersHeading")}
        </h3>
        <ul className="mt-2 divide-y divide-white/5">
          {members.map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="text-bone">{member.fullName ?? member.email}</p>
                <p className="text-xs text-mist">
                  {t("platform.memberSince", {
                    email: member.email,
                    role:
                      member.role === "owner"
                        ? t("platform.memberRoleOwner")
                        : t("platform.memberRoleManager"),
                    date: formatDateTime(member.assignedAt, intlLocale),
                  })}
                </p>
              </div>
              {member.role === "manager" && !isReadOnly ? (
                <Button
                  variant="secondary"
                  isLoading={pendingActionKey === `remove-${member.userId}`}
                  onClick={() => requestMemberRemoval(member)}
                  className="px-3 py-1.5 text-xs"
                >
                  {t("platform.removeMemberButton")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {invitations.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-mist">
            {t("platform.pendingInvitations")}
          </h3>
          <ul className="mt-2 divide-y divide-white/5">
            {invitations.map((invitation) => (
              <li
                key={invitation.invitationId}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="text-bone">{invitation.email}</p>
                  <p className="text-xs text-mist">
                    {t("platform.invitationMeta", {
                      date: formatDateTime(invitation.createdAt, intlLocale),
                      by: invitation.invitedByName
                        ? t("platform.invitationBy", { name: invitation.invitedByName })
                        : "",
                      expires: formatDateTime(invitation.expiresAt, intlLocale),
                    })}
                  </p>
                </div>
                {isReadOnly ? null : (
                  <Button
                    variant="secondary"
                    isLoading={pendingActionKey === `revoke-${invitation.invitationId}`}
                    onClick={() => requestInvitationRevoke(invitation)}
                    className="px-3 py-1.5 text-xs"
                  >
                    {t("platform.revokeButton")}
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

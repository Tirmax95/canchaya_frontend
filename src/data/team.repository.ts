import { requestAuthedBackend, requestBackend } from "@/core/http/backend-client";

export interface TeamMember {
  userId: number;
  email: string;
  fullName: string | null;
  role: "owner" | "manager";
  assignedAt: string;
}

export interface TeamInvitation {
  invitationId: number;
  email: string;
  expiresAt: string;
  createdAt: string;
  invitedByName: string | null;
}

export interface InvitationPreview {
  organizationName: string;
  email: string;
  inviterName: string | null;
  expiresAt: string;
}

/**
 * Propósito: Miembros e invitaciones vigentes de un tenant (solo dueño).
 */
export async function getTeam(
  organizationId: number,
): Promise<{ members: TeamMember[]; invitations: TeamInvitation[] }> {
  const payload = await requestAuthedBackend<{ members?: TeamMember[]; invitations?: TeamInvitation[] }>({
    path: `/organization/${organizationId}/team`,
  });
  /**
   * Output:
   * @returns object — Miembros e invitaciones
   */
  return { members: payload.members ?? [], invitations: payload.invitations ?? [] };
}

/**
 * Propósito: Invita a un manager por correo.
 */
export async function inviteTeamMember(organizationId: number, email: string): Promise<void> {
  await requestAuthedBackend<unknown>({
    path: `/organization/${organizationId}/team/invitations`,
    method: "POST",
    body: { email },
  });
  /**
   * Output:
   * Side effects — Invitación creada y correo encolado
   */
}

/**
 * Propósito: Revoca una invitación vigente.
 */
export async function revokeTeamInvitation(organizationId: number, invitationId: number): Promise<void> {
  await requestAuthedBackend<null>({
    path: `/organization/${organizationId}/team/invitations/${invitationId}`,
    method: "DELETE",
  });
  /**
   * Output:
   * Side effects — Invitación revocada
   */
}

/**
 * Propósito: Retira a un manager del tenant.
 */
export async function removeTeamManager(organizationId: number, userId: number): Promise<void> {
  await requestAuthedBackend<null>({
    path: `/organization/${organizationId}/team/members/${userId}`,
    method: "DELETE",
  });
  /**
   * Output:
   * Side effects — Manager retirado
   */
}

/**
 * Propósito: Vista pública de una invitación (no requiere sesión).
 */
export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const payload = await requestBackend<{ invitation: InvitationPreview }>({
    path: `/invitations/preview?token=${encodeURIComponent(token)}`,
  });
  /**
   * Output:
   * @returns InvitationPreview — Tenant, correo invitado e invitador
   */
  return payload.invitation;
}

/**
 * Propósito: Acepta la invitación con la cuenta en sesión.
 */
export async function acceptInvitation(token: string): Promise<{ organizationId: number }> {
  /**
   * Output:
   * @returns object — Tenant al que se unió
   */
  return requestAuthedBackend<{ organizationId: number }>({
    path: "/invitations/accept",
    method: "POST",
    body: { token },
  });
}

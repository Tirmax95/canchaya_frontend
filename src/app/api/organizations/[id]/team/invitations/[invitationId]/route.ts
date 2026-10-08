import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
import { revokeTeamInvitation } from "@/data/team.repository";

/**
 * Propósito: Revoca una invitación vigente.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; invitationId: string }> },
) {
  /**
   * Output:
   * @returns NextResponse — { ok }
   */
  return handleRoute(async () => {
    await requireStaff();
    const params = await context.params;
    await revokeTeamInvitation(
      parsePositiveIntParam(params.id, "organización"),
      parsePositiveIntParam(params.invitationId, "invitación"),
    );
    return { ok: true };
  }, "No se pudo revocar la invitación");
}

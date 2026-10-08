import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { inviteTeamMember } from "@/data/team.repository";
import { inviteMemberSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Invita a un manager al tenant (el backend exige que sea el dueño).
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  /**
   * Output:
   * @returns NextResponse — { ok }
   */
  return handleRoute(async () => {
    await requireStaff();
    const organizationId = parsePositiveIntParam((await context.params).id, "organización");
    const { email } = parseSchema(inviteMemberSchema, await readJsonBody(request));
    await inviteTeamMember(organizationId, email);
    return { ok: true };
  }, "No se pudo enviar la invitación");
}

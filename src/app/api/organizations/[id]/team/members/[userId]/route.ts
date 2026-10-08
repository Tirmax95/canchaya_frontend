import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
import { removeTeamManager } from "@/data/team.repository";

/**
 * Propósito: Retira a un manager del tenant.
 */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; userId: string }> },
) {
  /**
   * Output:
   * @returns NextResponse — { ok }
   */
  return handleRoute(async () => {
    await requireStaff();
    const params = await context.params;
    await removeTeamManager(
      parsePositiveIntParam(params.id, "organización"),
      parsePositiveIntParam(params.userId, "usuario"),
    );
    return { ok: true };
  }, "No se pudo retirar al manager");
}

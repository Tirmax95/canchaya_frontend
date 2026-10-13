import { refreshSession, requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { acceptInvitation } from "@/data/team.repository";
import { invitationTokenSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Acepta una invitación al equipo con la cuenta en sesión y suma el rol manager
 * a la cookie para que el panel se abra sin volver a iniciar sesión.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { redirectTo: "/admin" }
   */
  return handleRoute(async () => {
    const session = await requireSession();
    const { token } = parseSchema(invitationTokenSchema, await readJsonBody(request));
    await acceptInvitation(token);
    await refreshSession({
      roles: session.roles.includes("manager") ? session.roles : [...session.roles, "manager"],
    });
    return { redirectTo: "/admin" };
  }, "No se pudo aceptar la invitación");
}

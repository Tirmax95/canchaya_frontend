import { endImpersonation, getSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import { logoutRemote } from "@/data/auth.repository";

/**
 * Propósito: Sale de "ver como tenant": cierra la sesión de solo lectura en el backend y
 * restaura la del super admin.
 */
export async function POST() {
  /**
   * Output:
   * @returns NextResponse — { redirectTo }
   */
  return handleRoute(async () => {
    const session = await getSession();
    if (session?.isReadOnly) {
      try {
        await logoutRemote(session.sessionId);
      } catch {
        // La sesión de solo lectura puede haber vencido ya en el backend.
      }
    }
    const adminSession = await endImpersonation(session);
    if (adminSession) {
      return { redirectTo: "/admin/tenants" };
    }
    return { redirectTo: session && !session.isReadOnly ? "/admin" : "/login" };
  }, "No se pudo salir de la vista del tenant");
}

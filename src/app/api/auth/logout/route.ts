import { clearSession, getSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import { logoutRemote } from "@/data/auth.repository";

/**
 * Propósito: Cierra sesión remota y borra la cookie local siempre.
 */
export async function POST() {
  /**
   * Output:
   * @returns NextResponse — 204
   */
  return handleRoute(async () => {
    const session = await getSession();
    if (session) {
      try {
        await logoutRemote(session.sessionId);
      } catch {
        // El logout local no debe fallar si el backend ya expiró la sesión.
      }
    }
    await clearSession();
    return { ok: true };
  }, "No se pudo cerrar sesión");
}

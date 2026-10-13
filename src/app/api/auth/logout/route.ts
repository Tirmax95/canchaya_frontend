import { clearSession, getSession, readImpersonationReturnSession } from "@/core/auth/session";
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
    const adminSession = await readImpersonationReturnSession();
    // En "ver como" hay dos sesiones de backend (la de solo lectura y la del super admin
    // guardada en la cookie de retorno): se revocan las dos.
    for (const sessionId of new Set([session?.sessionId, adminSession?.sessionId])) {
      if (!sessionId) {
        continue;
      }
      try {
        await logoutRemote(sessionId);
      } catch {
        // El logout local no debe fallar si el backend ya expiró la sesión.
      }
    }
    await clearSession();
    return { ok: true };
  }, "No se pudo cerrar sesión");
}

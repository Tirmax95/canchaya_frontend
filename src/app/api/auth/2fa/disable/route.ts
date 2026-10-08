import { clearSession, requireSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { disableTwoFactor } from "@/data/auth.repository";
import { parseSchema, twoFactorCodeSchema } from "@/domain/schemas";

/**
 * Propósito: Desactiva el 2FA. El backend cierra todas las sesiones; se borra la cookie.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { ok }
   */
  return handleRoute(async () => {
    await requireSession();
    const { code } = parseSchema(twoFactorCodeSchema, await readJsonBody(request));
    await disableTwoFactor(code);
    await clearSession();
    return { ok: true };
  }, "No se pudo desactivar la verificación");
}

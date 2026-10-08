import { requireSession, writeSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { confirmTwoFactorSetup } from "@/data/auth.repository";
import { parseSchema, twoFactorCodeSchema } from "@/domain/schemas";

/**
 * Propósito: Activa el 2FA y refresca la cookie con los roles completos (el super admin
 * recupera el rol admin en esta misma sesión).
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { recoveryCodes } (se muestran una sola vez)
   */
  return handleRoute(async () => {
    const session = await requireSession();
    const { code } = parseSchema(twoFactorCodeSchema, await readJsonBody(request));
    const { recoveryCodes, roles } = await confirmTwoFactorSetup(code);
    await writeSession({ ...session, roles, twoFactorSetupRequired: false });
    return { recoveryCodes };
  }, "No se pudo activar la verificación");
}

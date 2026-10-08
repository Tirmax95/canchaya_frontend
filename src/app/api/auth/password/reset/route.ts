import { clearSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { resetPassword } from "@/data/auth.repository";
import { parseSchema, resetPasswordSchema } from "@/domain/schemas";

/**
 * Propósito: Fija la contraseña nueva. El backend cierra todas las sesiones, así que la
 * cookie local también se borra.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { ok } o error de token/política
   */
  return handleRoute(async () => {
    const input = parseSchema(resetPasswordSchema, await readJsonBody(request));
    await resetPassword(input.token, input.password);
    await clearSession();
    return { ok: true };
  }, "No se pudo cambiar la contraseña");
}

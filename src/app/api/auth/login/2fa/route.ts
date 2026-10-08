import { AppError } from "@/core/errors/app-error";
import {
  clearTwoFactorChallenge,
  readTwoFactorChallenge,
  toClientUser,
  writeSession,
} from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { completeTwoFactorLogin } from "@/data/auth.repository";
import { parseSchema, twoFactorCodeSchema } from "@/domain/schemas";

/**
 * Propósito: Completa el login con el código de la app autenticadora o uno de respaldo.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { user } o error (el desafío sigue vigente para reintentar)
   */
  return handleRoute(async () => {
    const { code } = parseSchema(twoFactorCodeSchema, await readJsonBody(request));
    const challengeToken = await readTwoFactorChallenge();
    if (!challengeToken) {
      throw new AppError(
        "UNAUTHORIZED",
        "El inicio de sesión expiró. Escribe tu correo y contraseña de nuevo.",
        401,
      );
    }
    const session = await completeTwoFactorLogin(challengeToken, code);
    await clearTwoFactorChallenge();
    await writeSession(session);
    return { user: toClientUser(session), twoFactorSetupRequired: false };
  }, "No se pudo verificar el código");
}

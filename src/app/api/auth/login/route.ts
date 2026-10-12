import {
  clearTwoFactorChallenge,
  toClientUser,
  writeTwoFactorChallenge,
} from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { establishSession, loginUser } from "@/data/auth.repository";
import { loginSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Autentica contra NestJS. Sin 2FA escribe la cookie de sesión; con 2FA guarda
 * el desafío en una cookie httpOnly y pide el código.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { user, twoFactorSetupRequired } | { twoFactorRequired: true } | error
   */
  return handleRoute(async () => {
    const input = parseSchema(loginSchema, await readJsonBody(request));
    const outcome = await loginUser(input);
    if (outcome.kind === "two_factor_challenge") {
      await writeTwoFactorChallenge(outcome.challengeToken);
      return { twoFactorRequired: true };
    }
    await clearTwoFactorChallenge();
    await establishSession(outcome.session);
    return {
      user: toClientUser(outcome.session),
      twoFactorSetupRequired: outcome.session.twoFactorSetupRequired === true,
    };
  }, "No se pudo iniciar sesión");
}

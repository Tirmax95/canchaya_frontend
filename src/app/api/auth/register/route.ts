import { toClientUser, writeSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { loginUser, registerUser } from "@/data/auth.repository";
import { parseSchema, registerSchema } from "@/domain/schemas";

/**
 * Propósito: Crea la cuenta y abre sesión en el mismo request.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — Usuario autenticado
   */
  return handleRoute(async () => {
    const input = parseSchema(registerSchema, await readJsonBody(request));
    await registerUser(input);
    const loginOutcome = await loginUser({
      email: input.email,
      password: input.password,
    });
    if (loginOutcome.kind !== "session") {
      /**
       * Output:
       * @throws AppError 409 — Una cuenta recién creada no debería tener 2FA; que entre por login
       */
      throw new AppError("CONFLICT", "Cuenta creada. Inicia sesión para continuar.", 409);
    }
    await writeSession(loginOutcome.session);
    return { user: toClientUser(loginOutcome.session) };
  }, "No se pudo crear la cuenta");
}

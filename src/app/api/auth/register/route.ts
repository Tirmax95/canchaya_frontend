import { toClientUser, writeSession } from "@/core/auth/session";
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
    const session = await loginUser({
      email: input.email,
      password: input.password,
    });
    await writeSession(session);
    return { user: toClientUser(session) };
  }, "No se pudo crear la cuenta");
}

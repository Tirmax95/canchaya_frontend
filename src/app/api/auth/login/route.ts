import { toClientUser, writeSession } from "@/core/auth/session";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { loginUser } from "@/data/auth.repository";
import { loginSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Autentica contra NestJS y escribe cookie firmada httpOnly.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — Usuario público o error
   */
  return handleRoute(async () => {
    const input = parseSchema(loginSchema, await readJsonBody(request));
    const session = await loginUser(input);
    await writeSession(session);
    return { user: toClientUser(session) };
  }, "No se pudo iniciar sesión");
}

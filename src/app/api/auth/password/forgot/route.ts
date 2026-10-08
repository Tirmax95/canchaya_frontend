import { handleRoute, readJsonBody } from "@/core/http/route";
import { requestPasswordReset } from "@/data/auth.repository";
import { forgotPasswordSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Pide un enlace para restablecer la contraseña.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { message } neutro
   */
  return handleRoute(async () => {
    const { email } = parseSchema(forgotPasswordSchema, await readJsonBody(request));
    return { message: await requestPasswordReset(email) };
  }, "No se pudo enviar el enlace");
}

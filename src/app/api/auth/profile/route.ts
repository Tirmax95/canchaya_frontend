import { refreshSession, requireSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { updateUserProfile } from "@/data/auth.repository";
import { parseSchema, profileSchema } from "@/domain/schemas";

/**
 * Propósito: Actualiza el perfil del usuario autenticado (nunca de otro id).
 */
export async function PUT(request: Request) {
  /**
   * Output:
   * @returns NextResponse — Perfil actualizado
   */
  return handleRoute(async () => {
    const session = await requireSession();
    const input = parseSchema(profileSchema, await readJsonBody(request));
    const isEmailChange = input.email.toLowerCase() !== session.email.toLowerCase();
    if (isEmailChange && !input.currentPassword) {
      /**
       * Output:
       * @throws AppError — Cambiar el correo exige la contraseña actual
       */
      throw new AppError("VALIDATION", "Para cambiar el correo escribe tu contraseña actual", 400);
    }
    const user = await updateUserProfile(session.id, input);
    await refreshSession({ email: user.email, fullName: user.fullName, phone: user.phone });
    return { user };
  }, "No se pudo actualizar el perfil");
}

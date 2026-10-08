import { requireSession, writeSession } from "@/core/auth/session";
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
    const user = await updateUserProfile(session.id, input);
    await writeSession({
      ...session,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
    });
    return { user };
  }, "No se pudo actualizar el perfil");
}

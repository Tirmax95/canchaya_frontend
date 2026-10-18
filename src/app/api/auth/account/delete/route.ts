import { clearSession, requireSession } from "@/core/auth/session";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { deleteOwnAccount } from "@/data/auth.repository";
import { deleteAccountSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Borra la cuenta del usuario en sesión. El usuario sale de la cookie (nunca del
 * body); el middleware ya rechazó el POST si viene de otro sitio. El backend cierra todas las
 * sesiones, así que también se borra la cookie local.
 */
export async function POST(request: Request) {
  /**
   * Output:
   * @returns NextResponse — { ok }
   */
  return handleRoute(async () => {
    const session = await requireSession();
    if (session.isReadOnly) {
      throw new AppError("FORBIDDEN", "No puedes eliminar una cuenta en modo \"ver como\"", 403);
    }
    const { currentPassword, code } = parseSchema(
      deleteAccountSchema,
      await readJsonBody(request),
    );
    await deleteOwnAccount(currentPassword, code);
    await clearSession();
    return { ok: true };
  }, "No se pudo eliminar la cuenta");
}

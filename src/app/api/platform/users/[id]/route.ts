import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { updateUserStatus } from "@/data/platform.repository";
import { parseSchema, userActionSchema } from "@/domain/schemas";

/**
 * Propósito: Super admin bloquea o desbloquea una cuenta.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const userId = parsePositiveIntParam((await context.params).id, "usuario");
    await updateUserStatus(userId, parseSchema(userActionSchema, await readJsonBody(request)));
    /**
     * Output:
     * @returns { ok } — Estado aplicado
     */
    return { ok: true };
  }, "No se pudo actualizar el usuario");
}

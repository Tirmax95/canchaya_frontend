import { AppError } from "@/core/errors/app-error";
import { isAdmin, isStaff } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import type { SessionUser } from "@/domain/user";

/**
 * Propósito: Exige rol de staff antes de mutaciones administrativas.
 */
export async function requireStaff(): Promise<SessionUser> {
  const session = await requireSession();
  if (!isStaff(session)) {
    /**
     * Output:
     * @throws AppError — 403 si el usuario no es staff
     */
    throw new AppError(
      "FORBIDDEN",
      "No tienes permisos para administrar CanchaYa",
      403,
    );
  }

  /**
   * Output:
   * @returns SessionUser — Staff autenticado
   */
  return session;
}

/**
 * Propósito: Exige admin de plataforma (super admin) para las operaciones globales de la plataforma.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const session = await requireSession();
  if (!isAdmin(session) || session.twoFactorSetupRequired || session.isReadOnly) {
    /**
     * Output:
     * @throws AppError — 403 si no es admin con 2FA, o si la sesión es "ver como"
     */
    throw new AppError("FORBIDDEN", "Solo el super admin puede realizar esta acción", 403);
  }
  /**
   * Output:
   * @returns SessionUser — Super admin autenticado
   */
  return session;
}

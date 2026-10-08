import { STAFF_ROLES, type SessionUser, type UserRole } from "@/domain/user";

/**
 * Propósito: Comprueba si el usuario tiene al menos uno de los roles requeridos.
 */
export function hasAnyRole(
  user: Pick<SessionUser, "roles">,
  allowedRoles: readonly UserRole[],
): boolean {
  const allowed = new Set(allowedRoles);
  /**
   * Output:
   * @returns boolean — True si hay intersección de roles
   */
  return user.roles.some((role) => allowed.has(role));
}

/**
 * Propósito: True si es administrador de plataforma.
 */
export function isAdmin(user: Pick<SessionUser, "roles">): boolean {
  /**
   * Output:
   * @returns boolean — True solo para admin global
   */
  return hasAnyRole(user, ["admin"]);
}

/**
 * Propósito: Dueño o manager ve solo sus sedes. Admin y jugadores ven el marketplace.
 */
export function shouldSeeOnlyOwnedVenues(
  user: Pick<SessionUser, "roles"> | null,
): boolean {
  if (!user) {
    /**
     * Output:
     * @returns boolean — Anónimo ve el catálogo público
     */
    return false;
  }
  /**
   * Output:
   * @returns boolean — True si hay que ocultar sedes de otros tenants
   */
  return isStaff(user) && !isAdmin(user);
}

/**
 * Propósito: True para admin, owner o manager. Evita repetir la lista STAFF.
 */
export function isStaff(user: Pick<SessionUser, "roles">): boolean {
  /**
   * Output:
   * @returns boolean — True si puede administrar catálogo/reservas
   */
  return hasAnyRole(user, STAFF_ROLES);
}

/**
 * Propósito: Autoriza una reserva: dueño o staff. Evita IDOR en cancelación/lectura.
 */
export function canManageReservation(
  user: SessionUser,
  reservationUserId: number,
): boolean {
  /**
   * Output:
   * @returns boolean — True si es dueño de la reserva o staff
   */
  return user.id === reservationUserId || isStaff(user);
}

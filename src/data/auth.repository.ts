import { requestAuthedBackend, requestBackend } from "@/core/http/backend-client";
import { AppError } from "@/core/errors/app-error";
import { toPublicUser, toUserRoles } from "@/data/mappers";
import type { LoginInput, ProfileInput, RegisterInput } from "@/domain/schemas";
import type { PublicUser, SessionUser } from "@/domain/user";

interface AuthEnvelope {
  message?: string;
  error?: string;
  status?: number;
  user?: unknown;
  sessionId?: unknown;
  roles?: unknown;
  organizations?: unknown;
}

/**
 * Propósito: Registra jugador o dueño. No persiste passwordHash.
 */
export async function registerUser(input: RegisterInput): Promise<PublicUser> {
  const payload = await requestBackend<AuthEnvelope>({
    path: "/auth/register",
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phone: input.phone || undefined,
      defaultRole: input.isVenueOwner ? "establishment_owner" : "client",
      organizationName: input.isVenueOwner
        ? input.organizationName?.trim()
        : undefined,
    },
  });

  /**
   * Output:
   * @returns PublicUser — Usuario creado, sin secretos
   */
  return toPublicUser((payload.user ?? {}) as object);
}

/**
 * Propósito: Autentica y usa roles/tenants del login. Evita un segundo round-trip.
 */
export async function loginUser(input: LoginInput): Promise<SessionUser> {
  const payload = await requestBackend<AuthEnvelope>({
    path: "/auth/login",
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
    },
  });

  if (typeof payload.sessionId !== "string" || !payload.user) {
    /**
     * Output:
     * @throws AppError — Login incompleto
     */
    throw new AppError("UPSTREAM", "El inicio de sesión no devolvió sesión", 502);
  }

  const roles = toUserRoles(payload.roles);
  /**
   * Output:
   * @returns SessionUser — Usuario + sessionId + roles
   */
  return {
    ...toPublicUser(payload.user as object, roles),
    sessionId: payload.sessionId,
  };
}

/**
 * Propósito: Cierra la sesión remota. Ignora fallos de red en logout local.
 */
export async function logoutRemote(sessionId: string): Promise<void> {
  await requestBackend<AuthEnvelope>({
    path: "/auth/logout",
    method: "POST",
    body: { sessionId },
    sessionId,
  });
  /**
   * Output:
   * Side effects — Invalida la sesión en el backend
   */
}

/**
 * Propósito: Lee el perfil público del usuario autenticado.
 */
export async function getUserById(userId: number): Promise<PublicUser> {
  const payload = await requestAuthedBackend<AuthEnvelope>({
    path: `/auth/user/${userId}`,
    method: "GET",
  });

  /**
   * Output:
   * @returns PublicUser — Perfil sin passwordHash
   */
  return toPublicUser((payload.user ?? {}) as object);
}

/**
 * Propósito: Actualiza el perfil. Solo envía campos allowlisteados.
 */
export async function updateUserProfile(
  userId: number,
  input: ProfileInput,
): Promise<PublicUser> {
  const payload = await requestAuthedBackend<AuthEnvelope>({
    path: `/auth/user/${userId}`,
    method: "PUT",
    body: {
      email: input.email,
      fullName: input.fullName || undefined,
      phone: input.phone || undefined,
    },
  });

  /**
   * Output:
   * @returns PublicUser — Perfil actualizado
   */
  return toPublicUser((payload.user ?? {}) as object);
}

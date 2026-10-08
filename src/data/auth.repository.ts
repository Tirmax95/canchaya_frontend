import { requestBackend } from "@/core/http/backend-client";
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
}

/**
 * Propósito: Registra un usuario y no persiste passwordHash.
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
      defaultRole: input.defaultRole ?? "client",
    },
  });

  /**
   * Output:
   * @returns PublicUser — Usuario creado, sin secretos
   */
  return toPublicUser((payload.user ?? {}) as object);
}

/**
 * Propósito: Autentica, carga roles en paralelo conceptual (1 extra call) y arma la sesión.
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

  const user = toPublicUser(payload.user as object);
  const rolesPayload = await requestBackend<AuthEnvelope>({
    path: `/auth/user/${user.id}/roles`,
    method: "GET",
  });

  /**
   * Output:
   * @returns SessionUser — Usuario + sessionId + roles
   */
  return {
    ...user,
    roles: toUserRoles(rolesPayload.roles),
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
  const payload = await requestBackend<AuthEnvelope>({
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
  const payload = await requestBackend<AuthEnvelope>({
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

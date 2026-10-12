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
  twoFactorRequired?: unknown;
  twoFactorSetupRequired?: unknown;
  challengeToken?: unknown;
}

export type LoginOutcome =
  | { kind: "session"; session: SessionUser }
  | { kind: "two_factor_challenge"; challengeToken: string };

export interface TwoFactorStatus {
  enabled: boolean;
  setupRequired: boolean;
  recoveryCodesRemaining: number;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeDataUrl: string;
}

/**
 * Propósito: Convierte una respuesta con sesión del backend en la sesión del BFF.
 */
export function toSessionUser(payload: AuthEnvelope): SessionUser {
  if (typeof payload.sessionId !== "string" || !payload.user) {
    /**
     * Output:
     * @throws AppError — Respuesta sin sesión
     */
    throw new AppError("UPSTREAM", "El inicio de sesión no devolvió sesión", 502);
  }
  const twoFactor = (payload.user as { twoFactor?: { setupRequired?: unknown } }).twoFactor;
  /**
   * Output:
   * @returns SessionUser — Usuario + sessionId + roles efectivos
   */
  return {
    ...toPublicUser(payload.user as object, toUserRoles(payload.roles)),
    sessionId: payload.sessionId,
    twoFactorSetupRequired:
      payload.twoFactorSetupRequired === true || twoFactor?.setupRequired === true,
  };
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
 * Propósito: Autentica. Devuelve la sesión o, si la cuenta tiene 2FA, el desafío a completar.
 */
export async function loginUser(input: LoginInput): Promise<LoginOutcome> {
  const payload = await requestBackend<AuthEnvelope>({
    path: "/auth/login",
    method: "POST",
    body: {
      email: input.email,
      password: input.password,
    },
  });

  if (payload.twoFactorRequired === true) {
    if (typeof payload.challengeToken !== "string") {
      /**
       * Output:
       * @throws AppError — Desafío incompleto
       */
      throw new AppError("UPSTREAM", "El inicio de sesión no devolvió el desafío", 502);
    }
    /**
     * Output:
     * @returns LoginOutcome — Falta el código de 2FA
     */
    return { kind: "two_factor_challenge", challengeToken: payload.challengeToken };
  }
  /**
   * Output:
   * @returns LoginOutcome — Sesión abierta
   */
  return { kind: "session", session: toSessionUser(payload) };
}

/**
 * Propósito: Segundo paso del login con código TOTP o de respaldo.
 */
export async function completeTwoFactorLogin(
  challengeToken: string,
  code: string,
): Promise<SessionUser> {
  const payload = await requestBackend<AuthEnvelope>({
    path: "/auth/login/2fa",
    method: "POST",
    body: { challengeToken, code },
  });
  /**
   * Output:
   * @returns SessionUser — Sesión abierta
   */
  return toSessionUser(payload);
}

/**
 * Propósito: Pide el enlace de restablecimiento (respuesta neutra exista o no la cuenta).
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const payload = await requestBackend<AuthEnvelope>({
    path: "/auth/password/forgot",
    method: "POST",
    body: { email },
  });
  /**
   * Output:
   * @returns string — Mensaje neutro para mostrar
   */
  return payload.message ?? "Si el correo está registrado, te enviamos un enlace.";
}

/**
 * Propósito: Fija una contraseña nueva con el token del enlace.
 */
export async function resetPassword(token: string, password: string): Promise<void> {
  await requestBackend<AuthEnvelope>({
    path: "/auth/password/reset",
    method: "POST",
    body: { token, password },
  });
  /**
   * Output:
   * Side effects — Contraseña cambiada y sesiones cerradas en el backend
   */
}

/**
 * Propósito: Estado del 2FA del usuario en sesión.
 */
export async function getTwoFactorStatus(): Promise<TwoFactorStatus> {
  const payload = await requestAuthedBackend<{ twoFactor?: Partial<TwoFactorStatus> }>({
    path: "/auth/2fa/status",
  });
  /**
   * Output:
   * @returns TwoFactorStatus — Estado normalizado
   */
  return {
    enabled: payload.twoFactor?.enabled === true,
    setupRequired: payload.twoFactor?.setupRequired === true,
    recoveryCodesRemaining: Number(payload.twoFactor?.recoveryCodesRemaining ?? 0),
  };
}

/**
 * Propósito: Genera secreto + QR para configurar la app autenticadora.
 */
export async function beginTwoFactorSetup(): Promise<TwoFactorSetup> {
  const payload = await requestAuthedBackend<{ setup?: Partial<TwoFactorSetup> }>({
    path: "/auth/2fa/setup",
    method: "POST",
  });
  const { secret, qrCodeDataUrl } = payload.setup ?? {};
  if (typeof secret !== "string" || typeof qrCodeDataUrl !== "string" || !qrCodeDataUrl.startsWith("data:image/png;base64,")) {
    /**
     * Output:
     * @throws AppError — Respuesta incompleta
     */
    throw new AppError("UPSTREAM", "No se pudo generar el código QR", 502);
  }
  /**
   * Output:
   * @returns TwoFactorSetup — Secreto y QR
   */
  return { secret, qrCodeDataUrl };
}

/**
 * Propósito: Confirma el 2FA. Devuelve los códigos de respaldo y los roles ya completos.
 */
export async function confirmTwoFactorSetup(
  code: string,
): Promise<{ recoveryCodes: string[]; roles: SessionUser["roles"] }> {
  const payload = await requestAuthedBackend<{ recoveryCodes?: unknown; roles?: unknown }>({
    path: "/auth/2fa/confirm",
    method: "POST",
    body: { code },
  });
  const recoveryCodes = Array.isArray(payload.recoveryCodes)
    ? payload.recoveryCodes.filter((recoveryCode): recoveryCode is string => typeof recoveryCode === "string")
    : [];
  /**
   * Output:
   * @returns object — Códigos de respaldo y roles efectivos
   */
  return { recoveryCodes, roles: toUserRoles(payload.roles) };
}

/**
 * Propósito: Desactiva el 2FA (el backend cierra todas las sesiones).
 */
export async function disableTwoFactor(code: string): Promise<void> {
  await requestAuthedBackend<AuthEnvelope>({
    path: "/auth/2fa/disable",
    method: "POST",
    body: { code },
  });
  /**
   * Output:
   * Side effects — 2FA desactivado
   */
}

/**
 * Propósito: Cierra la sesión remota. Ignora fallos de red en logout local.
 */
export async function logoutRemote(sessionId: string): Promise<void> {
  await requestBackend<AuthEnvelope>({
    path: "/auth/logout",
    method: "POST",
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

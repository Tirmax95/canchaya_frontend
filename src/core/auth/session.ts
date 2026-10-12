import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getServerEnv } from "@/core/config/env";
import { AppError } from "@/core/errors/app-error";
import type { ClientSessionUser, SessionUser, UserRole } from "@/domain/user";
import { USER_ROLES } from "@/domain/user";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const TWO_FACTOR_CHALLENGE_COOKIE = "canchaya.2fa";
const TWO_FACTOR_CHALLENGE_MAX_AGE_SECONDS = 5 * 60;
const IMPERSONATION_RETURN_COOKIE = "canchaya.return";
export const IMPERSONATION_MAX_AGE_SECONDS = 30 * 60;
export const SESSION_EXPIRED_PATH = "/api/auth/expired";

interface SessionPayload extends SessionUser {
  issuedAt: number;
  /** Caducidad absoluta: el servidor la exige aunque el navegador conserve la cookie. */
  expiresAt: number;
}

/**
 * Contexto de firma: una cookie de sesión no sirve como cookie de retorno de "ver como"
 * (ni al revés), aunque ambas usen el mismo secreto.
 */
type SessionCookieKind = "session" | "return";

/**
 * Propósito: Firma un payload de sesión para impedir que el cliente altere roles o userId.
 */
function signPayload(kind: SessionCookieKind, encodedPayload: string, secret: string): string {
  /**
   * Output:
   * @returns string — HMAC SHA-256 en base64url
   */
  return createHmac("sha256", secret).update(`${kind}|${encodedPayload}`).digest("base64url");
}

/**
 * Propósito: Compara firmas en tiempo constante para evitar timing attacks.
 */
function isValidSignature(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) {
    /**
     * Output:
     * @returns boolean — False si las longitudes no coinciden
     */
    return false;
  }

  /**
   * Output:
   * @returns boolean — True solo si la firma es idéntica
   */
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

/**
 * Propósito: Serializa y firma la sesión para guardarla en cookie httpOnly.
 */
export function encodeSession(
  user: SessionUser,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
  kind: SessionCookieKind = "session",
  expiresAt?: number,
): string {
  const { sessionSecret } = getServerEnv();
  const issuedAt = Date.now();
  const payload: SessionPayload = {
    ...toStoredUser(user),
    issuedAt,
    expiresAt: Math.min(expiresAt ?? Infinity, issuedAt + maxAgeSeconds * 1000),
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  /**
   * Output:
   * @returns string — Cookie value `payload.firma`
   */
  return `${encodedPayload}.${signPayload(kind, encodedPayload, sessionSecret)}`;
}

/**
 * Propósito: Copia solo los campos conocidos de la sesión (no persiste extras ni `expiresAt`
 * heredados de otra cookie).
 */
function toStoredUser(user: SessionUser): SessionUser {
  /**
   * Output:
   * @returns SessionUser — Campos permitidos
   */
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    roles: user.roles,
    sessionId: user.sessionId,
    twoFactorSetupRequired: user.twoFactorSetupRequired === true,
    isReadOnly: user.isReadOnly === true,
  };
}

/**
 * Propósito: Valida firma y forma de la cookie. No confía en el cliente.
 */
export function decodeSession(
  rawCookie: string | undefined,
  kind: SessionCookieKind = "session",
): (SessionUser & { expiresAt: number }) | null {
  if (!rawCookie || rawCookie.length > 8192) {
    /**
     * Output:
     * @returns null — No hay cookie
     */
    return null;
  }

  const [encodedPayload, signature, ...rest] = rawCookie.split(".");
  if (!encodedPayload || !signature || rest.length > 0) {
    return null;
  }

  const { sessionSecret } = getServerEnv();
  const expectedSignature = signPayload(kind, encodedPayload, sessionSecret);
  if (!isValidSignature(signature, expectedSignature)) {
    /**
     * Output:
     * @returns null — Firma inválida o cookie alterada
     */
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (
      !parsed ||
      typeof parsed.id !== "number" ||
      !Number.isInteger(parsed.id) ||
      parsed.id <= 0 ||
      typeof parsed.email !== "string" ||
      typeof parsed.sessionId !== "string" ||
      !Array.isArray(parsed.roles) ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Date.now()
    ) {
      return null;
    }

    const roles = parsed.roles.filter((role): role is UserRole =>
      USER_ROLES.includes(role as UserRole),
    );

    /**
     * Output:
     * @returns SessionUser — Sesión autenticada y sanitizada
     */
    return {
      id: parsed.id,
      email: parsed.email,
      fullName: parsed.fullName,
      phone: parsed.phone,
      roles,
      sessionId: parsed.sessionId,
      twoFactorSetupRequired: parsed.twoFactorSetupRequired === true,
      isReadOnly: parsed.isReadOnly === true,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    /**
     * Output:
     * @returns null — Payload corrupto
     */
    return null;
  }
}

/**
 * Propósito: Quita sessionId antes de devolver el usuario al cliente.
 */
export function toClientUser(session: SessionUser): ClientSessionUser {
  /**
   * Output:
   * @returns ClientSessionUser — Perfil sin identificador de sesión
   */
  return {
    id: session.id,
    email: session.email,
    fullName: session.fullName,
    phone: session.phone,
    roles: session.roles,
    twoFactorSetupRequired: session.twoFactorSetupRequired,
    isReadOnly: session.isReadOnly,
  };
}

/**
 * Propósito: Lee la sesión actual desde la cookie httpOnly del request.
 */
export async function getSession(): Promise<SessionUser | null> {
  const { sessionCookieName } = getServerEnv();
  const store = await cookies();
  /**
   * Output:
   * @returns SessionUser | null — Usuario autenticado o null
   */
  const decoded = decodeSession(store.get(sessionCookieName)?.value);
  if (!decoded) {
    return null;
  }
  return toStoredUser(decoded);
}

/**
 * Propósito: Exige sesión válida antes de una acción protegida.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    /**
     * Output:
     * @throws AppError — 401 si no hay sesión
     */
    throw new AppError("UNAUTHORIZED", "Debes iniciar sesión", 401);
  }

  /**
   * Output:
   * @returns SessionUser — Sesión verificada
   */
  return session;
}

/**
 * Propósito: Persiste la sesión en cookie httpOnly, Secure en producción.
 */
export async function writeSession(
  user: SessionUser,
  maxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
  expiresAt?: number,
): Promise<void> {
  const { sessionCookieName } = getServerEnv();
  const store = await cookies();
  const value = encodeSession(user, maxAgeSeconds, "session", expiresAt);
  const remainingSeconds = expiresAt
    ? Math.max(1, Math.min(maxAgeSeconds, Math.floor((expiresAt - Date.now()) / 1000)))
    : maxAgeSeconds;
  store.set(sessionCookieName, value, buildAuthCookieOptions(remainingSeconds));
  /**
   * Output:
   * Side effects — Escribe cookie firmada; no retorna datos
   */
}

/**
 * Propósito: Elimina la cookie de sesión en logout.
 */
export async function clearSession(): Promise<void> {
  const { sessionCookieName } = getServerEnv();
  const store = await cookies();
  store.delete(sessionCookieName);
  store.delete(IMPERSONATION_RETURN_COOKIE);
  store.delete(TWO_FACTOR_CHALLENGE_COOKIE);
  /**
   * Output:
   * Side effects — Borra la sesión, la cookie del super admin de "ver como" y el desafío 2FA
   */
}

/**
 * Propósito: Opciones comunes de las cookies de autenticación (httpOnly, Secure en prod).
 */
function buildAuthCookieOptions(maxAgeSeconds: number) {
  /**
   * Output:
   * @returns object — Opciones de cookie
   */
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getServerEnv().secureCookies,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/**
 * Propósito: Cuando el backend revocó la sesión, borra la cookie. En un Server Component
 * las cookies no se pueden modificar, así que redirige a la ruta que la borra.
 */
export async function discardExpiredSession(): Promise<void> {
  try {
    await clearSession();
  } catch {
    /**
     * Output:
     * @throws NEXT_REDIRECT — A /api/auth/expired (borra la cookie y lleva al login)
     */
    redirect(SESSION_EXPIRED_PATH);
  }
  /**
   * Output:
   * Side effects — Cookie de sesión eliminada
   */
}

/**
 * Propósito: Guarda el desafío de 2FA en cookie httpOnly: el JS del navegador nunca lo ve.
 */
export async function writeTwoFactorChallenge(challengeToken: string): Promise<void> {
  const store = await cookies();
  store.set(
    TWO_FACTOR_CHALLENGE_COOKIE,
    challengeToken,
    buildAuthCookieOptions(TWO_FACTOR_CHALLENGE_MAX_AGE_SECONDS),
  );
  /**
   * Output:
   * Side effects — Cookie de desafío por 5 minutos
   */
}

/**
 * Propósito: Lee el desafío de 2FA pendiente.
 */
export async function readTwoFactorChallenge(): Promise<string | null> {
  const store = await cookies();
  /**
   * Output:
   * @returns string | null — Token del desafío o null
   */
  return store.get(TWO_FACTOR_CHALLENGE_COOKIE)?.value ?? null;
}

/**
 * Propósito: Borra el desafío de 2FA (completado o abandonado).
 */
export async function clearTwoFactorChallenge(): Promise<void> {
  const store = await cookies();
  store.delete(TWO_FACTOR_CHALLENGE_COOKIE);
  /**
   * Output:
   * Side effects — Cookie eliminada
   */
}

/**
 * Propósito: Entra en "ver como tenant": guarda la cookie firmada del super admin aparte y
 * deja activa la sesión de solo lectura del dueño, ambas por 30 minutos.
 */
export async function beginImpersonation(
  adminSession: SessionUser,
  tenantSession: SessionUser,
): Promise<void> {
  const store = await cookies();
  store.set(
    IMPERSONATION_RETURN_COOKIE,
    encodeSession(adminSession, IMPERSONATION_MAX_AGE_SECONDS, "return"),
    buildAuthCookieOptions(IMPERSONATION_MAX_AGE_SECONDS),
  );
  await writeSession({ ...tenantSession, isReadOnly: true }, IMPERSONATION_MAX_AGE_SECONDS);
  /**
   * Output:
   * Side effects — Cookies de retorno y de sesión "ver como"
   */
}

/**
 * Propósito: Sale de "ver como": si la sesión actual es la de solo lectura, restaura la del
 * super admin guardada (si la firma sigue válida). La cookie de retorno se borra siempre.
 */
export async function endImpersonation(currentSession: SessionUser | null): Promise<SessionUser | null> {
  const store = await cookies();
  const adminSession = decodeSession(store.get(IMPERSONATION_RETURN_COOKIE)?.value, "return");
  store.delete(IMPERSONATION_RETURN_COOKIE);
  if (!currentSession?.isReadOnly) {
    /**
     * Output:
     * @returns null — No había vista de solo lectura activa: no se restaura nada
     */
    return null;
  }
  if (!adminSession) {
    await clearSession();
    /**
     * Output:
     * @returns null — La cookie de retorno no es válida o caducó: vuelve al login
     */
    return null;
  }
  const restored = toStoredUser(adminSession);
  await writeSession(restored);
  /**
   * Output:
   * @returns SessionUser — Sesión del super admin restaurada (el backend revalida el sessionId)
   */
  return restored;
}

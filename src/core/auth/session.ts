import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { getServerEnv } from "@/core/config/env";
import { AppError } from "@/core/errors/app-error";
import type { PublicUser, SessionUser, UserRole } from "@/domain/user";
import { USER_ROLES } from "@/domain/user";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

interface SessionPayload extends SessionUser {
  issuedAt: number;
}

/**
 * Propósito: Firma un payload de sesión para impedir que el cliente altere roles o userId.
 */
function signPayload(encodedPayload: string, secret: string): string {
  /**
   * Output:
   * @returns string — HMAC SHA-256 en base64url
   */
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
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
export function encodeSession(user: SessionUser): string {
  const { sessionSecret, isProduction } = getServerEnv();
  if (isProduction && sessionSecret.length < 32) {
    /**
     * Output:
     * @throws Error — Producción exige un secreto de sesión robusto
     */
    throw new Error(
      "SESSION_SECRET debe tener al menos 32 caracteres en producción",
    );
  }
  const payload: SessionPayload = { ...user, issuedAt: Date.now() };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  /**
   * Output:
   * @returns string — Cookie value `payload.firma`
   */
  return `${encodedPayload}.${signPayload(encodedPayload, sessionSecret)}`;
}

/**
 * Propósito: Valida firma y forma de la cookie. No confía en el cliente.
 */
export function decodeSession(rawCookie: string | undefined): SessionUser | null {
  if (!rawCookie) {
    /**
     * Output:
     * @returns null — No hay cookie
     */
    return null;
  }

  const [encodedPayload, signature] = rawCookie.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const { sessionSecret } = getServerEnv();
  const expectedSignature = signPayload(encodedPayload, sessionSecret);
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
      !Array.isArray(parsed.roles)
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
export function toClientUser(session: SessionUser): PublicUser {
  /**
   * Output:
   * @returns PublicUser — Perfil sin identificador de sesión
   */
  return {
    id: session.id,
    email: session.email,
    fullName: session.fullName,
    phone: session.phone,
    roles: session.roles,
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
  return decodeSession(store.get(sessionCookieName)?.value);
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
export async function writeSession(user: SessionUser): Promise<void> {
  const { sessionCookieName, isProduction } = getServerEnv();
  const store = await cookies();
  store.set(sessionCookieName, encodeSession(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
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
  /**
   * Output:
   * Side effects — Borra la cookie de sesión
   */
}

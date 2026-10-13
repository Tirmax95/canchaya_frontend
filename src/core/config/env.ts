import "server-only";
import { randomBytes } from "crypto";

/** Valores de ejemplo publicados en el repo: firmar con ellos equivale a no firmar. */
const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "change-this-to-a-long-random-secret",
  "canchaya-dev-session-secret-change-me",
]);

/**
 * Propósito: Centraliza y valida la configuración de runtime del BFF.
 * Evita leer process.env disperso y falla rápido si faltan secretos en producción.
 */
function readOptionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  /**
   * Output:
   * @returns string — Valor de entorno o fallback local
   */
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * Propósito: Obliga un secreto robusto; no permite fallback inseguro.
 */
function requireProductionSecret(name: string): string {
  const value = process.env[name]?.trim() ?? "";
  if (value.length < 32 || KNOWN_PLACEHOLDER_SECRETS.has(value)) {
    /**
     * Output:
     * @throws Error — Falta secreto de producción
     */
    throw new Error(`${name} debe tener al menos 32 caracteres (solo es opcional con NODE_ENV=development)`);
  }
  /**
   * Output:
   * @returns string — Secreto validado
   */
  return value;
}

/**
 * Propósito: Secreto de sesión. Fuera de `development` se exige SESSION_SECRET (≥ 32);
 * en desarrollo, sin variable, se genera uno aleatorio por proceso (nunca una constante
 * del repo que permita forjar cookies en un staging mal configurado).
 */
function resolveSessionSecret(nodeEnv: string): string {
  const configured = process.env.SESSION_SECRET?.trim() ?? "";
  const isUsable = configured.length >= 32 && !KNOWN_PLACEHOLDER_SECRETS.has(configured);
  if (nodeEnv !== "development" || isUsable) {
    /**
     * Output:
     * @returns string — Secreto configurado y validado
     */
    return requireProductionSecret("SESSION_SECRET");
  }
  const holder = globalThis as typeof globalThis & { __canchayaDevSessionSecret?: string };
  holder.__canchayaDevSessionSecret ??= randomBytes(32).toString("base64url");
  /**
   * Output:
   * @returns string — Secreto efímero de desarrollo (sobrevive al hot reload)
   */
  return holder.__canchayaDevSessionSecret;
}

/**
 * Propósito: Secreto compartido BFF↔API (opcional). Si se define, debe ser robusto.
 */
function readBffSharedSecret(isProduction: boolean): string | null {
  if (isProduction) {
    if (!process.env.CLIENT_IP_HEADER?.trim()) {
      /**
       * Output:
       * @throws Error — Sin IP real, el rate limit del backend se agota con la IP del BFF
       */
      throw new Error(
        "CLIENT_IP_HEADER es obligatoria en producción (cabecera con la IP real que pone el proxy)",
      );
    }
    return requireProductionSecret("BFF_SHARED_SECRET");
  }
  /**
   * Output:
   * @returns string | null — Secreto validado o null si no se usa (solo fuera de producción)
   */
  return process.env.BFF_SHARED_SECRET?.trim() ? requireProductionSecret("BFF_SHARED_SECRET") : null;
}

/**
 * Propósito: Expone la configuración tipada usada por el servidor Next.js.
 */
export function getServerEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const sessionSecret = resolveSessionSecret(nodeEnv);
  const appUrl = readOptionalEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3001");

  /**
   * Output:
   * @returns ServerEnv — Configuración validada del BFF
   *   - backendUrl: string — Origen del API NestJS
   *   - sessionSecret: string — Clave HMAC de la cookie de sesión
   *   - sessionCookieName: string — Nombre de la cookie httpOnly
   *   - appOrigin: string — Origen público de la web (para validar Origin en mutaciones)
   *   - bffSharedSecret: string | null — Prueba ante el backend de que la IP reenviada es fiable
   *   - secureCookies: boolean — Cookies `Secure` en producción o cuando la web va por https
   *   - isProduction: boolean — True en producción
   */
  return {
    backendUrl: readOptionalEnv("BACKEND_URL", "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
    sessionSecret,
    sessionCookieName: readOptionalEnv(
      "SESSION_COOKIE_NAME",
      "canchaya.session",
    ),
    appOrigin: new URL(appUrl).origin,
    bffSharedSecret: readBffSharedSecret(isProduction),
    secureCookies: isProduction || appUrl.startsWith("https://"),
    isProduction,
  };
}


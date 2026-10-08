/**
 * Propósito: Centraliza y valida la configuración de runtime del BFF.
 * Evita leer process.env disperso y falla rápido si faltan secretos en producción.
 */
function readOptionalEnv(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

/**
 * Propósito: Expone la configuración tipada usada por el servidor Next.js.
 */
export function getServerEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProduction = nodeEnv === "production";
  const sessionSecret = readOptionalEnv(
    "SESSION_SECRET",
    "canchaya-dev-session-secret-change-me",
  );

  /**
   * Output:
   * @returns ServerEnv — Configuración validada del BFF
   *   - backendUrl: string — Origen del API NestJS
   *   - sessionSecret: string — Clave HMAC de la cookie de sesión
   *   - sessionCookieName: string — Nombre de la cookie httpOnly
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
    isProduction,
  };
}

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "CanchaYa";
export const APP_TIMEZONE = "America/Bogota";
export const APP_LOCALE = "es-CO";
export const APP_CURRENCY = "COP";

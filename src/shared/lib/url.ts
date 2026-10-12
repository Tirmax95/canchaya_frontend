/**
 * Propósito: Valida que una URL de imagen sea http(s) absoluta. Evita javascript: y data:.
 */
export function isSafeHttpUrl(value: string | undefined | null): boolean {
  if (!value) {
    /**
     * Output:
     * @returns boolean — False si está vacía
     */
    return false;
  }

  try {
    const url = new URL(value);
    /**
     * Output:
     * @returns boolean — True solo para http/https
     */
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

const INTERNAL_BASE = "http://internal.invalid";

/**
 * Propósito: Acepta solo rutas internas para redirecciones post-login. Evita open redirect
 * con `//evil.com`, `https://...`, `/\\evil.com` y `/%09/evil.com` (los navegadores borran
 * tabs y saltos de línea antes de resolver la URL).
 */
export function toSafeInternalPath(value: string | string[] | undefined | null): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    !candidate ||
    candidate.length > 2048 ||
    !candidate.startsWith("/") ||
    /[\u0000-\u001F\u007F\\]/.test(candidate)
  ) {
    /**
     * Output:
     * @returns null — Vacío, demasiado largo o con caracteres que cambian el destino
     */
    return null;
  }
  let url: URL;
  try {
    url = new URL(candidate, INTERNAL_BASE);
  } catch {
    return null;
  }
  if (url.origin !== INTERNAL_BASE) {
    /**
     * Output:
     * @returns null — La ruta resolvía a otro origen
     */
    return null;
  }
  /**
   * Output:
   * @returns string — Ruta interna normalizada
   */
  return `${url.pathname}${url.search}${url.hash}`;
}

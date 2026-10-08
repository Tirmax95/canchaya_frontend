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

/**
 * Propósito: Acepta solo rutas internas para redirecciones post-login (evita open redirect
 * con `//evil.com` o `https://...`).
 */
export function toSafeInternalPath(value: string | string[] | undefined | null): string | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    /**
     * Output:
     * @returns null — Vacío o no interno
     */
    return null;
  }
  /**
   * Output:
   * @returns string — Ruta interna
   */
  return candidate;
}

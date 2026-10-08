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

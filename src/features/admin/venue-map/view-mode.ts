export const FIELDS_ADMIN_PATH = "/admin/canchas";

export type FieldsViewMode = "lista" | "mapa";

/**
 * Propósito: Normaliza el query param `vista` a un modo conocido (allowlist, por defecto lista).
 */
export function parseFieldsViewMode(rawViewMode: unknown): FieldsViewMode {
  /**
   * Output:
   * @returns FieldsViewMode — "mapa" solo si se pidió explícitamente
   */
  return rawViewMode === "mapa" ? "mapa" : "lista";
}

/**
 * Propósito: Construye la URL del inventario de canchas en el modo pedido.
 */
export function buildFieldsViewHref(viewMode: FieldsViewMode): string {
  /**
   * Output:
   * @returns string — Ruta relativa, p. ej. "/admin/canchas?vista=mapa"
   */
  return viewMode === "mapa" ? `${FIELDS_ADMIN_PATH}?vista=mapa` : FIELDS_ADMIN_PATH;
}

/**
 * Propósito: Añade o reemplaza `fecha` en una ruta relativa conservando el resto de params.
 */
export function withDayParam(baseHref: string, dayIsoDate: string): string {
  const [pathname, queryString = ""] = baseHref.split("?");
  const searchParams = new URLSearchParams(queryString);
  searchParams.set("fecha", dayIsoDate);
  /**
   * Output:
   * @returns string — p. ej. "/admin?fecha=2026-10-08"
   */
  return `${pathname}?${searchParams.toString()}`;
}

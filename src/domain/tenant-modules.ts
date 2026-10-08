/**
 * Módulos del panel de sede configurables por tenant desde el super admin.
 * Debe coincidir con `src/domain/tenant-modules.ts` del backend, que es quien los valida.
 */
export const TENANT_MODULES = [
  "dashboard",
  "establishments",
  "fields",
  "reservations",
] as const;

export type TenantModule = (typeof TENANT_MODULES)[number];

export interface TenantModuleDefinition {
  label: string;
  description: string;
  href: string;
}

export const TENANT_MODULE_DEFINITIONS: Record<TenantModule, TenantModuleDefinition> = {
  dashboard: {
    label: "Dashboard",
    description: "Mapa 3D en vivo con la ocupación de las canchas.",
    href: "/admin",
  },
  establishments: {
    label: "Sedes",
    description: "Crear, editar y eliminar sedes.",
    href: "/admin/establecimientos",
  },
  fields: {
    label: "Canchas",
    description: "Inventario de canchas, precios y vista mapa.",
    href: "/admin/canchas",
  },
  reservations: {
    label: "Reservas",
    description: "Confirmar y cancelar reservas de las canchas.",
    href: "/admin/reservas",
  },
};

const TENANT_MODULE_SET: ReadonlySet<string> = new Set(TENANT_MODULES);

/**
 * Propósito: Allowlist de módulos: descarta claves desconocidas y duplicadas en orden canónico.
 * Si el backend no envía la lista (versión previa), asume el catálogo completo como él.
 */
export function normalizeTenantModules(rawModules: unknown): TenantModule[] {
  if (!Array.isArray(rawModules)) {
    /**
     * Output:
     * @returns TenantModule[] — Catálogo completo por compatibilidad
     */
    return [...TENANT_MODULES];
  }
  const requestedModules = new Set(
    rawModules.filter(
      (value): value is TenantModule =>
        typeof value === "string" && TENANT_MODULE_SET.has(value),
    ),
  );
  /**
   * Output:
   * @returns TenantModule[] — Subconjunto válido en orden de catálogo
   */
  return TENANT_MODULES.filter((tenantModule) => requestedModules.has(tenantModule));
}

/**
 * Propósito: Une los módulos de todas las organizaciones del usuario (un manager puede tener varias).
 */
export function mergeTenantModules(moduleLists: TenantModule[][]): TenantModule[] {
  const mergedModules = new Set(moduleLists.flat());
  /**
   * Output:
   * @returns TenantModule[] — Unión en orden de catálogo
   */
  return TENANT_MODULES.filter((tenantModule) => mergedModules.has(tenantModule));
}

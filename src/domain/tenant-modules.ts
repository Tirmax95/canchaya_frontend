/**
 * Partes del menú del staff configurables por tenant desde el super admin: módulos del panel,
 * secciones de explorar y de cuenta. Debe coincidir con `src/domain/tenant-modules.ts` del
 * backend, que es quien los valida.
 */
export const TENANT_MODULES = [
  "dashboard",
  "establishments",
  "fields",
  "reservations",
  "events",
  "messages",
  "matches",
  "challenges",
  "teams",
  "billing",
  "staff",
] as const;

export type TenantModule = (typeof TENANT_MODULES)[number];

/** Sección del menú lateral donde aparece cada módulo. */
export type TenantModuleSection = "panel" | "explore" | "account";

export interface TenantModuleDefinition {
  label: string;
  description: string;
  href: string;
  section: TenantModuleSection;
}

export const TENANT_MODULE_DEFINITIONS: Record<TenantModule, TenantModuleDefinition> = {
  dashboard: {
    label: "Dashboard",
    description: "Mapa 3D en vivo con la ocupación de las canchas.",
    href: "/admin",
    section: "panel",
  },
  establishments: {
    label: "Sedes",
    description: "Crear, editar y eliminar sedes.",
    href: "/admin/establecimientos",
    section: "panel",
  },
  fields: {
    label: "Canchas",
    description: "Inventario de canchas, precios y vista mapa.",
    href: "/admin/canchas",
    section: "panel",
  },
  reservations: {
    label: "Reservas",
    description: "Confirmar y cancelar reservas de las canchas.",
    href: "/admin/reservas",
    section: "panel",
  },
  events: {
    label: "Eventos",
    description: "Torneos, ligas y eventos abiertos con inscripción, fixture y resultados.",
    href: "/admin/eventos",
    section: "panel",
  },
  messages: {
    label: "Mensajes",
    description: "Conversaciones con jugadores y equipos, con aviso por correo.",
    href: "/mensajes",
    section: "panel",
  },
  matches: {
    label: "Partidos",
    description: "Partidos abiertos para unirse o convocar.",
    href: "/partidos",
    section: "explore",
  },
  challenges: {
    label: "Retos",
    description: "Retos entre equipos.",
    href: "/retos",
    section: "explore",
  },
  teams: {
    label: "Equipos",
    description: "Equipos de jugadores.",
    href: "/equipos",
    section: "explore",
  },
  billing: {
    label: "Mi facturación",
    description: "Facturas de CanchaYa y su pago (solo el dueño).",
    href: "/admin/mi-facturacion",
    section: "account",
  },
  staff: {
    label: "Mi personal",
    description: "Invitar y quitar managers de la sede (solo el dueño).",
    href: "/admin/equipo",
    section: "account",
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

/**
 * Propósito: Módulos habilitados de una sección del menú, en orden de catálogo.
 */
export function modulesInSection(
  enabledModules: readonly TenantModule[],
  section: TenantModuleSection,
): TenantModule[] {
  /**
   * Output:
   * @returns TenantModule[] — Habilitados que pertenecen a esa sección
   */
  return enabledModules.filter(
    (tenantModule) => TENANT_MODULE_DEFINITIONS[tenantModule].section === section,
  );
}

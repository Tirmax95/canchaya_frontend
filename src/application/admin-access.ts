import "server-only";
import { isAdmin, isStaff } from "@/core/auth/roles";
import { getSession, requireSession } from "@/core/auth/session";
import { getMyTenantModuleAccess } from "@/data/organization.repository";
import {
  TENANT_MODULE_DEFINITIONS,
  TENANT_MODULES,
  mergeTenantModules,
  modulesInSection,
  type TenantModule,
} from "@/domain/tenant-modules";
import { redirect } from "next/navigation";
import { cache } from "react";

export const NO_MODULES_PATH = "/admin/sin-modulos";
export const TENANT_BILLING_PATH = "/admin/mi-facturacion";
export const TENANT_TEAM_PATH = "/admin/equipo";

export interface SuspendedTenantNotice {
  organizationName: string;
  reason: string | null;
}

export interface OwnedTenant {
  organizationId: number;
  organizationName: string;
  isOperable: boolean;
}

export interface AdminAccess {
  isSuperAdmin: boolean;
  /** Dueño de al menos un tenant: puede ver su facturación (aun suspendido). */
  isTenantOwner: boolean;
  ownedTenants: OwnedTenant[];
  enabledModules: TenantModule[];
  suspendedTenants: SuspendedTenantNotice[];
  /** Tenants aún sin aprobar: arman su panel pero no salen al público. */
  pendingTenantNames: string[];
  /** Sesión "ver como tenant" del super admin. */
  isReadOnly: boolean;
  /** Nombre visible del contexto: tenant(s) del usuario o "Super admin". */
  workspaceLabel: string;
}

/**
 * Propósito: Resuelve qué puede usar el usuario en el panel en esta request.
 * `cache` deduplica la llamada a /auth/me entre layout y página (1 round-trip por request).
 * El super admin ve todo, salvo en "ver como tenant" (`isReadOnly`), que usa el menú del
 * dueño. El resto ve la unión de módulos de sus tenants operables. Los suspendidos no
 * aportan módulos y se informan aparte, igual que los pendientes.
 */
export const getAdminAccess = cache(async (): Promise<AdminAccess> => {
  const session = await requireSession();
  if (isAdmin(session) && session.isReadOnly !== true) {
    /**
     * Output:
     * @returns AdminAccess — Super admin con todos los módulos
     */
    return {
      isSuperAdmin: true,
      isTenantOwner: false,
      ownedTenants: [],
      enabledModules: [...TENANT_MODULES],
      suspendedTenants: [],
      pendingTenantNames: [],
      isReadOnly: false,
      workspaceLabel: "Super admin",
    };
  }
  const tenantAccess = await getMyTenantModuleAccess();
  const operableTenants = tenantAccess.filter((tenant) => tenant.status !== "suspended");
  /**
   * Output:
   * @returns AdminAccess — Módulos habilitados de tenants activos + avisos de suspensión
   */
  return {
    isSuperAdmin: false,
    isTenantOwner: tenantAccess.some((tenant) => tenant.role === "owner"),
    ownedTenants: tenantAccess
      .filter((tenant) => tenant.role === "owner")
      .map((tenant) => ({
        organizationId: tenant.organizationId,
        organizationName: tenant.organizationName,
        isOperable: tenant.status !== "suspended",
      })),
    enabledModules: mergeTenantModules(operableTenants.map((tenant) => tenant.enabledModules)),
    suspendedTenants: tenantAccess
      .filter((tenant) => tenant.status === "suspended")
      .map((tenant) => ({ organizationName: tenant.organizationName, reason: tenant.suspendedReason })),
    pendingTenantNames: tenantAccess
      .filter((tenant) => tenant.status === "pending")
      .map((tenant) => tenant.organizationName),
    isReadOnly: session.isReadOnly === true,
    workspaceLabel:
      tenantAccess.map((tenant) => tenant.organizationName).join(" · ") || "Mi sede",
  };
});

/**
 * Propósito: Guard de página: si el módulo está deshabilitado redirige al primer módulo permitido
 * (o a la pantalla "sin módulos"), así una URL directa no salta la configuración del tenant.
 */
export async function requireAdminModule(requiredModule: TenantModule): Promise<AdminAccess> {
  const access = await getAdminAccess();
  if (!access.enabledModules.includes(requiredModule)) {
    const fallbackModule = modulesInSection(access.enabledModules, "panel")[0];
    /**
     * Output:
     * @throws NEXT_REDIRECT — Al primer módulo habilitado o a la pantalla sin módulos
     */
    redirect(fallbackModule ? TENANT_MODULE_DEFINITIONS[fallbackModule].href : NO_MODULES_PATH);
  }
  /**
   * Output:
   * @returns AdminAccess — Acceso vigente con el módulo habilitado
   */
  return access;
}

/**
 * Propósito: Guard de páginas exclusivas del super admin. "Ver como tenant" no cuenta:
 * esa sesión es de solo lectura y no debe ver logs ni el resto del panel de plataforma.
 */
export async function requireSuperAdminAccess(): Promise<AdminAccess> {
  const access = await getAdminAccess();
  if (!access.isSuperAdmin || access.isReadOnly) {
    /**
     * Output:
     * @throws NEXT_REDIRECT — Staff de tenant, impersonación o no-admin
     */
    redirect("/admin");
  }
  /**
   * Output:
   * @returns AdminAccess — Super admin con sesión propia
   */
  return access;
}

/**
 * Propósito: Guard de la facturación propia: solo dueños de tenant.
 */
export async function requireTenantOwnerAccess(
  requiredModule?: TenantModule,
): Promise<AdminAccess> {
  const access = await getAdminAccess();
  if (!access.isTenantOwner || (requiredModule && !access.enabledModules.includes(requiredModule))) {
    /**
     * Output:
     * @throws NEXT_REDIRECT — Managers/super admin, o módulo de cuenta deshabilitado
     */
    redirect("/admin");
  }
  /**
   * Output:
   * @returns AdminAccess — Dueño de tenant
   */
  return access;
}

/**
 * Propósito: Guard de Partidos/Retos/Equipos. Un jugador siempre entra; el staff solo si el
 * super admin habilitó ese módulo para su tenant (el menú ya lo oculta, esto cubre la URL).
 */
export async function guardStaffExploreModule(requiredModule: TenantModule): Promise<void> {
  const session = await getSession();
  if (!session || !isStaff(session)) {
    /**
     * Output:
     * Side effects — Visitante o jugador: sin restricción
     */
    return;
  }
  const access = await getAdminAccess().catch(() => null);
  if (access && !access.enabledModules.includes(requiredModule)) {
    const fallbackModule = modulesInSection(access.enabledModules, "panel")[0];
    /**
     * Output:
     * @throws NEXT_REDIRECT — Al primer módulo del panel o a la pantalla sin módulos
     */
    redirect(fallbackModule ? TENANT_MODULE_DEFINITIONS[fallbackModule].href : NO_MODULES_PATH);
  }
  /**
   * Output:
   * Side effects — Módulo habilitado: continúa
   */
}

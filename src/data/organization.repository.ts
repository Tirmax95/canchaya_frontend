import { requestAuthedBackend } from "@/core/http/backend-client";
import { AppError } from "@/core/errors/app-error";
import { TENANT_STATUSES, type TenantStatus } from "@/domain/platform";
import { normalizeTenantModules, type TenantModule } from "@/domain/tenant-modules";

export interface TenantModuleAccess {
  organizationId: number;
  organizationName: string;
  enabledModules: TenantModule[];
  role: "owner" | "manager";
  status: TenantStatus;
  suspendedReason: string | null;
}

export interface ManagedOrganization {
  organizationId: number;
  name: string;
  slug: string;
  enabledModules: TenantModule[];
}

interface RawOrganization {
  organizationId?: unknown;
  id?: unknown;
  name?: unknown;
  slug?: unknown;
  enabledModules?: unknown;
  role?: unknown;
  status?: unknown;
  suspendedReason?: unknown;
}

/**
 * Propósito: Estado de tenant allowlisteado (desconocido → suspendido, el más restrictivo).
 */
function toTenantStatus(rawStatus: unknown): TenantStatus {
  /**
   * Output:
   * @returns TenantStatus — Estado válido
   */
  return TENANT_STATUSES.find((status) => status === rawStatus) ?? "suspended";
}

/**
 * Propósito: Normaliza un tenant crudo del backend (acepta `id` u `organizationId`).
 */
function toManagedOrganization(raw: RawOrganization): ManagedOrganization {
  const organizationId = Number(raw.organizationId ?? raw.id);
  if (!Number.isInteger(organizationId) || organizationId <= 0) {
    /**
     * Output:
     * @throws AppError — El backend devolvió un tenant sin id válido
     */
    throw new AppError("UPSTREAM", "Organización inválida en la respuesta", 502);
  }
  /**
   * Output:
   * @returns ManagedOrganization — Tenant con módulos allowlisteados
   */
  return {
    organizationId,
    name: typeof raw.name === "string" ? raw.name : "Organización",
    slug: typeof raw.slug === "string" ? raw.slug : "",
    enabledModules: normalizeTenantModules(raw.enabledModules),
  };
}

/**
 * Propósito: Lee en vivo (no desde la cookie) los módulos de los tenants del usuario,
 * para que un cambio del super admin aplique sin volver a iniciar sesión.
 */
export async function getMyTenantModuleAccess(): Promise<TenantModuleAccess[]> {
  const payload = await requestAuthedBackend<{ user?: { organizations?: unknown } }>({
    path: "/auth/me",
  });
  const rawOrganizations = Array.isArray(payload.user?.organizations)
    ? (payload.user.organizations as RawOrganization[])
    : [];
  /**
   * Output:
   * @returns TenantModuleAccess[] — Un registro por tenant del usuario
   */
  return rawOrganizations.map((rawOrganization) => {
    const organization = toManagedOrganization(rawOrganization);
    return {
      organizationId: organization.organizationId,
      organizationName: organization.name,
      enabledModules: organization.enabledModules,
      role: rawOrganization.role === "owner" ? "owner" : "manager",
      status: toTenantStatus(rawOrganization.status),
      suspendedReason:
        typeof rawOrganization.suspendedReason === "string" ? rawOrganization.suspendedReason : null,
    };
  });
}

/**
 * Propósito: Reemplaza los módulos habilitados de un tenant.
 */
export async function updateOrganizationModules(
  organizationId: number,
  enabledModules: TenantModule[],
): Promise<ManagedOrganization> {
  const payload = await requestAuthedBackend<{ organization?: unknown }>({
    path: `/organization/${organizationId}/modules`,
    method: "PUT",
    body: { enabled_modules: enabledModules },
  });
  /**
   * Output:
   * @returns ManagedOrganization — Tenant ya persistido
   */
  return toManagedOrganization((payload.organization ?? {}) as RawOrganization);
}

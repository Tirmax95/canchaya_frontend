import { requireSuperAdminAccess } from "@/application/admin-access";
import { listPlatformTenants } from "@/data/platform.repository";
import { TENANT_STATUSES, TENANT_STATUS_LABELS, type TenantStatus } from "@/domain/platform";
import { TenantAdminCard } from "@/features/admin/platform/tenant-admin-card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { cn } from "@/shared/lib/cn";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin · Tenants" };

/**
 * Propósito: Estado del filtro desde la URL (allowlist).
 */
function parseStatusFilter(rawStatus: string | undefined): TenantStatus | null {
  /**
   * Output:
   * @returns TenantStatus | null — null = todos
   */
  return TENANT_STATUSES.find((status) => status === rawStatus) ?? null;
}

/**
 * Propósito: Super admin administra cada tenant: aprobación, plan de cobro, módulos visibles y
 * suspensión.
 */
export default async function TenantsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const [, { estado }] = await Promise.all([requireSuperAdminAccess(), searchParams]);
  const statusFilter = parseStatusFilter(estado);
  const allTenants = await listPlatformTenants();
  const tenants = statusFilter ? allTenants.filter((tenant) => tenant.status === statusFilter) : allTenants;
  const countByStatus = (status: TenantStatus) => allTenants.filter((tenant) => tenant.status === status).length;
  const filterOptions: Array<{ status: TenantStatus | null; label: string }> = [
    { status: null, label: `Todos (${allTenants.length})` },
    ...TENANT_STATUSES.map((status) => ({
      status,
      label: `${TENANT_STATUS_LABELS[status]} (${countByStatus(status)})`,
    })),
  ];

  /**
   * Output:
   * @returns JSX.Element — Lista de tenants administrables
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Plataforma"
        title="Tenants"
        description={`${allTenants.length} organizaciones · ${countByStatus("pending")} por aprobar · ${countByStatus("suspended")} suspendidas. Aprueba nuevos tenants y configura cuánto paga cada uno, qué módulos ve y si puede operar.`}
      />
      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <Link
            key={option.label}
            href={option.status ? `/admin/tenants?estado=${option.status}` : "/admin/tenants"}
            aria-current={option.status === statusFilter ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs transition",
              option.status === statusFilter
                ? "border-lime/50 bg-lime/15 text-lime"
                : "border-white/10 text-mist hover:text-bone",
            )}
          >
            {option.label}
          </Link>
        ))}
      </nav>
      {tenants.length === 0 ? (
        <EmptyState title="No hay tenants" description="Cuando un dueño registre su sede aparecerá aquí." />
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => (
            <TenantAdminCard key={tenant.organizationId} tenant={tenant} />
          ))}
        </div>
      )}
    </div>
  );
}

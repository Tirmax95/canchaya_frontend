import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { TENANT_STATUS_KEYS, translateMappedLabel } from "@/core/i18n/label-keys";
import { listPlatformTenants } from "@/data/platform.repository";
import { TENANT_STATUSES, type TenantStatus } from "@/domain/platform";
import { TenantAdminCard } from "@/features/admin/platform/tenant-admin-card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { cn } from "@/shared/lib/cn";
import type { Metadata } from "next";
import Link from "next/link";

/**
 * Propósito: Metadata del listado de tenants.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.tenantsMeta") };
}

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
  const [{ t }, , { estado }] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    searchParams,
  ]);
  const statusFilter = parseStatusFilter(estado);
  const allTenants = await listPlatformTenants();
  const tenants = statusFilter ? allTenants.filter((tenant) => tenant.status === statusFilter) : allTenants;
  const countByStatus = (status: TenantStatus) => allTenants.filter((tenant) => tenant.status === status).length;
  const filterOptions: Array<{ status: TenantStatus | null; label: string }> = [
    { status: null, label: `${t("platform.allFilter")} (${allTenants.length})` },
    ...TENANT_STATUSES.map((status) => ({
      status,
      label: `${translateMappedLabel(t, TENANT_STATUS_KEYS, status)} (${countByStatus(status)})`,
    })),
  ];

  /**
   * Output:
   * @returns JSX.Element — Lista de tenants administrables
   */
  return (
    <div className="space-y-8">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("platform.tenantsTitle")}
        description={t("platform.tenantsPageDescription", {
          total: allTenants.length,
          pending: countByStatus("pending"),
          suspended: countByStatus("suspended"),
        })}
      />
      <nav aria-label={t("platform.tenantsFilter")} className="flex flex-wrap gap-2">
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
        <EmptyState
          title={t("platform.tenantsEmptyTitle")}
          description={t("platform.tenantsEmptyDescription")}
        />
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

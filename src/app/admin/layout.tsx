import { TENANT_BILLING_PATH, TENANT_TEAM_PATH, getAdminAccess } from "@/application/admin-access";
import { isStaff } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { translateTenantModuleLabel } from "@/core/i18n/label-keys";
import type { TranslateFn } from "@/core/i18n/translate";
import { TENANT_MODULE_DEFINITIONS, type TenantModule } from "@/domain/tenant-modules";
import { AdminShell, type AdminMenuItem } from "@/features/admin/admin-shell";
import { redirect } from "next/navigation";

/**
 * Propósito: Menú del super admin con etiquetas localizadas.
 */
function buildSuperAdminMenuItems(t: TranslateFn): AdminMenuItem[] {
  /**
   * Output:
   * @returns AdminMenuItem[] — Enlaces de plataforma
   */
  return [
    { href: "/admin/plataforma", label: t("admin.overview"), icon: "overview" },
    { href: "/admin/tenants", label: t("admin.tenants"), icon: "tenants" },
    { href: "/admin/facturacion", label: t("admin.billing"), icon: "billing" },
    { href: "/admin/pagos", label: t("admin.payments"), icon: "payments" },
    { href: "/admin/usuarios", label: t("admin.users"), icon: "users" },
    { href: "/admin/reportes", label: t("admin.reports"), icon: "reports" },
    { href: "/admin/correos", label: t("admin.emails"), icon: "emails" },
    { href: "/admin/auditoria", label: t("admin.audit"), icon: "audit" },
    { href: "/admin/logs", label: t("admin.logs"), icon: "logs" },
  ];
}

/**
 * Propósito: Menú de cuenta del dueño del tenant (facturación y equipo).
 */
function buildTenantOwnerMenuItems(t: TranslateFn): AdminMenuItem[] {
  /**
   * Output:
   * @returns AdminMenuItem[] — Enlaces de cuenta
   */
  return [
    { href: TENANT_BILLING_PATH, label: t("admin.myBilling"), icon: "billing" },
    { href: TENANT_TEAM_PATH, label: t("admin.team"), icon: "team" },
  ];
}

/**
 * Propósito: Shell admin. Exige staff y arma el menú con los módulos que el super admin
 * habilitó para el tenant. Cada página vuelve a validar su acceso y el backend cada operación.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  if (session.twoFactorSetupRequired) {
    redirect("/seguridad");
  }
  if (!isStaff(session)) {
    redirect("/reservas");
  }
  const [{ t }, access] = await Promise.all([getTranslator(), getAdminAccess()]);
  const moduleMenuItems: AdminMenuItem[] = access.enabledModules.map((tenantModule) => ({
    href: TENANT_MODULE_DEFINITIONS[tenantModule].href,
    label: translateTenantModuleLabel(t, tenantModule as TenantModule),
    icon: tenantModule,
  }));
  const accountMenuItems = access.isSuperAdmin
    ? buildSuperAdminMenuItems(t)
    : access.isTenantOwner
      ? buildTenantOwnerMenuItems(t)
      : [];

  /**
   * Output:
   * @returns JSX.Element — Layout con menú lateral filtrado por tenant
   */
  return (
    <AdminShell
      workspaceLabel={access.workspaceLabel}
      moduleMenuItems={moduleMenuItems}
      accountMenuTitle={access.isSuperAdmin ? t("admin.platform") : t("admin.account")}
      accountMenuItems={accountMenuItems}
      suspendedTenants={access.suspendedTenants}
      pendingTenantNames={access.pendingTenantNames}
      isReadOnly={access.isReadOnly}
    >
      {children}
    </AdminShell>
  );
}

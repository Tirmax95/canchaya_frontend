import { TENANT_BILLING_PATH, TENANT_TEAM_PATH, getAdminAccess } from "@/application/admin-access";
import { isStaff } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { AdminShell, type AdminMenuItem } from "@/features/admin/admin-shell";
import { TENANT_MODULE_DEFINITIONS } from "@/domain/tenant-modules";
import { redirect } from "next/navigation";

const SUPER_ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { href: "/admin/plataforma", label: "Resumen", icon: "overview" },
  { href: "/admin/tenants", label: "Tenants", icon: "tenants" },
  { href: "/admin/facturacion", label: "Facturación", icon: "billing" },
  { href: "/admin/usuarios", label: "Usuarios", icon: "users" },
  { href: "/admin/reportes", label: "Reportes", icon: "reports" },
  { href: "/admin/correos", label: "Correos", icon: "emails" },
  { href: "/admin/auditoria", label: "Auditoría", icon: "audit" },
];

const TENANT_OWNER_MENU_ITEMS: AdminMenuItem[] = [
  { href: TENANT_BILLING_PATH, label: "Mi facturación", icon: "billing" },
  { href: TENANT_TEAM_PATH, label: "Equipo", icon: "team" },
];

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
  const access = await getAdminAccess();
  const moduleMenuItems: AdminMenuItem[] = access.enabledModules.map((tenantModule) => ({
    href: TENANT_MODULE_DEFINITIONS[tenantModule].href,
    label: TENANT_MODULE_DEFINITIONS[tenantModule].label,
    icon: tenantModule,
  }));
  const accountMenuItems = access.isSuperAdmin
    ? SUPER_ADMIN_MENU_ITEMS
    : access.isTenantOwner
      ? TENANT_OWNER_MENU_ITEMS
      : [];

  /**
   * Output:
   * @returns JSX.Element — Layout con menú lateral filtrado por tenant
   */
  return (
    <AdminShell
      workspaceLabel={access.workspaceLabel}
      moduleMenuItems={moduleMenuItems}
      accountMenuTitle={access.isSuperAdmin ? "Plataforma" : "Cuenta"}
      accountMenuItems={accountMenuItems}
      suspendedTenants={access.suspendedTenants}
      pendingTenantNames={access.pendingTenantNames}
      isReadOnly={access.isReadOnly}
    >
      {children}
    </AdminShell>
  );
}

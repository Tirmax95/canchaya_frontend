import { getAdminAccess } from "@/application/admin-access";
import { isStaff } from "@/core/auth/roles";
import { requireSession } from "@/core/auth/session";
import { AdminShell } from "@/features/admin/admin-shell";
import { redirect } from "next/navigation";

/**
 * Propósito: Shell admin. Exige staff y muestra los avisos del tenant. El menú lateral (con
 * solo los módulos que el super admin habilitó) lo arma el layout raíz; cada página vuelve a
 * validar su acceso y el backend cada operación.
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

  /**
   * Output:
   * @returns JSX.Element — Contenido admin con avisos del tenant
   */
  return (
    <AdminShell
      workspaceLabel={access.workspaceLabel}
      suspendedTenants={access.suspendedTenants}
      pendingTenantNames={access.pendingTenantNames}
      isReadOnly={access.isReadOnly}
    >
      {children}
    </AdminShell>
  );
}

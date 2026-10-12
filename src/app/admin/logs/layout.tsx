import { requireSuperAdminAccess } from "@/application/admin-access";

/**
 * Propósito: Los logs del sistema solo los ve el super admin. Dueños, managers y
 * sesiones de "ver como tenant" salen al dashboard.
 */
export default async function PlatformLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminAccess();
  /**
   * Output:
   * @returns React.ReactNode — Página de logs, o redirect a /admin
   */
  return children;
}

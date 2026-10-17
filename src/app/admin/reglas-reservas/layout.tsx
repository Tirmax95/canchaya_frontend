import { requireSuperAdminAccess } from "@/application/admin-access";

/**
 * Propósito: Las reglas de reserva de la plataforma solo las ve el super admin.
 */
export default async function BookingRulesLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdminAccess();
  /**
   * Output:
   * @returns React.ReactNode — Página de reglas, o redirect a /admin
   */
  return children;
}

import { requireSuperAdminAccess } from "@/application/admin-access";

/**
 * Propósito: La configuración de pasarelas y el cobro por tenant solo los ve el super admin.
 */
export default async function PaymentGatewaysLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireSuperAdminAccess();
  /**
   * Output:
   * @returns React.ReactNode — Página de pagos, o redirect a /admin
   */
  return children;
}

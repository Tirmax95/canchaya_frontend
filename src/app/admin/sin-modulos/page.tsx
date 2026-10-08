import { TENANT_BILLING_PATH, getAdminAccess } from "@/application/admin-access";
import { EmptyState } from "@/shared/ui/empty-state";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Admin · Sin módulos" };

/**
 * Propósito: Destino cuando el tenant no tiene módulos operables: suspendido o sin módulos habilitados.
 */
export default async function NoModulesPage() {
  const access = await getAdminAccess();
  const isSuspended = access.suspendedTenants.length > 0;

  /**
   * Output:
   * @returns JSX.Element — Estado vacío explicativo
   */
  return (
    <EmptyState
      title={isSuspended ? "Tu cuenta está suspendida" : "Sin módulos habilitados"}
      description={
        isSuspended
          ? "Mientras la suspensión esté activa no puedes operar tus sedes. Revisa tus facturas pendientes o contacta al equipo de CanchaYa."
          : "Tu organización aún no tiene módulos activos en el panel. Contacta al administrador de CanchaYa para habilitarlos."
      }
      action={
        isSuspended && access.isTenantOwner ? (
          <Link href={TENANT_BILLING_PATH} className="text-lime hover:underline">
            Ver mis facturas
          </Link>
        ) : undefined
      }
    />
  );
}

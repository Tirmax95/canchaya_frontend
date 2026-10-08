import { requireSuperAdmin } from "@/core/auth/guards";
import { beginImpersonation } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
import { impersonateTenant } from "@/data/platform.repository";

/**
 * Propósito: "Ver como tenant": abre una sesión de solo lectura del dueño y guarda la del
 * super admin para volver con "Salir".
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  /**
   * Output:
   * @returns NextResponse — { redirectTo: "/admin" }
   */
  return handleRoute(async () => {
    const adminSession = await requireSuperAdmin();
    const organizationId = parsePositiveIntParam((await context.params).id, "organización");
    const tenantSession = await impersonateTenant(organizationId);
    await beginImpersonation(adminSession, tenantSession);
    return { redirectTo: "/admin" };
  }, "No se pudo abrir la vista del tenant");
}

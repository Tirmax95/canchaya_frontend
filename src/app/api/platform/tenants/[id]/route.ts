import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import {
  updateTenantBilling,
  updateTenantOnlinePayments,
  updateTenantStatus,
} from "@/data/platform.repository";
import { parseSchema, tenantActionSchema } from "@/domain/schemas";

/**
 * Propósito: Acciones del super admin sobre un tenant: aprobar, suspender, reactivar,
 * cambiar su plan o encender el cobro en línea.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const organizationId = parsePositiveIntParam((await context.params).id, "organización");
    const tenantAction = parseSchema(tenantActionSchema, await readJsonBody(request));
    if (tenantAction.action === "billing") {
      await updateTenantBilling(organizationId, {
        monthlyFee: tenantAction.monthlyFee,
        commissionBps: tenantAction.commissionBps,
        billingEmail: tenantAction.billingEmail || undefined,
      });
    } else if (tenantAction.action === "online_payments") {
      await updateTenantOnlinePayments(organizationId, tenantAction.isEnabled);
    } else {
      await updateTenantStatus(organizationId, tenantAction);
    }
    /**
     * Output:
     * @returns { ok } — Acción aplicada
     */
    return { ok: true };
  }, "No se pudo actualizar el tenant");
}

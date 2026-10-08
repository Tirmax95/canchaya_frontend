import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam, readJsonBody } from "@/core/http/route";
import { updateInvoice } from "@/data/platform.repository";
import { invoiceActionSchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: Super admin registra el pago de una factura o la anula.
 */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const invoiceId = parsePositiveIntParam((await context.params).id, "factura");
    const invoiceAction = parseSchema(invoiceActionSchema, await readJsonBody(request));
    /**
     * Output:
     * @returns { invoice } — Factura con estado nuevo
     */
    return { invoice: await updateInvoice(invoiceId, invoiceAction) };
  }, "No se pudo actualizar la factura");
}

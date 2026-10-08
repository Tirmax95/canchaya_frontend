import { requireSuperAdmin } from "@/core/auth/guards";
import { requestAuthedBackendFile } from "@/core/http/backend-client";
import { handleFileRoute, parsePositiveIntParam } from "@/core/http/route";

/**
 * Propósito: PDF de cualquier factura (super admin).
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  /**
   * Output:
   * @returns NextResponse — application/pdf o error JSON
   */
  return handleFileRoute(
    async () => {
      await requireSuperAdmin();
      const invoiceId = parsePositiveIntParam((await context.params).id, "factura");
      return requestAuthedBackendFile(`/platform/invoices/${invoiceId}/pdf`);
    },
    "factura.pdf",
    "No se pudo descargar la factura",
  );
}

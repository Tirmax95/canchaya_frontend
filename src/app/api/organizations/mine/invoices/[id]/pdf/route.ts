import { requireSession } from "@/core/auth/session";
import { requestAuthedBackendFile } from "@/core/http/backend-client";
import { handleFileRoute, parsePositiveIntParam } from "@/core/http/route";

/**
 * Propósito: PDF de una factura propia (el backend valida que sea del dueño).
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
      await requireSession();
      const invoiceId = parsePositiveIntParam((await context.params).id, "factura");
      return requestAuthedBackendFile(`/organization/mine/invoices/${invoiceId}/pdf`);
    },
    "factura.pdf",
    "No se pudo descargar la factura",
  );
}

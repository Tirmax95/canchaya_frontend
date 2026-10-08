import { AppError } from "@/core/errors/app-error";
import { requireSession } from "@/core/auth/session";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
import { createInvoiceCheckout } from "@/data/platform.repository";

/**
 * Propósito: Inicia el pago en línea de una factura propia y devuelve la URL de Wompi.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  /**
   * Output:
   * @returns NextResponse — { checkoutUrl }
   */
  return handleRoute(async () => {
    await requireSession();
    const invoiceId = parsePositiveIntParam((await context.params).id, "factura");
    const { checkoutUrl } = await createInvoiceCheckout(invoiceId);
    if (!checkoutUrl) {
      throw new AppError("UPSTREAM", "La pasarela no devolvió una URL de pago válida", 502);
    }
    return { checkoutUrl };
  }, "No se pudo iniciar el pago");
}

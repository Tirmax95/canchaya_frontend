import { requireSession } from "@/core/auth/session";
import { handleRoute } from "@/core/http/route";
import { beginTwoFactorSetup } from "@/data/auth.repository";

/**
 * Propósito: Genera el QR para configurar la verificación en dos pasos.
 */
export async function POST() {
  /**
   * Output:
   * @returns NextResponse — { setup: { secret, qrCodeDataUrl } }
   */
  return handleRoute(async () => {
    await requireSession();
    return { setup: await beginTwoFactorSetup() };
  }, "No se pudo iniciar la configuración");
}

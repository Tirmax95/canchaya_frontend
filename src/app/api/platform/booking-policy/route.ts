import { requireSuperAdmin } from "@/core/auth/guards";
import { handleRoute, readJsonBody } from "@/core/http/route";
import { updateBookingPolicy } from "@/data/platform.repository";
import { bookingPolicySchema, parseSchema } from "@/domain/schemas";

/**
 * Propósito: El super admin reemplaza las reglas de reserva (vencimiento, intervalo, tope).
 */
export async function PUT(request: Request) {
  return handleRoute(async () => {
    await requireSuperAdmin();
    const policy = parseSchema(bookingPolicySchema, await readJsonBody(request));
    /**
     * Output:
     * @returns { policy } — Política guardada
     */
    return { policy: await updateBookingPolicy(policy) };
  }, "No se pudieron guardar las reglas de reserva");
}

import { requireStaff } from "@/core/auth/guards";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
import { getReservationContact } from "@/data/messaging.repository";

/**
 * Propósito: Contacto de quien reservó. Solo staff; el backend exige que la cancha sea de su
 * tenant, limita la ventana de tiempo y deja registro en auditoría.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleRoute(async () => {
    await requireStaff();
    const reservationId = parsePositiveIntParam((await context.params).id, "reserva");
    /**
     * Output:
     * @returns { contact } — Nombre, correo, teléfono y WhatsApp
     */
    return { contact: await getReservationContact(reservationId) };
  }, "No se pudo cargar el contacto");
}

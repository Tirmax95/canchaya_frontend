import { APP_TIMEZONE } from "@/core/config/env";
import { AppError } from "@/core/errors/app-error";
import { handleRoute } from "@/core/http/route";
import { listReservationsByField } from "@/data/reservation.repository";
import { buildDaySlots } from "@/domain/booking";

/**
 * Propósito: Devuelve franjas del día para una cancha en una sola query.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return handleRoute(async () => {
    const fieldId = Number((await context.params).id);
    const date = new URL(request.url).searchParams.get("date") ?? "";
    if (!Number.isInteger(fieldId) || fieldId <= 0) {
      throw new AppError("VALIDATION", "Cancha inválida", 400);
    }
    const reservations = await listReservationsByField(fieldId);
    return { slots: buildDaySlots(date, reservations, APP_TIMEZONE) };
  }, "No se pudo cargar la disponibilidad");
}

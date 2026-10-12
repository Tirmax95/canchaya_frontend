import { APP_TIMEZONE } from "@/core/config/env";
import { AppError } from "@/core/errors/app-error";
import { handleRoute, parsePositiveIntParam } from "@/core/http/route";
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
    const fieldId = parsePositiveIntParam((await context.params).id, "cancha");
    const date = new URL(request.url).searchParams.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError("VALIDATION", "Fecha inválida", 400);
    }
    const reservations = await listReservationsByField(fieldId);
    return { slots: buildDaySlots(date, reservations, APP_TIMEZONE) };
  }, "No se pudo cargar la disponibilidad");
}

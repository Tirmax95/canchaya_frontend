import { requireSuperAdmin } from "@/core/auth/guards";
import { AppError, serializeAppError, toAppError } from "@/core/errors/app-error";
import { getReservationsReport, getTenantPeriodReport } from "@/data/platform.repository";
import { APP_UTC_OFFSET } from "@/domain/booking";
import { isBillingPeriod } from "@/domain/platform";
import { toCsv } from "@/shared/lib/csv";
import { NextResponse } from "next/server";

const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Propósito: Convierte un día calendario local (Bogotá) al instante de su medianoche.
 */
function parseLocalDay(rawDay: string | null, parameterName: string): Date {
  const parsedDay = rawDay && CALENDAR_DATE_PATTERN.test(rawDay) ? new Date(`${rawDay}T00:00:00${APP_UTC_OFFSET}`) : null;
  if (!parsedDay || Number.isNaN(parsedDay.getTime())) {
    /**
     * Output:
     * @throws AppError — Fecha ausente o mal formada
     */
    throw new AppError("VALIDATION", `Parámetro ${parameterName} inválido (YYYY-MM-DD)`, 400);
  }
  /**
   * Output:
   * @returns Date — Medianoche local del día
   */
  return parsedDay;
}

/**
 * Propósito: CSV de reservas en [from, to] (días inclusive).
 */
async function buildReservationsCsv(searchParams: URLSearchParams) {
  const fromDay = parseLocalDay(searchParams.get("from"), "from");
  const toDayExclusive = new Date(parseLocalDay(searchParams.get("to"), "to").getTime() + DAY_MS);
  const { rows } = await getReservationsReport(fromDay.toISOString(), toDayExclusive.toISOString());
  /**
   * Output:
   * @returns { fileName, csv } — Reporte de reservas
   */
  return {
    fileName: `reservas_${searchParams.get("from")}_${searchParams.get("to")}.csv`,
    csv: toCsv(
      ["Reserva", "Inicio", "Fin", "Estado", "Horas", "Valor estimado (COP)", "Cancha", "Sede", "Tenant", "Jugador"],
      rows.map((row) => [
        row.reservationId,
        row.startTime,
        row.endTime,
        row.status,
        row.bookedHours,
        row.amount,
        row.fieldNumber,
        row.establishmentName,
        row.organizationName,
        row.playerEmail,
      ]),
    ),
  };
}

/**
 * Propósito: CSV de uso y facturable por tenant en un mes.
 */
async function buildTenantsCsv(searchParams: URLSearchParams) {
  const period = searchParams.get("period");
  if (!isBillingPeriod(period)) {
    /**
     * Output:
     * @throws AppError — Periodo inválido
     */
    throw new AppError("VALIDATION", "Parámetro period inválido (YYYY-MM)", 400);
  }
  const { rows } = await getTenantPeriodReport(period);
  /**
   * Output:
   * @returns { fileName, csv } — Reporte mensual por tenant
   */
  return {
    fileName: `tenants_${period}.csv`,
    csv: toCsv(
      [
        "Tenant",
        "Estado",
        "Reservas facturables",
        "Horas",
        "Reservado (COP)",
        "Mensualidad (COP)",
        "Comisión (bps)",
        "Comisión (COP)",
        "Total (COP)",
        "Factura",
      ],
      rows.map((row) => [
        row.name,
        row.status,
        row.reservationCount,
        row.bookedHours,
        row.grossBookings,
        row.monthlyFee,
        row.commissionBps,
        row.commissionAmount,
        row.totalAmount,
        row.invoiceStatus ?? "sin factura",
      ]),
    ),
  };
}

const REPORT_BUILDERS = {
  reservations: buildReservationsCsv,
  tenants: buildTenantsCsv,
} as const;

/**
 * Propósito: Descarga de reportes en CSV para el super admin. No usa `handleRoute` porque
 * la respuesta exitosa no es JSON.
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ report: string }> },
) {
  try {
    await requireSuperAdmin();
    const reportName = (await context.params).report;
    if (!(reportName in REPORT_BUILDERS)) {
      /**
       * Output:
       * @throws AppError — Reporte desconocido
       */
      throw new AppError("NOT_FOUND", "Reporte no encontrado", 404);
    }
    const { fileName, csv } = await REPORT_BUILDERS[reportName as keyof typeof REPORT_BUILDERS](
      new URL(request.url).searchParams,
    );
    /**
     * Output:
     * @returns Response — CSV descargable, sin caché
     */
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const appError = toAppError(error, "No se pudo generar el reporte");
    /**
     * Output:
     * @returns NextResponse — Error JSON sin detalles internos
     */
    return NextResponse.json(serializeAppError(appError), { status: appError.status });
  }
}

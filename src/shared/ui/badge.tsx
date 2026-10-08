import { cn } from "@/shared/lib/cn";
import type { ReservationStatus } from "@/domain/reservation";

const statusStyles: Record<ReservationStatus, string> = {
  pending: "bg-clay/20 text-clay",
  confirmed: "bg-lime/15 text-lime",
  completed: "bg-white/10 text-mist",
  cancelled: "bg-danger/15 text-danger",
};

const statusLabels: Record<ReservationStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Completada",
  cancelled: "Cancelada",
};

/**
 * Propósito: Badge de estado de reserva con copy en español.
 */
export function StatusBadge({ status }: { status: ReservationStatus }) {
  /**
   * Output:
   * @returns JSX.Element — Chip de estado
   */
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
        statusStyles[status],
      )}
    >
      {statusLabels[status]}
    </span>
  );
}

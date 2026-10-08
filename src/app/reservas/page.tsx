import { getMyReservationViews } from "@/application/booking";
import { requireSession } from "@/core/auth/session";
import type { ReservationView } from "@/domain/reservation";
import { ReservationList } from "@/features/booking/reservation-list";
import { Alert } from "@/shared/ui/alert";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mis reservas" };

/**
 * Propósito: Agenda del usuario autenticado. Nunca lista reservas ajenas.
 */
export default async function ReservationsPage() {
  const session = await requireSession();
  let reservations: ReservationView[] = [];
  let error: string | null = null;
  try {
    reservations = await getMyReservationViews(session.id);
  } catch {
    error = "No pudimos cargar tus reservas. Revisa que el API esté activo.";
  }

  /**
   * Output:
   * @returns JSX.Element — Agenda personal
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker="Tu agenda"
        title="Partidos reservados"
        description="Cancela si el equipo no se arma. Las confirmadas siguen en pie."
        action={
          <Link href="/canchas" className="text-sm text-lime hover:underline">
            Nueva reserva
          </Link>
        }
      />
      {error ? <Alert>{error}</Alert> : (
        <ReservationList reservations={reservations} user={session} />
      )}
    </div>
  );
}

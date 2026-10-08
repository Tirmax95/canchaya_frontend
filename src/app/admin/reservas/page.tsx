import { getStaffReservationViews } from "@/application/booking";
import { requireSession } from "@/core/auth/session";
import { ReservationList } from "@/features/booking/reservation-list";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin · Reservas" };

/**
 * Propósito: Inbox de reservas para confirmar o cancelar.
 */
export default async function AdminReservationsPage() {
  const [session, reservations] = await Promise.all([
    requireSession(),
    getStaffReservationViews(),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Reservas"
        title="Reservas de tu sede"
        description="Solo ves reservas de tus canchas. Confirma pendientes y cancela choques."
      />
      <ReservationList
        reservations={reservations}
        user={session}
        showUserId
      />
    </div>
  );
}

import { requireAdminModule } from "@/application/admin-access";
import { getStaffReservationViews } from "@/application/booking";
import { requireSession, toClientUser } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { parseInboxTenantKey } from "@/domain/reservation-inbox";
import { StaffReservationBoard } from "@/features/booking/staff-reservation-board";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de la agenda de reservas del staff.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("admin.reservationsMeta") };
}

/**
 * Propósito: Inbox de reservas agrupado por tenant y día, con filtros de estado y fecha.
 */
export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>;
}) {
  const [{ t }, , session, reservations, { tenant }] = await Promise.all([
    getTranslator(),
    requireAdminModule("reservations"),
    requireSession(),
    getStaffReservationViews(),
    searchParams,
  ]);

  /**
   * Output:
   * @returns JSX.Element — Tablero de reservas de staff
   */
  return (
    <div className="space-y-4">
      <PageHeader kicker={t("admin.reservationsKicker")} title={t("admin.reservationsTitle")} />
      <StaffReservationBoard
        reservations={reservations}
        user={toClientUser(session)}
        initialTenantKey={parseInboxTenantKey(tenant)}
      />
    </div>
  );
}

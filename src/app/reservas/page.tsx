import { getAdminAccess } from "@/application/admin-access";
import { getMyReservationViews } from "@/application/booking";
import { isStaff } from "@/core/auth/roles";
import { requireSession, toClientUser } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import type { ReservationView } from "@/domain/reservation";
import { ReservationList } from "@/features/booking/reservation-list";
import { Alert } from "@/shared/ui/alert";
import { PageHeader } from "@/shared/ui/page-header";
import Link from "next/link";
import type { Metadata } from "next";

/**
 * Propósito: Título de la agenda según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("booking.myTitle") };
}

/**
 * Propósito: Agenda del usuario autenticado. Nunca lista reservas ajenas.
 */
export default async function ReservationsPage() {
  const { t } = await getTranslator();
  const session = await requireSession();
  let reservations: ReservationView[] = [];
  let error: string | null = null;
  try {
    reservations = await getMyReservationViews(session.id);
  } catch {
    error = t("booking.loadError");
  }
  const canModerate = isStaff(session)
    ? await getAdminAccess()
        .then((access) => access.enabledModules.includes("reservations"))
        .catch(() => false)
    : false;

  /**
   * Output:
   * @returns JSX.Element — Agenda personal
   */
  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6">
      <PageHeader
        kicker={t("booking.kicker")}
        title={t("booking.heading")}
        description={t("booking.description")}
        action={
          <Link href="/canchas" className="text-sm text-lime hover:underline">
            {t("booking.newReservation")}
          </Link>
        }
      />
      {error ? <Alert>{error}</Alert> : (
        <ReservationList
          reservations={reservations}
          user={toClientUser(session)}
          canModerate={canModerate}
        />
      )}
    </div>
  );
}

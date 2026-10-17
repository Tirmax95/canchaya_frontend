import { requireSuperAdminAccess } from "@/application/admin-access";
import { getTranslator } from "@/core/i18n/get-locale";
import { getBookingPolicy } from "@/data/platform.repository";
import { BookingPolicyForm } from "@/features/admin/platform/booking-policy-form";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";

/**
 * Propósito: Metadata de reglas de reserva.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("bookingPolicy.meta") };
}

/**
 * Propósito: Super admin ajusta cuánto aparta una reserva pendiente y cada cuánto se libera.
 */
export default async function BookingRulesPage() {
  const [{ t }, , policy] = await Promise.all([
    getTranslator(),
    requireSuperAdminAccess(),
    getBookingPolicy(),
  ]);

  /**
   * Output:
   * @returns JSX.Element — Encabezado + formulario de reglas
   */
  return (
    <div className="space-y-6">
      <PageHeader
        kicker={t("platform.kicker")}
        title={t("bookingPolicy.title")}
        description={t("bookingPolicy.description")}
      />
      <BookingPolicyForm policy={policy} />
    </div>
  );
}

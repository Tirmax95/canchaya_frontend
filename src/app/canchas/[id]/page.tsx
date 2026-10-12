import { getFieldBookingContext } from "@/application/booking";
import { assertViewerCanSeeField } from "@/application/catalog";
import { APP_TIMEZONE } from "@/core/config/env";
import { getSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { listReservationsByField } from "@/data/reservation.repository";
import { buildDaySlots } from "@/domain/booking";
import { ReservationComposer } from "@/features/booking/reservation-composer";
import { formatMoney } from "@/shared/lib/money";
import { toDateInputValue } from "@/shared/lib/datetime";
import { PageHeader } from "@/shared/ui/page-header";
import { SafeImage } from "@/shared/ui/safe-image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * Propósito: Título de reserva según el idioma activo.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("catalog.bookCourtTitle") };
}

/**
 * Propósito: Ficha de cancha + disponibilidad del día en dos llamadas.
 */
export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const fieldId = Number((await params).id);
  if (!Number.isInteger(fieldId) || fieldId <= 0) {
    notFound();
  }

  const session = await getSession();

  try {
    const [{ t, intlLocale }, { field, establishmentName }, reservations] = await Promise.all([
      getTranslator(),
      getFieldBookingContext(fieldId),
      listReservationsByField(fieldId),
      assertViewerCanSeeField(fieldId),
    ]);
    const today = toDateInputValue();
    const slots = buildDaySlots(today, reservations, APP_TIMEZONE);
    const consultLabel = t("common.consult");

    /**
     * Output:
     * @returns JSX.Element — Checkout de reserva
     */
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5">
          <SafeImage
            src={field.imageFields}
            alt={t("catalog.courtName", { number: field.numberField })}
            fallbackLabel={field.numberField}
            className="h-72 w-full rounded-[32px]"
          />
          <PageHeader
            kicker={establishmentName}
            title={t("catalog.courtName", { number: field.numberField })}
            description={field.description || t("catalog.courtReady")}
          />
          <p className="text-lg text-bone">
            {formatMoney(field.basePricePerHour, intlLocale, consultLabel)}
            <span className="text-sm text-mist"> {t("catalog.perHour")}</span>
          </p>
        </div>
        <div className="rounded-[32px] border border-white/8 bg-pitch p-6">
          <h2 className="font-display text-3xl text-bone">{t("catalog.pickSlotTitle")}</h2>
          <p className="mt-2 mb-6 text-sm text-mist">{t("catalog.pickSlotHint")}</p>
          <ReservationComposer
            field={field}
            initialDate={today}
            initialSlots={slots}
            isAuthenticated={Boolean(session)}
          />
        </div>
      </div>
    );
  } catch {
    notFound();
  }
}

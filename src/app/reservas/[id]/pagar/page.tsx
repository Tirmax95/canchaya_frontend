import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import type { TranslateFn } from "@/core/i18n/translate";
import { getReservationPaymentContext, verifyReservationPayment } from "@/data/payment.repository";
import { ReservationCheckout } from "@/features/booking/reservation-checkout";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const WOMPI_TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{4,64}$/;

/**
 * Propósito: Título del checkout de reserva.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("checkout.payReservationTitle") };
}

/**
 * Propósito: Interpreta el retorno de Wompi (`?id=`) y arma el aviso para el jugador.
 */
async function resolveReturnNotice(
  reservationId: number,
  transactionId: string | undefined,
  t: TranslateFn,
) {
  if (!transactionId || !WOMPI_TRANSACTION_ID_PATTERN.test(transactionId)) {
    /**
     * Output:
     * @returns null — No hay retorno de pasarela
     */
    return null;
  }
  try {
    const intent = await verifyReservationPayment(reservationId, transactionId);
    if (intent.status === "approved") {
      /**
       * Output:
       * @returns string — Cobro ok
       */
      return t("checkout.returnApproved");
    }
    if (intent.status === "pending") {
      /**
       * Output:
       * @returns string — Sigue en proceso
       */
      return t("checkout.returnPending");
    }
    /**
     * Output:
     * @returns string — Rechazado u error
     */
    return t("checkout.returnFailed");
  } catch {
    /**
     * Output:
     * @returns string — Falló la verificación
     */
    return t("checkout.returnVerifyFailed");
  }
}

/**
 * Propósito: Checkout de una reserva propia. El id de transacción lo pone Wompi al volver.
 */
export default async function PayReservationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { t } = await getTranslator();
  await requireSession();
  const reservationId = Number((await params).id);
  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    notFound();
  }
  const { id: transactionId } = await searchParams;
  try {
    const notice = await resolveReturnNotice(reservationId, transactionId, t);
    const context = await getReservationPaymentContext(reservationId);

    /**
     * Output:
     * @returns JSX.Element — Checkout
     */
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
        <PageHeader
          kicker={t("checkout.kicker")}
          title={t("checkout.title")}
          description={t("checkout.description")}
        />
        <ReservationCheckout context={context} notice={notice} />
      </div>
    );
  } catch {
    notFound();
  }
}

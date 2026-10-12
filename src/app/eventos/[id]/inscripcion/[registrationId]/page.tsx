import { requireSession } from "@/core/auth/session";
import { getTranslator } from "@/core/i18n/get-locale";
import { getRegistrationCheckout, verifyRegistrationPayment } from "@/data/event.repository";
import { RegistrationCheckout } from "@/features/events/registration-checkout";
import { PageHeader } from "@/shared/ui/page-header";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

const WOMPI_TRANSACTION_ID_PATTERN = /^[A-Za-z0-9-]{4,64}$/;

/**
 * Propósito: Título del pago de inscripción.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  /**
   * Output:
   * @returns Metadata — Título localizado
   */
  return { title: t("events.checkoutTitle") };
}

/**
 * Propósito: Pago de una inscripción propia. Si vuelve de Wompi (`?id=`), verifica primero
 * la transacción para mostrar el estado real.
 */
export default async function RegistrationCheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; registrationId: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const [{ t }] = await Promise.all([getTranslator(), requireSession()]);
  const registrationId = Number((await params).registrationId);
  if (!Number.isInteger(registrationId) || registrationId <= 0) {
    notFound();
  }
  const { id: transactionId } = await searchParams;
  let notice: string | null = null;
  if (transactionId && WOMPI_TRANSACTION_ID_PATTERN.test(transactionId)) {
    try {
      const intent = await verifyRegistrationPayment(registrationId, transactionId);
      notice =
        intent.status === "approved"
          ? t("checkout.returnApproved")
          : intent.status === "pending"
            ? t("checkout.returnPending")
            : t("checkout.returnFailed");
    } catch {
      notice = t("checkout.returnVerifyFailed");
    }
  }
  try {
    const context = await getRegistrationCheckout(registrationId);
    /**
     * Output:
     * @returns JSX.Element — Checkout
     */
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-6">
        <PageHeader kicker={t("events.checkoutKicker")} title={t("events.checkoutTitle")} />
        <RegistrationCheckout context={context} notice={notice} />
      </div>
    );
  } catch {
    notFound();
  }
}

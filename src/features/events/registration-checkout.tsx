"use client";

import { useI18n } from "@/core/i18n/provider";
import type { RegistrationCheckoutContext } from "@/domain/events";
import { isAllowedCheckoutUrl, type PublicPaymentIntent } from "@/domain/payments";
import { MethodChoice } from "@/features/booking/reservation-checkout";
import { PaymentStatusBadge, RegistrationStatusBadge } from "@/features/events/event-badges";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Pago de la inscripción con los medios activos (Wompi redirige; sandbox y llave
 * muestran instrucciones en la app). Mismo flujo que el pago de reservas.
 */
export function RegistrationCheckout({
  context,
  notice,
}: {
  context: RegistrationCheckoutContext;
  notice: string | null;
}) {
  const router = useRouter();
  const { t, intlLocale } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const { registration, event } = context;
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(
    context.intent
      ? (context.methods.find((method) => method.code === context.intent?.methodCode)?.methodId ?? null)
      : (context.methods[0]?.methodId ?? null),
  );
  const [intent, setIntent] = useState<PublicPaymentIntent | null>(context.intent);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const isPaid = intent?.status === "approved" || registration.paymentStatus === "paid";
  const isPayable =
    registration.status === "pending_payment" && registration.paymentStatus === "pending";
  const amount = formatMoney(context.amountPesos, intlLocale, t("common.consult"));

  /**
   * Propósito: Abre el cobro y redirige a la pasarela o muestra instrucciones.
   */
  async function startCheckout() {
    if (!selectedMethodId) {
      setError(t("checkout.chooseMethod"));
      return;
    }
    setIsWorking(true);
    setError(null);
    const response = await fetch(`/api/events/registrations/${registration.registrationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "checkout", method_id: selectedMethodId }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      intent?: PublicPaymentIntent;
      message?: string;
    };
    if (!response.ok || !payload.intent) {
      setError(payload.message ?? t("checkout.payError"));
      setIsWorking(false);
      return;
    }
    setIntent(payload.intent);
    if (
      payload.intent.checkoutMode === "redirect" &&
      payload.intent.checkoutUrl &&
      isAllowedCheckoutUrl(payload.intent.checkoutUrl)
    ) {
      window.location.assign(payload.intent.checkoutUrl);
      return;
    }
    setIsWorking(false);
    /**
     * Output:
     * Side effects — Sale a la pasarela o deja instrucciones
     */
  }

  /**
   * Propósito: Confirma un pago de prueba.
   */
  async function confirmLocally() {
    setIsWorking(true);
    setError(null);
    const response = await fetch(`/api/events/registrations/${registration.registrationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm_local" }),
    });
    const payload = (await response.json().catch(() => ({}))) as {
      intent?: PublicPaymentIntent;
      message?: string;
    };
    setIsWorking(false);
    if (!response.ok || !payload.intent) {
      setError(payload.message ?? t("checkout.confirmPaymentError"));
      return;
    }
    setIntent(payload.intent);
    router.refresh();
    /**
     * Output:
     * Side effects — Inscripción pagada
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Checkout de inscripción
   */
  return (
    <div className="space-y-6">
      {confirmationDialog}
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}

      <article className="rounded-[28px] border border-white/8 bg-pitch p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-lime">{event.name}</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-display text-3xl text-bone">
            {t("events.checkoutTeam", { team: registration.teamName })}
          </h2>
          <div className="flex flex-wrap gap-2">
            <RegistrationStatusBadge status={registration.status} />
            <PaymentStatusBadge status={isPaid ? "paid" : registration.paymentStatus} />
          </div>
        </div>
        <p className="mt-4 font-display text-4xl text-lime">{amount}</p>
      </article>

      {isPaid ? <Alert tone="info">{t("events.checkoutPaid")}</Alert> : null}

      {!isPaid && !isPayable ? <Alert tone="info">{t("events.checkoutNotPayable")}</Alert> : null}

      {isPayable && !isPaid ? (
        <>
          {context.methods.length === 0 ? (
            <Alert tone="info">{t("events.payAtVenue")}</Alert>
          ) : (
            <fieldset className="space-y-3">
              <legend className="font-display text-2xl text-bone">{t("checkout.howToPay")}</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {context.methods.map((method) => (
                  <MethodChoice
                    key={method.methodId}
                    method={method}
                    isSelected={selectedMethodId === method.methodId}
                    onSelect={() => setSelectedMethodId(method.methodId)}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {intent?.instructions ? (
            <div className="rounded-[24px] border border-lime/25 bg-lime/8 p-5">
              <h3 className="font-display text-xl text-bone">{intent.instructions.title}</h3>
              {intent.instructions.destinationValue ? (
                <p className="mt-3 font-mono text-lg text-lime">
                  {intent.instructions.destinationLabel}: {intent.instructions.destinationValue}
                </p>
              ) : null}
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-mist">
                {intent.instructions.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-3 font-mono text-xs text-mist">
                {t("checkout.reference", { reference: intent.reference })}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            {context.methods.length > 0 ? (
              <Button
                className="flex-1"
                isLoading={isWorking}
                onClick={() =>
                  askConfirmation({
                    title: t("checkout.confirmPayTitle"),
                    description: t("checkout.amountOnly", { amount }),
                    confirmLabel: t("checkout.confirmPayYes"),
                    tone: "primary",
                    run: startCheckout,
                  })
                }
              >
                {intent?.checkoutMode === "in_app" ? t("checkout.generateReference") : t("checkout.payNow")}
              </Button>
            ) : null}
            {intent?.canConfirmLocally ? (
              <Button
                className="flex-1"
                variant="secondary"
                isLoading={isWorking}
                onClick={() =>
                  askConfirmation({
                    title: t("checkout.confirmLocalTitle"),
                    description: t("checkout.confirmLocalDescription", { amount }),
                    confirmLabel: t("checkout.confirmLocalYes"),
                    tone: "primary",
                    run: confirmLocally,
                  })
                }
              >
                {t("checkout.confirmTestPayment")}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <Link href={`/eventos/${event.eventId}`} className="inline-block text-sm text-mist hover:text-bone">
        {t("events.checkoutBack")}
      </Link>
    </div>
  );
}

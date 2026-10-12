"use client";

import { useI18n } from "@/core/i18n/provider";
import {
  isAllowedCheckoutUrl,
  PAYMENT_METHOD_ICON,
  type PublicPaymentIntent,
  type PublicPaymentMethod,
  type ReservationPaymentContext,
} from "@/domain/payments";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import type { ReservationStatus } from "@/domain/reservation";
import { RESERVATION_STATUSES } from "@/domain/reservation";
import { StatusBadge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/cn";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Propósito: Checkout del jugador: elige un medio encendido y paga (redirect o in_app).
 */
export function ReservationCheckout({
  context,
  notice,
}: {
  context: ReservationPaymentContext;
  notice: string | null;
}) {
  const router = useRouter();
  const { t, intlLocale } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [selectedMethodId, setSelectedMethodId] = useState<number | null>(
    context.intent
      ? (context.methods.find((method) => method.code === context.intent?.methodCode)?.methodId ??
          null)
      : context.methods[0]?.methodId ?? null,
  );
  const [intent, setIntent] = useState<PublicPaymentIntent | null>(context.intent);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const isPayable = context.status === "pending";
  const isPaid = intent?.status === "approved" || context.status === "confirmed";
  const formattedAmount = formatMoney(context.amountPesos, intlLocale, t("common.consult"));

  /**
   * Propósito: Crea el intento y redirige a Wompi o deja las instrucciones en pantalla.
   */
  async function startCheckout() {
    if (!selectedMethodId) {
      setError(t("checkout.chooseMethod"));
      return;
    }
    setIsWorking(true);
    setError(null);
    const response = await fetch(`/api/reservations/${context.reservationId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methodId: selectedMethodId }),
    });
    const payload = (await response.json()) as PublicPaymentIntent & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("checkout.payError"));
      setIsWorking(false);
      return;
    }
    setIntent(payload);
    if (payload.checkoutMode === "redirect" && payload.checkoutUrl && isAllowedCheckoutUrl(payload.checkoutUrl)) {
      window.location.assign(payload.checkoutUrl);
      /**
       * Output:
       * Side effects — Sale a Wompi
       */
      return;
    }
    setIsWorking(false);
    /**
     * Output:
     * Side effects — Muestra instrucciones in_app
     */
  }

  /**
   * Propósito: Confirma sandbox o llave en modo prueba.
   */
  async function confirmLocally() {
    setIsWorking(true);
    setError(null);
    const response = await fetch(
      `/api/reservations/${context.reservationId}/payments/confirm-local`,
      { method: "POST" },
    );
    const payload = (await response.json()) as PublicPaymentIntent & { message?: string };
    if (!response.ok) {
      setError(payload.message ?? t("checkout.confirmPaymentError"));
      setIsWorking(false);
      return;
    }
    setIntent(payload);
    setIsWorking(false);
    router.refresh();
    /**
     * Output:
     * Side effects — Reserva cobrada
     */
  }

  /**
   * Propósito: Pide confirmación antes de salir a pagar o generar la referencia.
   */
  function requestCheckout() {
    if (!selectedMethodId) {
      setError(t("checkout.chooseMethod"));
      /**
       * Output:
       * Side effects — Pide un medio de pago sin abrir el modal
       */
      return;
    }

    const selectedMethod = context.methods.find((method) => method.methodId === selectedMethodId);
    const isReference = intent?.checkoutMode === "in_app";
    askConfirmation({
      title: isReference ? t("checkout.confirmReferenceTitle") : t("checkout.confirmPayTitle"),
      description: selectedMethod
        ? t("checkout.amountMethod", {
            amount: formattedAmount,
            method: selectedMethod.displayName,
          })
        : t("checkout.amountOnly", { amount: formattedAmount }),
      confirmLabel: isReference ? t("checkout.confirmReferenceYes") : t("checkout.confirmPayYes"),
      tone: "primary",
      run: startCheckout,
    });
    /**
     * Output:
     * Side effects — Abre el modal; el checkout espera la aceptación
     */
  }

  /**
   * Propósito: Pide confirmación antes de marcar el pago de prueba como recibido.
   */
  function requestLocalConfirmation() {
    askConfirmation({
      title: t("checkout.confirmLocalTitle"),
      description: t("checkout.confirmLocalDescription", { amount: formattedAmount }),
      confirmLabel: t("checkout.confirmLocalYes"),
      tone: "primary",
      run: confirmLocally,
    });
    /**
     * Output:
     * Side effects — Abre el modal; el cobro espera la aceptación
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Checkout
   */
  return (
    <div className="space-y-6">
      {confirmationDialog}
      {notice ? <Alert tone="info">{notice}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}

      <article className="rounded-[28px] border border-white/8 bg-pitch p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-lime">{context.establishmentName}</p>
        <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl text-bone">{context.fieldName}</h2>
            <p className="mt-2 text-sm text-mist">
              {formatDateTime(context.startTime, intlLocale)} →{" "}
              {formatDateTime(context.endTime, intlLocale)}
            </p>
          </div>
          <StatusBadge status={toReservationStatus(isPaid ? "confirmed" : context.status)} />
        </div>
        <p className="mt-4 font-display text-4xl text-lime">{formattedAmount}</p>
      </article>

      {isPaid ? (
        <Alert tone="info">
          {t("checkout.paidReceived")}{" "}
          <Link href="/reservas" className="underline">
            {t("checkout.seeMyBookings")}
          </Link>
        </Alert>
      ) : null}

      {isPayable && !isPaid ? (
        <>
          {context.methods.length === 0 ? (
            <Alert tone="info">{t("checkout.onlinePaymentsOff")}</Alert>
          ) : (
            <fieldset className="space-y-3">
              <legend className="font-display text-2xl text-bone">{t("checkout.howToPay")}</legend>
              <p className="text-sm text-mist">{t("checkout.methodsHint")}</p>
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
              <Button className="flex-1" isLoading={isWorking} onClick={requestCheckout}>
                {intent?.checkoutMode === "in_app"
                  ? t("checkout.generateReference")
                  : t("checkout.payNow")}
              </Button>
            ) : null}
            {intent?.canConfirmLocally ? (
              <Button
                className="flex-1"
                variant="secondary"
                isLoading={isWorking}
                onClick={requestLocalConfirmation}
              >
                {t("checkout.confirmTestPayment")}
              </Button>
            ) : null}
          </div>
        </>
      ) : null}

      <Link href="/reservas" className="inline-block text-sm text-mist hover:text-bone">
        {t("checkout.backToReservations")}
      </Link>
    </div>
  );
}

/**
 * Propósito: Coacciona el status del contexto a un estado de reserva conocido.
 */
function toReservationStatus(status: string): ReservationStatus {
  /**
   * Output:
   * @returns ReservationStatus — pending si llega un valor raro
   */
  return RESERVATION_STATUSES.includes(status as ReservationStatus)
    ? (status as ReservationStatus)
    : "pending";
}

/**
 * Propósito: Tarjeta seleccionable de un medio de pago.
 */
export function MethodChoice({
  method,
  isSelected,
  onSelect,
}: {
  method: PublicPaymentMethod;
  isSelected: boolean;
  onSelect: () => void;
}) {
  /**
   * Output:
   * @returns JSX.Element — Radio visual
   */
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "flex items-start gap-3 rounded-[22px] border px-4 py-4 text-left transition",
        isSelected
          ? "border-lime/60 bg-lime/10 shadow-[0_0_0_1px_rgba(214,242,106,0.35)]"
          : "border-white/10 bg-ink/30 hover:border-white/20",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-lime/15 text-lime">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d={PAYMENT_METHOD_ICON[method.code] ?? PAYMENT_METHOD_ICON.card} />
        </svg>
      </span>
      <span>
        <span className="block font-semibold text-bone">{method.displayName}</span>
        <span className="mt-1 block text-xs leading-5 text-mist">{method.description}</span>
      </span>
    </button>
  );
}

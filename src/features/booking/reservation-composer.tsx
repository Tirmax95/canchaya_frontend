"use client";

import { useI18n } from "@/core/i18n/provider";
import { estimateReservationPrice } from "@/domain/booking";
import type { TimeSlot } from "@/domain/booking";
import type { Field } from "@/domain/field";
import { SlotPicker } from "@/features/booking/slot-picker";
import { formatDateTime } from "@/shared/lib/datetime";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { useConfirmAction } from "@/shared/ui/confirm-dialog";
import { TextAreaField } from "@/shared/ui/input";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

/**
 * Propósito: Orquesta fecha, slot y creación de reserva contra el BFF.
 */
export function ReservationComposer({
  field,
  initialDate,
  initialSlots,
  isAuthenticated,
}: {
  field: Field;
  initialDate: string;
  initialSlots: TimeSlot[];
  isAuthenticated: boolean;
}) {
  const router = useRouter();
  const { t, intlLocale } = useI18n();
  const { askConfirmation, confirmationDialog } = useConfirmAction();
  const [date, setDate] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [durationHours, setDurationHours] = useState(1);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedEnd = useMemo(() => {
    if (!selectedStart) {
      /**
       * Output:
       * @returns null — Todavía no hay franja
       */
      return null;
    }

    /**
     * Output:
     * @returns string — Fin ISO de la reserva
     */
    return new Date(
      new Date(selectedStart).getTime() + durationHours * 3_600_000,
    ).toISOString();
  }, [selectedStart, durationHours]);

  const price = selectedStart && selectedEnd
    ? estimateReservationPrice(
        selectedStart,
        selectedEnd,
        field.basePricePerHour,
      )
    : field.basePricePerHour;

  /**
   * Propósito: Recarga slots del día sin N+1: un GET al BFF de esa cancha.
   */
  async function handleDateChange(nextDate: string) {
    setDate(nextDate);
    setSelectedStart(null);
    setIsLoadingSlots(true);
    setError(null);
    const response = await fetch(
      `/api/fields/${field.id}/availability?date=${nextDate}`,
    );
    const payload = (await response.json()) as {
      slots?: TimeSlot[];
      message?: string;
    };
    if (!response.ok) {
      setError(payload.message ?? t("booking.slotsLoadError"));
    } else {
      setSlots(payload.slots ?? []);
    }
    setIsLoadingSlots(false);
  }

  /**
   * Propósito: Crea la reserva con el userId de la sesión, nunca del form.
   * El precio lo fija el servidor; aquí solo se envían cancha, horario y notas.
   */
  async function createReservation(startTime: string, endTime: string) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldId: field.id,
          startTime,
          endTime,
          notes: notes.trim(),
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        reservation?: { reservationId?: number };
      };

      if (!response.ok) {
        setError(payload.message ?? t("booking.createError"));
        /**
         * Output:
         * Side effects — Muestra el error y deja el formulario listo para reintentar
         */
        return;
      }

      const reservationId = payload.reservation?.reservationId;
      router.push(
        Number.isInteger(reservationId) && (reservationId ?? 0) > 0
          ? `/reservas/${reservationId}/pagar`
          : "/reservas",
      );
      router.refresh();
      /**
       * Output:
       * Side effects — Abre el pago de la reserva recién creada
       */
    } catch {
      setError(t("booking.createError"));
      /**
       * Output:
       * Side effects — Muestra el fallo de red
       */
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * Propósito: Valida el horario y pide confirmación antes de crear la reserva.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?next=/canchas/${field.id}`);
      /**
       * Output:
       * Side effects — Manda al login sin crear la reserva
       */
      return;
    }
    if (!selectedStart || !selectedEnd) {
      setError(t("booking.pickSlotAvailable"));
      /**
       * Output:
       * Side effects — Pide un horario antes de abrir el modal
       */
      return;
    }

    const startTime = selectedStart;
    const endTime = selectedEnd;
    setError(null);
    askConfirmation({
      title: t("booking.confirmTitle"),
      description: t("booking.confirmDescription", {
        number: field.numberField,
        when: formatDateTime(startTime, intlLocale),
        price: formatMoney(price, intlLocale, t("common.consult")),
      }),
      confirmLabel: t("booking.confirmYes"),
      tone: "primary",
      run: () => createReservation(startTime, endTime),
    });
    /**
     * Output:
     * Side effects — Abre el modal; la reserva se crea solo si acepta
     */
  }

  /**
   * Output:
   * @returns JSX.Element — Wizard de reserva
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {confirmationDialog}
      {error ? <Alert>{error}</Alert> : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-mist">{t("booking.matchDay")}</span>
        <input
          type="date"
          value={date}
          min={initialDate}
          onChange={(event) => handleDateChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70"
        />
      </label>
      {isLoadingSlots ? (
        <p className="text-sm text-mist">{t("booking.searchingSlots")}</p>
      ) : (
        <SlotPicker
          slots={slots}
          selectedStart={selectedStart}
          durationHours={durationHours}
          onChange={(start, hours) => {
            setSelectedStart(start);
            setDurationHours(hours);
          }}
        />
      )}
      <TextAreaField
        label={t("booking.notes")}
        name="notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder={t("booking.notesPlaceholder")}
      />
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
        <span className="text-sm text-mist">{t("booking.estimatedTotal")}</span>
        <span className="font-display text-2xl text-lime">
          {formatMoney(price, intlLocale, t("common.consult"))}
        </span>
      </div>
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {isAuthenticated ? t("booking.confirmReservation") : t("booking.loginToBook")}
      </Button>
      <p className="text-center text-[11px] leading-4 text-mist/70">{t("messaging.contactConsent")}</p>
    </form>
  );
}

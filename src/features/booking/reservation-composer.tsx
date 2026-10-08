"use client";

import { estimateReservationPrice } from "@/domain/booking";
import type { TimeSlot } from "@/domain/booking";
import type { Field } from "@/domain/field";
import { SlotPicker } from "@/features/booking/slot-picker";
import { formatMoney } from "@/shared/lib/money";
import { Alert } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
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
      setError(payload.message ?? "No se pudieron cargar los horarios");
    } else {
      setSlots(payload.slots ?? []);
    }
    setIsLoadingSlots(false);
  }

  /**
   * Propósito: Crea la reserva con el userId de la sesión, nunca del form.
   */
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      router.push(`/login?next=/canchas/${field.id}`);
      return;
    }
    if (!selectedStart || !selectedEnd) {
      setError("Elige un horario disponible");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fieldId: field.id,
        startTime: selectedStart,
        endTime: selectedEnd,
        notes,
      }),
    });
    const payload = (await response.json()) as { message?: string };

    if (!response.ok) {
      setError(payload.message ?? "No se pudo crear la reserva");
      setIsSubmitting(false);
      return;
    }

    router.push("/reservas");
    router.refresh();
  }

  /**
   * Output:
   * @returns JSX.Element — Wizard de reserva
   */
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <Alert>{error}</Alert> : null}
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-mist">Día del partido</span>
        <input
          type="date"
          value={date}
          min={initialDate}
          onChange={(event) => handleDateChange(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-bone outline-none focus:border-lime/70"
        />
      </label>
      {isLoadingSlots ? (
        <p className="text-sm text-mist">Buscando huecos libres…</p>
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
        label="Notas para la sede"
        name="notes"
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Traemos balón, somos 10 jugadores…"
      />
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
        <span className="text-sm text-mist">Total estimado</span>
        <span className="font-display text-2xl text-lime">{formatMoney(price)}</span>
      </div>
      <Button type="submit" className="w-full" isLoading={isSubmitting}>
        {isAuthenticated ? "Confirmar reserva" : "Inicia sesión para reservar"}
      </Button>
    </form>
  );
}

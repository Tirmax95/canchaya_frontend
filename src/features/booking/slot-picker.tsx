"use client";

import { useI18n } from "@/core/i18n/provider";
import { MAX_BOOKING_HOURS } from "@/domain/booking";
import type { TimeSlot } from "@/domain/booking";
import { cn } from "@/shared/lib/cn";
import { useMemo, useState } from "react";

/**
 * Propósito: Permite elegir inicio y duración sobre franjas disponibles.
 */
export function SlotPicker({
  slots,
  selectedStart,
  durationHours,
  onChange,
}: {
  slots: TimeSlot[];
  selectedStart: string | null;
  durationHours: number;
  onChange: (startIso: string | null, durationHours: number) => void;
}) {
  const { t } = useI18n();
  const [hours, setHours] = useState(durationHours);

  const selectedIndex = useMemo(
    () => slots.findIndex((slot) => slot.startIso === selectedStart),
    [slots, selectedStart],
  );

  /**
   * Propósito: Comprueba que las N franjas siguientes estén libres.
   */
  function canBookFrom(index: number, nextHours: number): boolean {
    const window = slots.slice(index, index + nextHours);
    /**
     * Output:
     * @returns boolean — True si hay suficientes slots libres consecutivos
     */
    return (
      window.length === nextHours && window.every((slot) => slot.isAvailable)
    );
  }

  /**
   * Output:
   * @returns JSX.Element — Grilla de horarios
   */
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: MAX_BOOKING_HOURS }, (_, index) => index + 1).map(
          (value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setHours(value);
                onChange(selectedStart, value);
              }}
              className={cn(
                "rounded-full px-4 py-2 text-sm",
                hours === value
                  ? "bg-lime text-ink"
                  : "border border-white/10 text-mist hover:text-bone",
              )}
            >
              {value === 1
                ? t("booking.oneHour", { count: value })
                : t("booking.manyHours", { count: value })}
            </button>
          ),
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot, index) => {
          const isSelected = selectedIndex === index;
          const isDisabled = !canBookFrom(index, hours);
          return (
            <button
              key={slot.startIso}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(slot.startIso, hours)}
              className={cn(
                "rounded-2xl border px-3 py-3 text-left text-sm transition",
                isSelected
                  ? "border-lime bg-lime/15 text-lime"
                  : isDisabled
                    ? "cursor-not-allowed border-white/5 text-mist/40"
                    : "border-white/10 text-bone hover:border-lime/40",
              )}
            >
              {slot.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
